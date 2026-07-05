from flask import Blueprint, jsonify, current_app
from pathlib import Path
import zipfile
import shutil
import logging

logger = logging.getLogger(__name__)

extract_bp = Blueprint("extract", __name__, url_prefix="/api")

# Files and directories to ignore during extraction
JUNK_PREFIXES = ("__MACOSX",)
JUNK_FILES = {".ds_store", "thumbs.db", "desktop.ini", ".gitkeep"}

# Language detection by extension
EXTENSION_LANGUAGE_MAP = {
    ".py": "Python",
    ".js": "JavaScript",
    ".jsx": "JavaScript (React)",
    ".ts": "TypeScript",
    ".tsx": "TypeScript (React)",
    ".java": "Java",
    ".go": "Go",
    ".rs": "Rust",
    ".cpp": "C++",
    ".cc": "C++",
    ".cxx": "C++",
    ".c": "C",
    ".h": "C/C++ Header",
    ".cs": "C#",
    ".rb": "Ruby",
    ".php": "PHP",
    ".swift": "Swift",
    ".kt": "Kotlin",
    ".scala": "Scala",
    ".r": "R",
    ".sh": "Shell",
    ".bash": "Shell",
    ".html": "HTML",
    ".css": "CSS",
    ".scss": "SCSS",
    ".sql": "SQL",
    ".json": "JSON",
    ".yaml": "YAML",
    ".yml": "YAML",
    ".xml": "XML",
    ".dart": "Dart",
    ".vue": "Vue",
    ".svelte": "Svelte",
}


def _is_junk(name: str) -> bool:
    """Return True if the path entry should be skipped."""
    parts = Path(name).parts
    if not parts:
        return True
    # Skip __MACOSX and similar OS-generated folders
    if parts[0] in JUNK_PREFIXES:
        return True
    # Skip junk filenames (case-insensitive)
    if parts[-1].lower() in JUNK_FILES:
        return True
    return False


def _safe_extract_path(member_name: str, target_dir: Path) -> Path | None:
    """
    Resolve the target path for a zip member and verify it does not escape
    the target directory (zip-slip guard).
    Returns None if the path would escape, otherwise returns the resolved Path.
    """
    # Normalise and resolve to absolute
    target = (target_dir / member_name).resolve()
    try:
        target.relative_to(target_dir.resolve())
    except ValueError:
        return None  # Path traversal detected
    return target


def _detect_single_wrapper(names: list[str]) -> str | None:
    """
    If all members share a single top-level directory, return that directory
    name so it can be stripped during extraction (unwrap).
    """
    top_level = set()
    for name in names:
        parts = Path(name).parts
        if parts:
            top_level.add(parts[0])
    if len(top_level) == 1:
        # Check it's actually a directory (has children beneath it)
        wrapper = top_level.pop()
        has_children = any(
            len(Path(n).parts) > 1 for n in names
        )
        if has_children:
            return wrapper
    return None


def _compute_stats(extract_dir: Path) -> tuple[int, int, list[str]]:
    """Walk the extracted directory and return (file_count, folder_count, languages)."""
    file_count = 0
    folder_count = 0
    languages_seen: set[str] = set()

    for item in extract_dir.rglob("*"):
        if item.is_dir():
            folder_count += 1
        else:
            file_count += 1
            lang = EXTENSION_LANGUAGE_MAP.get(item.suffix.lower())
            if lang:
                languages_seen.add(lang)

    return file_count, folder_count, sorted(languages_seen)


@extract_bp.route("/extract/<project_id>", methods=["POST"])
def extract_project(project_id: str):
    upload_folder = Path(current_app.config["UPLOAD_FOLDER"])
    base_dir = Path(current_app.config.get("BASE_DIR", upload_folder.parent))

    zip_path = upload_folder / f"{project_id}.zip"
    extract_root = base_dir / "extracted" / project_id

    logger.info(f"Extraction requested for project: {project_id}")

    # 1. Verify the zip exists
    if not zip_path.exists():
        logger.error(f"Zip not found for project_id={project_id}: {zip_path}")
        return jsonify({
            "success": False,
            "error": f"No uploaded ZIP found for project_id '{project_id}'."
        }), 404

    # 2. Validate it is a real zip
    if not zipfile.is_zipfile(str(zip_path)):
        logger.error(f"Corrupt or invalid zip file: {zip_path}")
        return jsonify({
            "success": False,
            "error": "The uploaded file is not a valid ZIP archive."
        }), 400

    # 3. Clean any previous (partial) extraction
    if extract_root.exists():
        shutil.rmtree(extract_root)
    extract_root.mkdir(parents=True, exist_ok=True)

    errors: list[str] = []

    try:
        with zipfile.ZipFile(str(zip_path), "r") as zf:
            all_names = zf.namelist()
            wrapper = _detect_single_wrapper(all_names)
            logger.info(
                f"ZIP has {len(all_names)} entries. "
                f"Single-wrapper detected: {wrapper!r}"
            )

            for member in zf.infolist():
                name = member.filename

                # Strip single top-level wrapper folder first
                stripped_name = name
                if wrapper and name.startswith(wrapper):
                    stripped_name = name[len(wrapper):]
                    if stripped_name.startswith("/"):
                        stripped_name = stripped_name[1:]
                    if not stripped_name:
                        continue  # this was the wrapper dir itself

                # Skip junk (evaluated on the stripped path)
                if _is_junk(stripped_name):
                    logger.debug(f"Skipping junk entry: {name}")
                    continue

                # Zip-slip guard
                dest = _safe_extract_path(stripped_name, extract_root)
                if dest is None:
                    msg = f"Path traversal attempt detected and rejected: {name!r}"
                    logger.error(msg)
                    # Clean up and abort
                    shutil.rmtree(extract_root, ignore_errors=True)
                    return jsonify({
                        "success": False,
                        "error": msg,
                        "errors": [msg]
                    }), 400

                # Create directories
                if member.is_dir() or name.endswith("/"):
                    dest.mkdir(parents=True, exist_ok=True)
                    continue

                # Create parent dirs if needed
                dest.parent.mkdir(parents=True, exist_ok=True)

                # Handle duplicate filenames safely by appending a counter
                if dest.exists():
                    stem = dest.stem
                    suffix = dest.suffix
                    counter = 1
                    while dest.exists():
                        dest = dest.parent / f"{stem}_{counter}{suffix}"
                        counter += 1
                    errors.append(f"Filename collision resolved: renamed to {dest.name}")

                # Write file
                with zf.open(member) as src, open(dest, "wb") as out:
                    out.write(src.read())

    except zipfile.BadZipFile as e:
        shutil.rmtree(extract_root, ignore_errors=True)
        logger.error(f"BadZipFile during extraction: {e}")
        return jsonify({
            "success": False,
            "error": f"ZIP is corrupt or unreadable: {e}"
        }), 400
    except Exception as e:
        shutil.rmtree(extract_root, ignore_errors=True)
        logger.error(f"Unexpected extraction error: {e}", exc_info=True)
        return jsonify({
            "success": False,
            "error": f"Extraction failed unexpectedly: {e}"
        }), 500

    # 4. Compute stats
    file_count, folder_count, languages = _compute_stats(extract_root)
    extracted_path = str(extract_root.relative_to(base_dir))

    logger.info(
        f"Extraction complete for {project_id}: "
        f"{file_count} files, {folder_count} folders, languages={languages}"
    )

    return jsonify({
        "success": True,
        "extractedPath": extracted_path,
        "totalFiles": file_count,
        "folderCount": folder_count,
        "languagesDetected": languages,
        "errors": errors
    }), 200
