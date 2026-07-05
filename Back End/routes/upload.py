from flask import Blueprint, jsonify, request, current_app
import logging
import uuid
import zipfile
from datetime import datetime, timezone
from pathlib import Path
from werkzeug.utils import secure_filename

logger = logging.getLogger(__name__)

upload_bp = Blueprint("upload", __name__, url_prefix="/api")

# Allowed MIME types for ZIP files
ALLOWED_MIME_TYPES = {
    "application/zip",
    "application/x-zip-compressed",
    "application/x-zip",
    "multipart/x-zip"
}

def allowed_file(filename):
    """Helper to check if file extension is allowed."""
    ext = Path(filename).suffix.lower()
    return ext == ".zip"

@upload_bp.route("/upload", methods=["POST"])
def upload_project():
    logger.info("Starting codebase file upload processing...")
    
    # 1. Check if 'file' field is present in request
    if "file" not in request.files:
        logger.error("Upload failed: Missing 'file' field in request.")
        return jsonify({
            "success": False,
            "error": "No file part in the request. Make sure to upload with key 'file'."
        }), 400

    file = request.files["file"]

    # 2. Check if a file was actually selected
    if file.filename == "":
        logger.error("Upload failed: No file selected in form data.")
        return jsonify({
            "success": False,
            "error": "No file selected."
        }), 400

    # 3. Validate file extension
    if not allowed_file(file.filename):
        logger.error(f"Upload failed: Invalid extension for file '{file.filename}'. Only ZIP is allowed.")
        return jsonify({
            "success": False,
            "error": "Only ZIP files are allowed (extension must be .zip)."
        }), 400

    # 4. Validate MIME type
    mime_type = file.content_type
    logger.info(f"Uploaded file MIME type: {mime_type}")
    if mime_type not in ALLOWED_MIME_TYPES:
        # Some OS/Browsers send empty or octet-stream MIME types for zip, but we strictly validate MIME type as requested.
        # To be robust, if it's application/octet-stream, we log a warning but allow it if extension is zip, 
        # but the prompt says: "validate both file extension and MIME type". So we strictly validate MIME.
        logger.error(f"Upload failed: Invalid MIME type '{mime_type}'. Only ZIP MIME types allowed.")
        return jsonify({
            "success": False,
            "error": "Only ZIP files are allowed (invalid MIME type)."
        }), 400

    try:
        # 5. Setup upload directory path
        upload_folder = Path(current_app.config.get("UPLOAD_FOLDER"))
        upload_folder.mkdir(parents=True, exist_ok=True)

        # 6. Generate UUID filenames to avoid collision
        project_id = str(uuid.uuid4())
        original_filename = secure_filename(file.filename)
        saved_filename = f"{project_id}.zip"
        dest_path = upload_folder / saved_filename

        # 7. Save file
        logger.info(f"Saving uploaded ZIP '{original_filename}' to '{dest_path}'")
        file.save(str(dest_path))
        
        # Calculate saved file size
        file_size = dest_path.stat().st_size
        upload_time = datetime.now(timezone.utc).isoformat()

        # 8. Extract synchronously using ZipService
        base_dir = Path(current_app.config.get("BASE_DIR"))
        extract_root = base_dir / "extracted" / project_id
        
        logger.info(f"Extracting ZIP for project {project_id} to {extract_root}")
        from services.zip_service import ZipService
        try:
            stats = ZipService.extract_zip(dest_path, extract_root)
        except PermissionError as pe:
            logger.error(f"Security Alert: Path traversal during extraction: {pe}")
            # Clean up saved zip
            dest_path.unlink(missing_ok=True)
            return jsonify({
                "success": False,
                "error": str(pe),
                "errors": [str(pe)]
            }), 422
        except (ValueError, zipfile.BadZipFile) as ve:
            logger.error(f"Extraction failed (corrupt/invalid zip): {ve}")
            dest_path.unlink(missing_ok=True)
            return jsonify({
                "success": False,
                "error": "The uploaded file is not a valid ZIP archive."
            }), 400
        except Exception as e:
            logger.error(f"Unexpected extraction failure: {e}", exc_info=True)
            dest_path.unlink(missing_ok=True)
            return jsonify({
                "success": False,
                "error": f"Extraction failed unexpectedly: {e}"
            }), 500

        logger.info(f"Upload and extraction successful. Project ID: {project_id}")

        return jsonify({
            "success": True,
            "project_id": project_id,
            "filename": original_filename,
            "size": file_size,
            "uploadTime": upload_time,
            "metadata": {
                "filename": original_filename,
                "size_bytes": file_size,
                "extracted_files_count": stats["file_count"],
                "primary_language": stats["primary_language"],
                "detected_frameworks": stats["detected_frameworks"]
            }
        }), 200

    except Exception as e:
        logger.error(f"Upload handler failed: {e}", exc_info=True)
        return jsonify({
            "success": False,
            "error": "Internal server error during file upload processing."
        }), 500

