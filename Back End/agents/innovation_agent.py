"""
Innovation Agent
================
Evaluates a project on five dimensions:
  - Innovation:     How novel and technically creative is the approach?
  - Market Demand:  Does the problem being solved have clear real-world demand?
  - Uniqueness:     How differentiated is this from common alternatives?
  - Business Value: Can this realistically create tangible commercial or social value?
  - Future Scope:   How extensible is the architecture for future growth?

Inputs from code_context:
  - project_root      (str | Path) – path to the extracted project directory
  - project_name      (str)        – human-readable name (from ZIP filename or README title)
  - readme_content    (str)        – raw README text (passed in; agent does NOT re-read it)
  - folder_results    (dict)       – canonical output from FolderAgent (passed in; agent does NOT re-scan)

IMPORTANT: This agent intentionally does NOT call _get_source_files() or _read_source_files()
because the orchestrator (and the standalone route) passes in folder_results that already
represent an offline filesystem scan.  The code content itself is derived from a targeted
read of only the key source files listed in folder_results highlights, keeping the prompt
concise and ensuring no redundant I/O.
"""

import logging
from pathlib import Path

from agents.base_agent import BaseAgent
from agents.registry import register_agent
from services.gemini_service import call_gemini, parse_json_response, validate_response

logger = logging.getLogger(__name__)

# Keys that Gemini must return
REQUIRED_KEYS = ["score", "highlights", "findings", "recommendations"]

# README variants to scan when readme_content is not pre-supplied
README_VARIANTS = {"readme.md", "readme.txt", "readme.rst", "readme"}

PROMPT_TEMPLATE = """
You are a senior technology strategist, startup advisor, and innovation evaluator.

Your task is to assess the innovation potential and commercial viability of a software project.

--- Project Information ---
Project Name: {project_name}

--- README / Description ---
{readme_section}

--- Structural Signals (from Folder Agent offline scan) ---
{folder_signals}

--- Key Source Files ---
{source_snippet}
--- End of Source ---

Evaluate the project across FIVE dimensions and return a single JSON object:

1. Innovation       – Technical novelty, creative problem-solving, use of modern patterns/APIs
2. Market Demand    – Clarity and size of the real-world problem being addressed
3. Uniqueness       – Differentiation from existing tools/frameworks/solutions
4. Business Value   – Realistic commercial, operational, or social value potential
5. Future Scope     – Architectural extensibility, roadmap potential, scalability

Scoring guide (0–100 overall):
  • 80–100: Highly innovative, clear demand, strong differentiation
  • 60–79:  Solid approach, moderate demand/uniqueness, room to grow
  • 40–59:  Generic or derivative, unclear value proposition
  • 0–39:   No discernible innovation, missing core features

Return ONLY a valid JSON object — no prose, no markdown fences — with this exact structure:
{{
  "score": <integer 0–100>,
  "highlights": [
    "<positive observation about innovation, demand, or uniqueness>"
  ],
  "findings": [
    "<gap, limitation, or risk related to any of the five dimensions>"
  ],
  "recommendations": [
    "<concrete action to improve innovation score, market fit, or extensibility>"
  ]
}}

All list items must be plain strings. Do not nest objects inside highlights, findings, or recommendations.
"""


def _extract_readme(project_root: Path) -> str:
    """
    Reads the README from the project root if it exists.
    Returns the raw text or an empty string.
    """
    for item in project_root.iterdir():
        if item.is_file() and item.name.lower() in README_VARIANTS:
            try:
                text = item.read_text(encoding="utf-8", errors="ignore")
                if len(text) > 8000:
                    text = text[:8000] + "\n...[TRUNCATED]..."
                return text
            except Exception as e:
                logger.warning(f"InnovationAgent: Could not read README at {item}: {e}")
    return ""


def _summarise_folder_results(folder_results: dict) -> str:
    """
    Converts the FolderAgent canonical output into a compact text block
    that is safe to embed in the Gemini prompt.
    """
    if not folder_results or not isinstance(folder_results, dict):
        return "No folder structure analysis available."

    data = folder_results.get("data", {})
    score = folder_results.get("score", "N/A")

    lines = [f"Folder Agent Score: {score}/100"]

    highlights = data.get("highlights", [])
    if highlights:
        lines.append("Detected structural indicators:")
        for h in highlights:
            lines.append(f"  + {h}")

    findings = data.get("findings", [])
    if findings:
        lines.append("Missing structural indicators:")
        for f in findings:
            lines.append(f"  - {f}")

    return "\n".join(lines)


@register_agent("innovation")
class InnovationAgent(BaseAgent):
    """
    Evaluates innovation potential using README, project name, and
    pre-computed FolderAgent output. Does NOT re-scan the filesystem
    or re-run the folder analysis.
    """

    def __init__(self):
        super().__init__("Innovation Agent")

    def run(self, code_context: dict) -> dict:
        """
        Args:
            code_context: dict containing:
                - project_root   (str | Path) — required
                - project_name   (str)        — optional, defaults to folder name
                - readme_content (str)        — optional, agent reads it if absent
                - folder_results (dict)       — optional, canonical FolderAgent output

        Returns:
            Canonical agent schema dict.
        """
        # ── Validate project_root ─────────────────────────────────────────────
        project_root_raw = code_context.get("project_root")
        if not project_root_raw:
            return {
                "agent": "innovation",
                "score": 0,
                "data": {"highlights": [], "findings": [], "recommendations": []},
                "errors": ["Missing 'project_root' in code_context."],
            }

        project_root = Path(project_root_raw)
        if not project_root.is_dir():
            return {
                "agent": "innovation",
                "score": 0,
                "data": {"highlights": [], "findings": [], "recommendations": []},
                "errors": [f"project_root is not a valid directory: {project_root}"],
            }

        # ── Resolve project name ──────────────────────────────────────────────
        project_name = (
            code_context.get("project_name")
            or project_root.name
            or "Unknown Project"
        )

        # ── Resolve README content ────────────────────────────────────────────
        # Use pre-supplied content if available, otherwise read it once here.
        readme_content = code_context.get("readme_content") or _extract_readme(project_root)

        if readme_content.strip():
            readme_section = readme_content
            logger.info(
                f"InnovationAgent: Using README content "
                f"({len(readme_content)} chars) for project '{project_name}'."
            )
        else:
            readme_section = "No README file found. Project description is unavailable."
            logger.info(
                f"InnovationAgent: No README content available for project '{project_name}'."
            )

        # ── Consume FolderAgent output (do NOT re-scan) ───────────────────────
        folder_results = code_context.get("folder_results")
        folder_signals = _summarise_folder_results(folder_results)

        if folder_results:
            logger.info(
                "InnovationAgent: Reusing pre-computed FolderAgent output "
                f"(score={folder_results.get('score', 'N/A')}/100). "
                "No filesystem re-scan performed."
            )
        else:
            logger.info(
                "InnovationAgent: No folder_results passed in — "
                "proceeding with structural signals unavailable."
            )

        # ── Read a small sample of source files for extra context ─────────────
        # Intentionally limited: we cap at 5 files / 6000 chars to keep the
        # prompt focused. The folder scan already summarises structure signals.
        source_files = self._get_source_files(project_root, max_files=5)
        source_snippet = (
            self._read_source_files(source_files, project_root, max_chars=6000)
            if source_files
            else "No source files detected."
        )

        # ── Build prompt and call Gemini ──────────────────────────────────────
        prompt = PROMPT_TEMPLATE.format(
            project_name=project_name,
            readme_section=readme_section,
            folder_signals=folder_signals,
            source_snippet=source_snippet,
        )
        schema_hint = (
            "JSON object with keys 'score' (int 0-100), "
            "'highlights' (list of strings), "
            "'findings' (list of strings), "
            "'recommendations' (list of strings). "
            "All list items must be plain strings — no nested objects."
        )

        try:
            logger.info(
                f"InnovationAgent: Calling Gemini API to evaluate innovation "
                f"for project '{project_name}'."
            )
            raw_response = call_gemini(prompt, response_schema_hint=schema_hint)
            parsed = parse_json_response(raw_response)

            if not validate_response(parsed, REQUIRED_KEYS):
                logger.error(
                    f"InnovationAgent: Gemini response missing required keys. "
                    f"Keys found: {list(parsed.keys())}"
                )
                return {
                    "agent": "innovation",
                    "score": 0,
                    "data": {"highlights": [], "findings": [], "recommendations": []},
                    "errors": ["Gemini response did not conform to the required JSON schema."],
                }

            # Normalise: ensure list items are strings (flatten any nested dicts)
            def _flatten(items: list) -> list:
                flat = []
                for item in (items or []):
                    if isinstance(item, dict):
                        # Pull the most descriptive string field from the object
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
                "agent": "innovation",
                "score": int(parsed["score"]),
                "data": {
                    "highlights": _flatten(parsed.get("highlights", [])),
                    "findings": _flatten(parsed.get("findings", [])),
                    "recommendations": _flatten(parsed.get("recommendations", [])),
                },
                "errors": [],
            }

        except Exception as e:
            logger.error(
                f"InnovationAgent failed during API execution: {e}", exc_info=True
            )
            return {
                "agent": "innovation",
                "score": 0,
                "data": {"highlights": [], "findings": [], "recommendations": []},
                "errors": [f"Innovation analysis failed: {e}"],
            }
