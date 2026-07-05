import logging
import json
from pathlib import Path
from agents.base_agent import BaseAgent
from agents.registry import register_agent
from services.gemini_service import call_gemini, parse_json_response, validate_response

logger = logging.getLogger(__name__)
REQUIRED_KEYS = ["score", "highlights", "findings", "recommendations"]

PROMPT_TEMPLATE = """
You are a senior UI/UX engineer, styling architect, and accessibility specialist.
Your goal is to evaluate the presentation layer of the codebase: HTML, CSS, JSX/TSX layout files, Vue/Svelte layouts, responsive design patterns, and accessibility tags.

Folder structure insights from offline scan:
{folder_insights}

Front-end layout and styling file contents:
{code_context}

Evaluate the presentation layer and return a JSON object. Ensure the output strictly conforms to the JSON schema specified below.
Your response MUST be valid JSON only. Do not wrap the JSON in conversational text or notes.

Required JSON Structure:
{{
  "score": <integer from 0 to 100 representing UX/UI layer quality (100 means clean design configurations, solid responsiveness, and clean CSS structure)>,
  "highlights": [
    "<string: positive UX/styling comment, e.g. 'Consistent color variables and clean CSS flexbox/grid layout implementations'>"
  ],
  "findings": [
    {{
      "id": "PRE-001",
      "severity": "CRITICAL" | "MAJOR" | "MINOR" | "INFO",
      "file": "<string: relative path of styling/component file with issues>",
      "line": <integer: line number or 0 if general presentation critique>,
      "description": "<string: explanation of responsiveness flaw, lack of media query, missing ARIA tags, or poor styling organization>",
      "code_snippet": "<string: the line or code block containing the styling issue>"
    }}
  ],
  "recommendations": [
    {{
      "action": "<string: layout refactor, CSS structure improvements, or adding accessibility details>",
      "impact": "<string: improvement to usability, accessibility, cross-browser compatibility, or stylesheet size>",
      "code_fix": "<string: proposed CSS/JSX code block showing clean styling rules>"
    }}
  ]
}}
"""

@register_agent("presentation")
class PresentationAgent(BaseAgent):
    def __init__(self):
        super().__init__("Presentation Agent")

    def _get_frontend_files(self, project_root: Path, max_files: int = 15) -> list[Path]:
        """
        Specialized scanner for frontend styling/layout files.
        Prioritizes App.tsx, index.css, Tailwind config, component layouts.
        """
        frontend_files = []
        if not project_root.is_dir():
            return frontend_files

        # Common directories to search first
        frontend_dirs = ["src", "components", "pages", "views", "styles", "public"]
        
        # Extensions to filter
        frontend_extensions = {".jsx", ".tsx", ".css", ".scss", ".html", ".vue", ".svelte", ".js", ".ts"}
        ignored_names = {"vite.config.js", "vite.config.ts", "package.json", "package-lock.json", "node_modules", ".venv", "venv", ".git"}

        # Search prioritized folders first
        for fd in frontend_dirs:
            p_dir = project_root / fd
            if p_dir.is_dir():
                try:
                    for path in p_dir.rglob("*"):
                        if not path.is_file():
                            continue
                        if path.suffix.lower() in frontend_extensions and path.name not in ignored_names:
                            frontend_files.append(path)
                except Exception:
                    pass

        # Fallback to rglob if none found in prioritized folders
        if not frontend_files:
            try:
                from agents.base_agent import IGNORED_DIRS
                for path in project_root.rglob("*"):
                    if not path.is_file():
                        continue
                    parts = path.relative_to(project_root).parts
                    if any(part in IGNORED_DIRS for part in parts):
                        continue
                    if path.suffix.lower() in frontend_extensions and path.name not in ignored_names:
                        frontend_files.append(path)
            except Exception:
                pass

        # Sort files by size, but prioritize CSS variables/configuration/App layout
        def priority_key(p: Path):
            name_lower = p.name.lower()
            if "tailwind" in name_lower or "theme" in name_lower or "variable" in name_lower:
                return (0, -p.stat().st_size)
            if name_lower in ("app.css", "index.css", "main.css", "app.jsx", "app.tsx"):
                return (1, -p.stat().st_size)
            return (2, -p.stat().st_size)

        frontend_files.sort(key=priority_key)
        return frontend_files[:max_files]

    def run(self, code_context: dict) -> dict:
        project_root_raw = code_context.get("project_root")
        if not project_root_raw:
            return {
                "agent": "presentation",
                "score": 0,
                "data": {"highlights": [], "findings": [], "recommendations": []},
                "errors": ["Missing 'project_root' in code_context."],
            }

        project_root = Path(project_root_raw)
        frontend_files = self._get_frontend_files(project_root)
        
        if not frontend_files:
            return {
                "agent": "presentation",
                "score": 100,
                "data": {
                    "highlights": ["No specialized front-end layout or styling files detected."],
                    "findings": [],
                    "recommendations": []
                },
                "errors": []
            }

        code_block = self._read_source_files(frontend_files, project_root)
        
        # Format folder insights
        folder_results = code_context.get("folder_results", {})
        folder_insights_str = "No folder structures provided."
        if folder_results:
            folder_insights_str = json.dumps(folder_results.get("data", {}), indent=2)

        prompt = PROMPT_TEMPLATE.format(folder_insights=folder_insights_str, code_context=code_block)
        schema_hint = "JSON dictionary with keys 'score', 'highlights', 'findings', 'recommendations'"

        try:
            logger.info("PresentationAgent: Calling Gemini API to review styling and UI layouts.")
            raw_response = call_gemini(prompt, response_schema_hint=schema_hint)
            parsed = parse_json_response(raw_response)

            if not validate_response(parsed, REQUIRED_KEYS):
                raise ValueError(f"Gemini response missing required keys: {list(parsed.keys())}")

            data = {
                "highlights": parsed.get("highlights", []),
                "findings": parsed.get("findings", []),
                "recommendations": parsed.get("recommendations", [])
            }

            return {
                "agent": "presentation",
                "score": int(parsed.get("score", 100)),
                "data": data,
                "errors": []
            }
        except Exception as e:
            logger.error(f"PresentationAgent failed during execution: {e}", exc_info=True)
            return {
                "agent": "presentation",
                "score": 0,
                "data": {"highlights": [], "findings": [], "recommendations": []},
                "errors": [f"Presentation layer analysis failed: {e}"]
            }
