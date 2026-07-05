"""
Security Agent
==============
Audits source code for security vulnerabilities following OWASP Top 10.

Checks for:
  - Hardcoded secrets / passwords / API keys (real ones — NOT .env.example placeholders)
  - JWT misuse (weak secrets, missing expiry, alg=none)
  - Authentication weaknesses (no password hashing, default credentials)
  - SQL injection risk (string-interpolated queries)
  - XSS risk (unescaped output in templates/JSX)
  - Missing input validation
  - CORS misconfiguration (wildcard origins in production)

File selection: same cap/filter as BugAgent (MAX_FILES=15, 35 000 char limit).
Extensions scanned: .py .js .jsx .ts .tsx .java

.env.example exclusion:
  Files named exactly '.env.example', '.env.sample', '.env.template', or
  'env.example' are SKIPPED entirely — they contain placeholder values by
  design and are never secrets.

Zero-file case: returns score=100, no Gemini call.
All list items in output are plain strings (no nested objects).
"""

import logging
from pathlib import Path

from agents.base_agent import BaseAgent, IGNORED_DIRS
from agents.registry import register_agent
from services.gemini_service import call_gemini, parse_json_response, validate_response

logger = logging.getLogger(__name__)

MAX_FILES = 15

REQUIRED_KEYS = ["score", "highlights", "findings", "recommendations"]

# Extensions to scan for security issues
SECURITY_EXTENSIONS = {".py", ".js", ".jsx", ".ts", ".tsx", ".java"}

# Files to always skip — they contain placeholder values, not real secrets
ENV_EXAMPLE_NAMES = {".env.example", ".env.sample", ".env.template", "env.example", ".env.test"}

PROMPT_TEMPLATE = """
You are a senior security researcher and DevSecOps auditor performing an OWASP Top 10 audit.

IMPORTANT CONTEXT:
- Any file named .env.example, .env.sample, .env.template, or env.example has already been
  excluded from this analysis. Do NOT flag placeholder template values as real secrets.
- Only flag actual hardcoded values that look like live credentials (real API keys, real
  passwords, real private keys — not strings like "change-me-...", "your-secret-here",
  "example", "placeholder", "XXXX", or similar dummy values).

Check for the following in the source files below:
  1. Hardcoded secrets: API keys, passwords, private keys, database connection strings
  2. JWT misuse: weak/hardcoded secrets, missing expiry (exp), algorithm=none vulnerability
  3. Authentication weaknesses: plaintext passwords, missing hashing, default credentials
  4. SQL injection: string-formatted or f-string queries passed directly to execute()
  5. XSS risk: dangerouslySetInnerHTML without sanitisation, unescaped user input in templates
  6. Missing input validation: user-supplied data used directly without validation/sanitisation
  7. CORS misconfiguration: wildcard origins (*) in production Flask/Express/Django settings

Source files ({file_count} files, capped at {char_cap} chars total):
---
{code_block}
---

Return ONLY a valid JSON object — no prose, no markdown:
{{
  "score": <integer 0–100; 100 = no security issues, 0 = critical exposures throughout>,
  "highlights": [
    "<string: positive security practice observed>"
  ],
  "findings": [
    "<string: clear description of the vulnerability, include filename and approximate line if known>"
  ],
  "recommendations": [
    "<string: concrete mitigation step or secure coding fix>"
  ]
}}

All list items must be plain strings. Do not use nested objects inside any list.
"""


@register_agent("security")
class SecurityAgent(BaseAgent):
    """
    Audits source files for security vulnerabilities.
    Follows the same pattern as BugAgent / DocumentationAgent.
    Explicitly excludes .env.example-style files to prevent false positives.
    """

    def __init__(self):
        super().__init__("Security Agent")

    def _get_security_files(self, project_root: Path) -> list[Path]:
        """
        Returns up to MAX_FILES source files suitable for security analysis.
        Skips IGNORED_DIRS and ENV_EXAMPLE_NAMES explicitly.
        """
        files = []
        try:
            for path in project_root.rglob("*"):
                if not path.is_file():
                    continue
                # Skip ignored directories
                parts = path.relative_to(project_root).parts
                if any(part in IGNORED_DIRS for part in parts):
                    continue
                # Skip .env.example-style files
                if path.name.lower() in ENV_EXAMPLE_NAMES:
                    logger.info(
                        f"SecurityAgent: Skipping env-example file (not a real secret): {path.name}"
                    )
                    continue
                if path.suffix.lower() in SECURITY_EXTENSIONS:
                    files.append(path)
        except Exception as e:
            logger.error(f"SecurityAgent: Error scanning files: {e}")

        def _priority(p: Path):
            name = p.name.lower()
            if name in ("app.py", "main.py", "server.py", "index.js", "server.js", "app.js"):
                return (0, -p.stat().st_size)
            return (1, -p.stat().st_size)

        files.sort(key=_priority)
        return files[:MAX_FILES]

    def run(self, code_context: dict) -> dict:
        project_root_raw = code_context.get("project_root")
        if not project_root_raw:
            return {
                "agent": "security",
                "score": 0,
                "data": {"highlights": [], "findings": [], "recommendations": []},
                "errors": ["Missing 'project_root' in code_context."],
            }

        project_root = Path(project_root_raw)
        if not project_root.is_dir():
            return {
                "agent": "security",
                "score": 0,
                "data": {"highlights": [], "findings": [], "recommendations": []},
                "errors": [f"project_root is not a valid directory: {project_root}"],
            }

        source_files = self._get_security_files(project_root)

        if not source_files:
            logger.info("SecurityAgent: No analysable source files found. Skipping Gemini call.")
            return {
                "agent": "security",
                "score": 100,
                "data": {
                    "highlights": ["No source files with analysable extensions found."],
                    "findings": [],
                    "recommendations": ["Add source code files to enable security scanning."],
                },
                "errors": [],
            }

        logger.info(
            f"SecurityAgent: Scanning {len(source_files)} file(s) (cap={MAX_FILES}) "
            f"in '{project_root.name}'. Env-example files excluded."
        )

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

        try:
            logger.info("SecurityAgent: Calling Gemini API.")
            raw_response = call_gemini(prompt, response_schema_hint=schema_hint)
            parsed = parse_json_response(raw_response)

            if not validate_response(parsed, REQUIRED_KEYS):
                logger.error(f"SecurityAgent: Missing required keys. Found: {list(parsed.keys())}")
                return {
                    "agent": "security",
                    "score": 0,
                    "data": {"highlights": [], "findings": [], "recommendations": []},
                    "errors": ["Gemini response did not conform to the required schema."],
                }

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
                "agent": "security",
                "score": int(parsed["score"]),
                "data": {
                    "highlights":      _flatten(parsed.get("highlights", [])),
                    "findings":        _flatten(parsed.get("findings", [])),
                    "recommendations": _flatten(parsed.get("recommendations", [])),
                },
                "errors": [],
            }

        except Exception as e:
            logger.error(f"SecurityAgent failed: {e}", exc_info=True)
            return {
                "agent": "security",
                "score": 0,
                "data": {"highlights": [], "findings": [], "recommendations": []},
                "errors": [f"Security analysis failed: {e}"],
            }
