import zipfile
import os
import shutil
import logging
from pathlib import Path

logger = logging.getLogger(__name__)

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

class ZipService:
    @staticmethod
    def extract_zip(zip_path: Path, extract_to: Path) -> dict:
        """
        Extracts a ZIP file synchronously.
        Performs path-traversal validation (Zip-Slip protection).
        Unwraps single-folder wrappers if present.
        Strips junk files/folders.
        Computes stats (file/folder counts, languages, primary language, frameworks).
        """
        if not zip_path.exists():
            raise FileNotFoundError(f"ZIP file not found at {zip_path}")
            
        if not zipfile.is_zipfile(str(zip_path)):
            raise ValueError("The file is not a valid ZIP archive.")

        # Clean previous extraction
        if extract_to.exists():
            shutil.rmtree(extract_to)
        extract_to.mkdir(parents=True, exist_ok=True)

        errors = []
        
        with zipfile.ZipFile(str(zip_path), "r") as zf:
            all_names = zf.namelist()
            wrapper = ZipService._detect_single_wrapper(all_names)
            logger.info(f"ZIP contains {len(all_names)} entries. Single-wrapper: {wrapper!r}")

            for member in zf.infolist():
                name = member.filename

                # Strip wrapper prefix
                stripped_name = name
                if wrapper and name.startswith(wrapper):
                    stripped_name = name[len(wrapper):]
                    if stripped_name.startswith("/"):
                        stripped_name = stripped_name[1:]
                    if not stripped_name:
                        continue  # skip the wrapper directory itself

                # Skip junk files
                if ZipService._is_junk(stripped_name):
                    logger.debug(f"Skipping junk entry: {name}")
                    continue

                # Zip-Slip guard
                dest = ZipService._safe_extract_path(stripped_name, extract_to)
                if dest is None:
                    msg = f"Path traversal attempt detected and rejected: {name!r}"
                    logger.error(msg)
                    shutil.rmtree(extract_to, ignore_errors=True)
                    raise PermissionError(msg)

                # Create directory or extract file
                if member.is_dir() or name.endswith("/"):
                    dest.mkdir(parents=True, exist_ok=True)
                    continue

                dest.parent.mkdir(parents=True, exist_ok=True)

                # Handle name collisions
                if dest.exists():
                    stem = dest.stem
                    suffix = dest.suffix
                    counter = 1
                    while dest.exists():
                        dest = dest.parent / f"{stem}_{counter}{suffix}"
                        counter += 1
                    errors.append(f"Filename collision resolved: renamed to {dest.name}")

                # Write contents
                with zf.open(member) as src, open(dest, "wb") as out:
                    out.write(src.read())

        # Perform analysis on extracted contents
        stats = ZipService._analyze_extracted_contents(extract_to)
        stats["errors"] = errors
        return stats

    @staticmethod
    def _is_junk(name: str) -> bool:
        parts = Path(name).parts
        if not parts:
            return True
        if parts[0] in JUNK_PREFIXES:
            return True
        if parts[-1].lower() in JUNK_FILES:
            return True
        return False

    @staticmethod
    def _safe_extract_path(member_name: str, target_dir: Path) -> Path | None:
        target = (target_dir / member_name).resolve()
        try:
            target.relative_to(target_dir.resolve())
        except ValueError:
            return None
        return target

    @staticmethod
    def _detect_single_wrapper(names: list[str]) -> str | None:
        top_level = set()
        for name in names:
            parts = Path(name).parts
            if parts:
                top_level.add(parts[0])
        if len(top_level) == 1:
            wrapper = top_level.pop()
            has_children = any(len(Path(n).parts) > 1 for n in names)
            if has_children:
                return wrapper
        return None

    @staticmethod
    def _analyze_extracted_contents(extract_dir: Path) -> dict:
        file_count = 0
        folder_count = 0
        language_counts = {}
        frameworks = set()

        # Files we want to inspect for framework detection
        package_jsons = []
        requirements_txts = []
        gemfiles = []
        go_mods = []

        for item in extract_dir.rglob("*"):
            if item.is_dir():
                folder_count += 1
            else:
                file_count += 1
                suffix = item.suffix.lower()
                lang = EXTENSION_LANGUAGE_MAP.get(suffix)
                if lang:
                    language_counts[lang] = language_counts.get(lang, 0) + 1

                # Gather manifest files
                name_lower = item.name.lower()
                if name_lower == "package.json":
                    package_jsons.append(item)
                elif "requirement" in name_lower and name_lower.endswith(".txt"):
                    requirements_txts.append(item)
                elif name_lower == "gemfile":
                    gemfiles.append(item)
                elif name_lower == "go.mod":
                    go_mods.append(item)
                elif name_lower == "cargo.toml":
                    frameworks.add("Rust Cargo")
                elif name_lower == "pom.xml" or name_lower == "build.gradle":
                    frameworks.add("Java Build System")

        # Determine primary language
        primary_language = "Unknown"
        if language_counts:
            primary_language = max(language_counts, key=language_counts.get)

        # Detect frameworks from manifests
        for pkg in package_jsons:
            try:
                content = pkg.read_text(encoding="utf-8", errors="ignore").lower()
                if "react" in content:
                    frameworks.add("React")
                if "vue" in content:
                    frameworks.add("Vue")
                if "angular" in content:
                    frameworks.add("Angular")
                if "express" in content:
                    frameworks.add("Express")
                if "next" in content:
                    frameworks.add("Next.js")
                if "svelte" in content:
                    frameworks.add("Svelte")
                if "tailwind" in content:
                    frameworks.add("TailwindCSS")
            except Exception:
                pass

        for req in requirements_txts:
            try:
                content = req.read_text(encoding="utf-8", errors="ignore").lower()
                if "flask" in content:
                    frameworks.add("Flask")
                if "django" in content:
                    frameworks.add("Django")
                if "fastapi" in content:
                    frameworks.add("FastAPI")
                if "sqlalchemy" in content:
                    frameworks.add("SQLAlchemy")
                if "numpy" in content or "pandas" in content:
                    frameworks.add("Data Science Stack")
            except Exception:
                pass

        for go_mod in go_mods:
            try:
                content = go_mod.read_text(encoding="utf-8", errors="ignore").lower()
                if "gin-gonic" in content:
                    frameworks.add("Gin (Go)")
                if "fiber" in content:
                    frameworks.add("Fiber (Go)")
            except Exception:
                pass

        return {
            "file_count": file_count,
            "folder_count": folder_count,
            "languages": list(language_counts.keys()),
            "primary_language": primary_language,
            "detected_frameworks": list(frameworks)
        }
