"""
Interview Agent
===============
Evaluates a project to generate tailored technical interview questions.
Reads the README and the pre-computed FolderAgent structural signals.
Generates a mix of questions (Easy, Medium, Hard, Architecture, HR, Coding)
with model answers to help interviewers probe the candidate effectively.

Inputs:
  - project_root (str | Path)
  - project_name (str)
  - readme_content (str)
  - folder_results (dict) - pre-computed from FolderAgent

Returns canonical schema:
  {"agent": "interview", "score": 0-100, "data": {"highlights": [], "findings": [], "recommendations": []}, "errors": []}
"""

import logging
from pathlib import Path

from agents.base_agent import BaseAgent
from agents.registry import register_agent
from services.gemini_service import call_gemini, parse_json_response, validate_response

logger = logging.getLogger(__name__)

REQUIRED_KEYS = ["score", "highlights", "findings", "recommendations"]
README_VARIANTS = {"readme.md", "readme.txt", "readme.rst", "readme"}

PROMPT_TEMPLATE = """
You are an expert technical interviewer and hiring manager.
Your task is to review the candidate's project and generate targeted interview questions based on its structure and description.

--- Project Name ---
{project_name}

--- README / Description ---
{readme_section}

--- Structural Signals (Folder Agent) ---
{folder_signals}

Based on this information, generate:
1. 'highlights': 2-3 areas where the project looks strong (good areas to praise or probe deeper).
2. 'findings': 2-3 weak spots, missing best practices, or red flags that you should challenge the candidate on.
3. 'recommendations': A list of specific interview questions formatted exactly as plain strings (e.g., "[Medium - Architecture] Why did you choose X over Y? Answer to look for: ...").
   Please provide at least one question for each category: Easy, Medium, Hard, Architecture, HR/Behavioral, and Coding/Implementation.

Score (0-100) represents how "interviewable" and mature this project is (100 = rich architecture and documentation to discuss, 0 = nothing to talk about).

Return ONLY a valid JSON object matching this schema. All list items MUST be plain strings.
{{
  "score": <integer 0-100>,
  "highlights": [ "<string>" ],
  "findings": [ "<string>" ],
  "recommendations": [ "<string>" ]
}}
"""

def _read_readme(project_root: Path) -> str:
    for item in project_root.iterdir():
        if item.is_file() and item.name.lower() in README_VARIANTS:
            try:
                text = item.read_text(encoding="utf-8", errors="ignore")
                return text[:8000] + "\n...[TRUNCATED]" if len(text) > 8000 else text
            except Exception:
                return ""
    return ""

def _summarise_folder(folder_results: dict) -> str:
    if not folder_results or not isinstance(folder_results, dict):
        return "No folder structure analysis available."
    data = folder_results.get("data", {})
    score = folder_results.get("score", "N/A")
    lines = [f"Folder Agent Score: {score}/100"]
    for h in data.get("highlights", []):
        lines.append(f"  + {h}")
    for f in data.get("findings", []):
        lines.append(f"  - {f}")
    return "\n".join(lines)


@register_agent("interview")
class InterviewAgent(BaseAgent):
    def __init__(self):
        super().__init__("Interview Agent")

    def run(self, code_context: dict) -> dict:
        project_root_raw = code_context.get("project_root")
        if not project_root_raw:
            return {
                "agent": "interview",
                "score": 0,
                "data": {"highlights": [], "findings": [], "recommendations": []},
                "errors": ["Missing 'project_root' in code_context."],
            }

        project_root = Path(project_root_raw)
        
        project_name = code_context.get("project_name") or project_root.name or "Unknown Project"
        readme_content = code_context.get("readme_content") or _read_readme(project_root)
        readme_section = readme_content if readme_content.strip() else "No README found."
        
        folder_results = code_context.get("folder_results")
        folder_signals = _summarise_folder(folder_results)
        
        if folder_results:
            logger.info("InterviewAgent: Reusing pre-computed FolderAgent output. No re-scan.")

        prompt = PROMPT_TEMPLATE.format(
            project_name=project_name,
            readme_section=readme_section,
            folder_signals=folder_signals
        )
        
        schema_hint = "JSON object with keys 'score', 'highlights', 'findings', 'recommendations'. All lists must contain plain strings."

        try:
            logger.info(f"InterviewAgent: Calling Gemini API for project '{project_name}'.")
            raw_response = call_gemini(prompt, response_schema_hint=schema_hint)
            parsed = parse_json_response(raw_response)

            if not validate_response(parsed, REQUIRED_KEYS):
                return {
                    "agent": "interview", "score": 0,
                    "data": {"highlights": [], "findings": [], "recommendations": []},
                    "errors": ["Gemini response missing required keys."]
                }
                
            def _flatten(items):
                return [str(item) if not isinstance(item, dict) else str(item.get("description") or item.get("action") or item) for item in (items or [])]

            return {
                "agent": "interview",
                "score": int(parsed.get("score", 0)),
                "data": {
                    "highlights": _flatten(parsed.get("highlights", [])),
                    "findings": _flatten(parsed.get("findings", [])),
                    "recommendations": _flatten(parsed.get("recommendations", [])),
                },
                "errors": []
            }
        except Exception as e:
            logger.error(f"InterviewAgent failed: {e}", exc_info=True)
            return {
                "agent": "interview", "score": 0,
                "data": {"highlights": [], "findings": [], "recommendations": []},
                "errors": [f"Interview analysis failed: {e}"]
            }
