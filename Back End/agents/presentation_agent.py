"""
Presentation Agent
==================
Evaluates a project's demo-readiness and presentation quality.

This agent does NOT scan CSS/HTML/JSX for styling issues (that is a UI audit).
Instead, it reads the project's README and Folder Agent structural signals to
produce a presentation coach output: demo order, slide titles, speaking points,
expected audience questions, and best features to highlight.

Inputs from code_context:
  - project_root    (str | Path) — required
  - project_name    (str)        — optional, defaults to folder name
  - readme_content  (str)        — optional, agent reads README if absent
  - folder_results  (dict)       — canonical FolderAgent output (passed in; NO re-scan)

Returns canonical schema with plain strings:
  {"agent": "presentation", "score": 0-100,
   "data": {"highlights": [...], "findings": [...], "recommendations": [...]},
   "errors": []}

  highlights    = best features to emphasise in the demo
  findings      = gaps that will hurt the presentation (missing demo assets, etc.)
  recommendations = concrete slide titles, speaking points, expected Q&A
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
You are an expert technical pitch coach and product demo strategist.

Your task is to evaluate how well-prepared this software project is for a live demo
or hackathon presentation, and to produce a structured presentation guide.

--- Project Name ---
{project_name}

--- README / Description ---
{readme_section}

--- Structural Signals (from Folder Agent offline scan) ---
{folder_signals}

Evaluate across five dimensions:
  1. Demo Order     — What is the most compelling flow to walk through?
  2. Slide Titles   — What are the 5–7 slide titles that tell the best story?
  3. Speaking Points — What are the 3–5 strongest talking points?
  4. Expected Q&A   — What questions will a technical judge or investor likely ask?
  5. Highlight Features — Which 2–3 features should be demoed first for maximum impact?

Scoring (0–100):
  80–100: Clear purpose, strong README, all supporting files (tests, Docker, CI/CD)
  60–79:  Good core but missing some docs or demo assets
  40–59:  Unclear value prop, thin README, no tests or Docker
  0–39:   Hard to present — missing critical context

Return ONLY a valid JSON object — no prose, no markdown fences:
{{
  "score": <integer 0–100>,
  "highlights": [
    "<string: a best feature or strong point to lead with in the demo>"
  ],
  "findings": [
    "<string: a gap that will hurt the presentation, e.g. 'No screenshots or demo GIF in README'>"
  ],
  "recommendations": [
    "<string: a concrete slide title, speaking point, or expected audience question — label it clearly, e.g. 'Slide 1: The Problem' or 'Q: How does this scale?'>"
  ]
}}

All list items must be plain strings. Do not nest objects.
"""


def _read_readme(project_root: Path) -> str:
    for item in project_root.iterdir():
        if item.is_file() and item.name.lower() in README_VARIANTS:
            try:
                text = item.read_text(encoding="utf-8", errors="ignore")
                return text[:8000] + "\n...[TRUNCATED]..." if len(text) > 8000 else text
            except Exception as e:
                logger.warning(f"PresentationAgent: Could not read README: {e}")
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


@register_agent("presentation")
class PresentationAgent(BaseAgent):
    """
    Produces a presentation guide (demo order, slides, speaking points, Q&A)
    from README content and pre-computed FolderAgent output.
    Does NOT re-scan the filesystem.
    """

    def __init__(self):
        super().__init__("Presentation Agent")

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
        if not project_root.is_dir():
            return {
                "agent": "presentation",
                "score": 0,
                "data": {"highlights": [], "findings": [], "recommendations": []},
                "errors": [f"project_root is not a valid directory: {project_root}"],
            }

        # ── Project name ──────────────────────────────────────────────────────
        project_name = code_context.get("project_name") or project_root.name or "Unknown Project"

        # ── README ────────────────────────────────────────────────────────────
        readme_content = code_context.get("readme_content") or _read_readme(project_root)
        readme_section = (
            readme_content if readme_content.strip()
            else "No README found. Project description is unavailable."
        )

        # ── Folder results (pre-computed — NO re-scan) ────────────────────────
        folder_results = code_context.get("folder_results")
        folder_signals = _summarise_folder(folder_results)

        if folder_results:
            logger.info(
                f"PresentationAgent: Reusing pre-computed FolderAgent output "
                f"(score={folder_results.get('score', 'N/A')}/100). No re-scan."
            )
        else:
            logger.info("PresentationAgent: No folder_results provided.")

        # ── Build prompt ──────────────────────────────────────────────────────
        prompt = PROMPT_TEMPLATE.format(
            project_name=project_name,
            readme_section=readme_section,
            folder_signals=folder_signals,
        )
        schema_hint = (
            "JSON object with keys 'score' (int 0-100), "
            "'highlights' (list of strings), "
            "'findings' (list of strings), "
            "'recommendations' (list of strings). "
            "All list items must be plain strings."
        )

        try:
            logger.info(
                f"PresentationAgent: Calling Gemini API for project '{project_name}'."
            )
            raw_response = call_gemini(prompt, response_schema_hint=schema_hint)
            parsed = parse_json_response(raw_response)

            if not validate_response(parsed, REQUIRED_KEYS):
                logger.error(f"PresentationAgent: Missing keys. Found: {list(parsed.keys())}")
                return {
                    "agent": "presentation",
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
                            or item.get("recommendation")
                            or item.get("message")
                            or str(item)
                        )
                    else:
                        flat.append(str(item))
                return flat

            return {
                "agent": "presentation",
                "score": int(parsed["score"]),
                "data": {
                    "highlights":      _flatten(parsed.get("highlights", [])),
                    "findings":        _flatten(parsed.get("findings", [])),
                    "recommendations": _flatten(parsed.get("recommendations", [])),
                },
                "errors": [],
            }

        except Exception as e:
            logger.error(f"PresentationAgent failed: {e}", exc_info=True)
            return {
                "agent": "presentation",
                "score": 0,
                "data": {"highlights": [], "findings": [], "recommendations": []},
                "errors": [f"Presentation analysis failed: {e}"],
            }
