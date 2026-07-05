from flask import Blueprint, jsonify, request, current_app
import logging
import uuid
import zipfile
from datetime import datetime, timezone
from pathlib import Path
from werkzeug.utils import secure_filename

logger = logging.getLogger(__name__)

upload_bp = Blueprint("upload", __name__, url_prefix="/api")

# Maximum upload size (25 MB)
MAX_UPLOAD_SIZE = 25 * 1024 * 1024

ALLOWED_MIME_TYPES = {
    "application/zip",
    "application/x-zip-compressed",
    "application/x-zip",
    "multipart/x-zip",
    "application/octet-stream"   # Many browsers use this for ZIP
}


def allowed_file(filename):
    return Path(filename).suffix.lower() == ".zip"


@upload_bp.route("/upload", methods=["POST"])
def upload_project():
    logger.info("========== Upload Started ==========")

    if "file" not in request.files:
        return jsonify({
            "success": False,
            "error": "No file found in request."
        }), 400

    file = request.files["file"]

    if file.filename == "":
        return jsonify({
            "success": False,
            "error": "No file selected."
        }), 400

    if not allowed_file(file.filename):
        return jsonify({
            "success": False,
            "error": "Only .zip files are allowed."
        }), 400

    mime = file.content_type

    logger.info(f"MIME Type : {mime}")

    if mime not in ALLOWED_MIME_TYPES:
        return jsonify({
            "success": False,
            "error": f"Invalid MIME type ({mime})"
        }), 400

    try:

        ##################################################
        # Upload Folder
        ##################################################

        upload_folder = Path(current_app.config["UPLOAD_FOLDER"])
        upload_folder.mkdir(parents=True, exist_ok=True)

        project_id = str(uuid.uuid4())

        original_name = secure_filename(file.filename)
        saved_name = f"{project_id}.zip"

        zip_path = upload_folder / saved_name

        ##################################################
        # Save ZIP
        ##################################################

        logger.info("Saving ZIP...")
        file.save(zip_path)

        file_size = zip_path.stat().st_size

        logger.info(f"ZIP Size = {file_size / (1024*1024):.2f} MB")

        ##################################################
        # Reject oversized uploads
        ##################################################

        if file_size > MAX_UPLOAD_SIZE:
            zip_path.unlink(missing_ok=True)

            return jsonify({
                "success": False,
                "error": "ZIP file exceeds the maximum allowed size of 25 MB."
            }), 413

        ##################################################
        # Extract
        ##################################################

        base_dir = Path(current_app.config["BASE_DIR"])

        extract_root = base_dir / "extracted" / project_id

        logger.info("Extracting ZIP...")

        from services.zip_service import ZipService

        stats = ZipService.extract_zip(
            zip_path,
            extract_root
        )

        ##################################################
        # Remove uploaded ZIP to save disk space
        ##################################################

        zip_path.unlink(missing_ok=True)

        logger.info("Extraction Complete")

        return jsonify({
            "success": True,
            "project_id": project_id,
            "filename": original_name,
            "size": file_size,
            "uploadTime": datetime.now(
                timezone.utc
            ).isoformat(),
            "metadata": {
                "filename": original_name,
                "size_bytes": file_size,
                "extracted_files_count": stats["file_count"],
                "primary_language": stats["primary_language"],
                "detected_frameworks": stats["detected_frameworks"]
            }
        })

    except PermissionError as e:

        logger.exception(e)

        try:
            zip_path.unlink(missing_ok=True)
        except:
            pass

        return jsonify({
            "success": False,
            "error": str(e)
        }), 422

    except (zipfile.BadZipFile, ValueError) as e:

        logger.exception(e)

        try:
            zip_path.unlink(missing_ok=True)
        except:
            pass

        return jsonify({
            "success": False,
            "error": "Invalid ZIP archive."
        }), 400

    except MemoryError:

        logger.exception("MemoryError")

        try:
            zip_path.unlink(missing_ok=True)
        except:
            pass

        return jsonify({
            "success": False,
            "error": "Server ran out of memory while processing the ZIP. Please upload a smaller project."
        }), 500

    except Exception as e:

        logger.exception(e)

        try:
            zip_path.unlink(missing_ok=True)
        except:
            pass

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500