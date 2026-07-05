"""
Bug Finder Agent
================
Scans source files for bugs, logic issues, dead code, missing imports,
unused variables, and code smells.

File selection:
  - Extensions: .py .js .jsx .ts .tsx .java  (SOURCE_EXTENSIONS subset)
  - Skip dirs:  node_modules, venv, .venv, env, .git, dist, build, __pycache__,
                .next, .nuxt, target, bin, obj, out (matches BaseAgent.IGNORED_DIRS)
  - Cap: MAX_FILES (15) largest files — documented here intentionally.
         Rationale: Gemini context window and cost. Above 15 files the prompt
         regularly exceeds 30 k chars and triggers 429s on the free tier.
  - Per-file char limit: 35 000 total across all files (BaseAgent._read_source_files cap)

Zero-file case:
  Returns score=100, no Gemini call, with a highlight explaining the project
  has no analysable source files (e.g. docs-only repo).

Returns canonical schema:
  {"agent": "bug", "score": 0-100,
   "data": {"highlights": [...], "findings": [...], "recommendations": [...]},
   "errors": []}
  All list items are plain strings — no nested objects.
"""

import logging
from pathlib import Path

from agents.base_agent import BaseAgent
from agents.registry import register_agent
from services.gemini_service import call_gemini, parse_json_response, validate_response

logger = logging.getLogger(__name__)

# Maximum source files sent to Gemini (see module docstring for rationale)
MAX_FILES = 15

REQUIRED_KEYS = ["score", "highlights", "findings", "recommendations"]

# Only scan these extensions — the broader SOURCE_EXTENSIONS set in BaseAgent
# includes .html/.css which are not useful for bug detection.
BUG_EXTENSIONS = {".py", ".js", ".jsx", ".ts", ".tsx", ".java"}

PROMPT_TEMPLATE = """
You are a senior principal engineer performing a rigorous static analysis code review.

Analyse the following source files for:
  1. Unused variables and dead code
  2. Missing or incorrect imports
  3. Logic errors and off-by-one bugs
  4. Unhandled exceptions and missing error checks
  5. Code smells: overly complex functions, duplicated logic, magic numbers

Project source files (up to {file_count} files, capped at {char_cap} chars total):
---
{code_block}
---

Return ONLY a valid JSON object with this exact structure — no prose, no markdown:
{{
  "score": <integer 0–100; 100 = no bugs, 0 = critical failures throughout>,
  "highlights": [
    "<string: positive observation about code quality or clean patterns>"
  ],
  "findings": [
    "<string: description of a bug or issue, include filename and line if known>"
  ],
  "recommendations": [
    "<string: concrete fix or best-practice suggestion>"
  ]
}}

All list items must be plain strings. Do not use nested objects inside any list.
"""


@register_agent("bug")
class BugAgent(BaseAgent):
    """
    Detects bugs and code quality issues in source files using Gemini.
    Follows the same pattern as DocumentationAgent:
      - Reads files once via BaseAgent helpers
      - Calls Gemini once
      - Returns flat canonical schema
    """

    def __init__(self):
        super().__init__("Bug Agent")

    def _get_bug_files(self, project_root: Path) -> list[Path]:
        """
        Returns up to MAX_FILES source files filtered to BUG_EXTENSIONS,
        prioritising entry-point files then largest by size.
        Skips directories in BaseAgent.IGNORED_DIRS.
        """
        from agents.base_agent import IGNORED_DIRS

        files = []
        try:
            for path in project_root.rglob("*"):
                if not path.is_file():
                    continue
                parts = path.relative_to(project_root).parts
                if any(part in IGNORED_DIRS for part in parts):
                    continue
                if path.suffix.lower() in BUG_EXTENSIONS:
                    files.append(path)
        except Exception as e:
            logger.error(f"BugAgent: Error scanning source files: {e}")

        def _priority(p: Path):
            name = p.name.lower()
            if name in ("app.py", "main.py", "index.js", "server.js",
                        "app.js", "main.ts", "app.tsx", "main.go"):
                return (0, -p.stat().st_size)
            return (1, -p.stat().st_size)

        files.sort(key=_priority)
        return files[:MAX_FILES]

    def run(self, code_context: dict) -> dict:
        project_root_raw = code_context.get("project_root")
        if not project_root_raw:
            return {
                "agent": "bug",
                "score": 0,
                "data": {"highlights": [], "findings": [], "recommendations": []},
                "errors": ["Missing 'project_root' in code_context."],
            }

        project_root = Path(project_root_raw)
        if not project_root.is_dir():
            return {
                "agent": "bug",
                "score": 0,
                "data": {"highlights": [], "findings": [], "recommendations": []},
                "errors": [f"project_root is not a valid directory: {project_root}"],
            }

        # ── File selection ────────────────────────────────────────────────────
        source_files = self._get_bug_files(project_root)

        if not source_files:
            logger.info(
                "BugAgent: No analysable source files found "
                f"(extensions: {BUG_EXTENSIONS}). Skipping Gemini call."
            )
            return {
                "agent": "bug",
                "score": 100,
                "data": {
                    "highlights": [
                        "No source files with analysable extensions "
                        f"({', '.join(sorted(BUG_EXTENSIONS))}) were found. "
                        "This may be a documentation-only or asset-only project."
                    ],
                    "findings": [],
                    "recommendations": [
                        "Add source code files to enable automated bug detection."
                    ],
                },
                "errors": [],
            }

        logger.info(
            f"BugAgent: Analysing {len(source_files)} file(s) "
            f"(cap={MAX_FILES}) in {project_root.name}."
        )

        # ── Build code block (capped by BaseAgent at 35 000 chars) ───────────
        code_block = self._read_source_files(source_files, project_root, max_chars=35_000)

        prompt = PROMPT_TEMPLATE.format(
            file_count=len(source_files),
            char_cap="35 000",
            code_block=code_block,
        )
        schema_hint = (
            "JSON object with keys 'score' (int 0-100), "
            "'highlights' (list of strings), "
            "'findings' (list of strings), "
            "'recommendations' (list of strings). "
            "All list items must be plain strings."
        )

        # ── Gemini call ───────────────────────────────────────────────────────
        try:
            logger.info("BugAgent: Calling Gemini API.")
            raw_response = call_gemini(prompt, response_schema_hint=schema_hint)
            parsed = parse_json_response(raw_response)

            if not validate_response(parsed, REQUIRED_KEYS):
                logger.error(
                    f"BugAgent: Response missing required keys. "
                    f"Keys found: {list(parsed.keys())}"
                )
                return {
                    "agent": "bug",
                    "score": 0,
                    "data": {"highlights": [], "findings": [], "recommendations": []},
                    "errors": ["Gemini response did not conform to the required schema."],
                }

            # Normalise: flatten any nested dicts to strings
            def _flatten(items: list) -> list:
                flat = []
                for item in (items or []):
                    if isinstance(item, dict):
                        flat.append(
                            item.get("description")
                            or item.get("action")
                            or item.get("message")
                            or str(item)
                        )
                    else:
                        flat.append(str(item))
                return flat

            return {
                "agent": "bug",
                "score": int(parsed["score"]),
                "data": {
                    "highlights":      _flatten(parsed.get("highlights", [])),
                    "findings":        _flatten(parsed.get("findings", [])),
                    "recommendations": _flatten(parsed.get("recommendations", [])),
                },
                "errors": [],
            }

        except Exception as e:
            logger.error(f"BugAgent failed: {e}", exc_info=True)
            return {
                "agent": "bug",
                "score": 0,
                "data": {"highlights": [], "findings": [], "recommendations": []},
                "errors": [f"Bug analysis failed: {e}"],
            }
