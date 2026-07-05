from abc import ABC, abstractmethod
from pathlib import Path
import logging

logger = logging.getLogger(__name__)

# List of typical directory names to skip entirely
IGNORED_DIRS = {
    "node_modules", ".venv", "venv", "env", ".git", ".github", "dist", "build", 
    "target", "bin", "obj", "out", "__pycache__", ".next", ".nuxt", "extracted"
}

# Source code extensions
SOURCE_EXTENSIONS = {
    ".py", ".js", ".jsx", ".ts", ".tsx", ".java", ".go", ".rs", 
    ".cpp", ".c", ".h", ".cs", ".rb", ".php", ".html", ".css", ".vue", ".svelte"
}

class BaseAgent(ABC):
    def __init__(self, name: str):
        self.name = name

    @abstractmethod
    def run(self, code_context: dict) -> dict:
        """
        Executes the analysis logic for the agent.
        Must return a dictionary conforming to the canonical JSON schema.
        """
        pass

    def _get_source_files(self, project_root: Path, max_files: int = 15) -> list[Path]:
        """
        Scans the project directory and returns up to max_files of interest (source code).
        Excludes typical junk/dependency folders like node_modules or .venv.
        Sorts files by size (largest first, or prioritizing entry points) to grab important code.
        """
        source_files = []
        if not project_root.is_dir():
            return source_files

        try:
            for path in project_root.rglob("*"):
                if not path.is_file():
                    continue
                
                # Check if any parent directory is in ignored directories
                parts = path.relative_to(project_root).parts
                if any(part in IGNORED_DIRS for part in parts):
                    continue

                if path.suffix.lower() in SOURCE_EXTENSIONS:
                    source_files.append(path)
        except Exception as e:
            logger.error(f"Error scanning source files in {project_root}: {e}")

        # Prioritize key files: app/main entry points, config files, then sort by size descending
        def priority_key(p: Path):
            name_lower = p.name.lower()
            # Entry points get high priority
            if name_lower in ("app.py", "main.py", "index.js", "server.js", "app.js", "main.ts", "app.tsx", "main.go"):
                return (0, -p.stat().st_size)
            # Regular source files sorted by size
            return (1, -p.stat().st_size)

        source_files.sort(key=priority_key)
        return source_files[:max_files]

    def _read_source_files(self, files: list[Path], project_root: Path, max_chars: int = 35000) -> str:
        """
        Reads the content of files, tags them with relative paths, and combines them
        into a single context block. Limits characters to avoid exceeding token limits.
        """
        combined = []
        current_len = 0

        for f in files:
            try:
                rel_path = f.relative_to(project_root)
                content = f.read_text(encoding="utf-8", errors="ignore")
                
                header = f"\n=== File: {rel_path} ===\n"
                
                # If adding this file exceeds the limit, truncate it or stop
                if current_len + len(header) + len(content) > max_chars:
                    remaining_space = max_chars - current_len - len(header)
                    if remaining_space > 100:
                        combined.append(header + content[:remaining_space] + "\n...[TRUNCATED FOR LENGTH]...")
                    else:
                        combined.append(f"\n...[Truncated: {len(files) - len(combined)} files remaining omitted]...")
                    break
                
                combined.append(header + content)
                current_len += len(header) + len(content)
            except Exception as e:
                logger.warning(f"Failed to read file {f} for context: {e}")

        return "".join(combined)
