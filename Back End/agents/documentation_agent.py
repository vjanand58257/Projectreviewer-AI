import os
from pathlib import Path
import logging

from agents.base_agent import BaseAgent
from agents.registry import register_agent
from services.gemini_service import call_gemini, parse_json_response, validate_response

logger = logging.getLogger(__name__)

# Variants of README files (case-insensitive check)
README_VARIANTS = {"readme.md", "readme.txt", "readme.rst", "readme"}

# Expected keys in JSON schema response from Gemini
REQUIRED_KEYS = ["score", "highlights", "findings", "recommendations"]

PROMPT_TEMPLATE = """
You are an expert technical writer and code reviewer. Your task is to evaluate the documentation quality of a project based on its README content.

Please review the following README file and analyze it for the presence, quality, and completeness of the following key sections:
1. **Overview / Description**: Clear explanation of what the project does.
2. **Installation / Setup**: Actionable steps to install dependencies and run locally.
3. **Usage**: Code snippets, CLI commands, or interface instructions showing how to use the project.
4. **Features**: List of core features or functionality.
5. **Screenshots / Visuals**: Links, placeholders, or actual images demonstrating the application.
6. **License**: Mentions or links to the project license.
7. **Contribution Guide**: Instructions on how to contribute or report issues.

Assess the README contents carefully and return a JSON object with this exact structure (no conversational text outside the JSON):
{{
  "score": <integer from 0 to 100 based on completeness and clarity of the documentation>,
  "highlights": [
    "<string: positive comment about a well-documented section>"
  ],
  "findings": [
    "<string: description of missing or incomplete sections, e.g. 'Missing installation guidelines'>"
  ],
  "recommendations": [
    "<string: actionable advice on how to improve the README, e.g. 'Add a LICENSE section to specify distribution terms'>"
  ]
}}

README Content to evaluate:
---
{readme_content}
---
"""

@register_agent("documentation")
class DocumentationAgent(BaseAgent):
    """
    Evaluates project documentation quality based on README contents using the Gemini API.
    If the README is missing, it returns a score of 0 immediately without calling the API.
    """

    def __init__(self):
        super().__init__("Documentation Agent")

    def _find_readme(self, project_root: Path) -> Path | None:
        """Looks for a README file matching standard naming variants in the root of the project."""
        if not project_root.is_dir():
            return None
        
        for item in project_root.iterdir():
            if item.is_file() and item.name.lower() in README_VARIANTS:
                return item
        return None

    def run(self, code_context: dict) -> dict:
        """
        Args:
            code_context: dict containing 'project_root' (Path or str).
            
        Returns:
            Canonical agent schema dict.
        """
        project_root_raw = code_context.get("project_root")
        if not project_root_raw:
            return {
                "agent": "documentation",
                "score": 0,
                "data": {"highlights": [], "findings": [], "recommendations": []},
                "errors": ["Missing 'project_root' in code_context."],
            }

        project_root = Path(project_root_raw)
        readme_file = self._find_readme(project_root)

        if not readme_file:
            logger.info("DocumentationAgent: No README found. Skipping Gemini call.")
            return {
                "agent": "documentation",
                "score": 0,
                "data": {
                    "highlights": [],
                    "findings": ["No README file detected in the project root."],
                    "recommendations": [
                        "Create a README.md file in the project root directory.",
                        "Ensure it contains an Overview, Installation guidelines, and Usage examples to help developers onboard."
                    ]
                },
                "errors": []
            }

        # Read README content
        try:
            readme_content = readme_file.read_text(encoding="utf-8", errors="ignore")
            # Limit content size to avoid sending huge readmes to the model
            if len(readme_content) > 30000:
                readme_content = readme_content[:30000] + "\n...[TRUNCATED FOR LENGTH]..."
        except Exception as e:
            logger.error(f"Failed to read README file: {e}")
            return {
                "agent": "documentation",
                "score": 0,
                "data": {"highlights": [], "findings": [], "recommendations": []},
                "errors": [f"Failed to read README file: {e}"]
            }

        if not readme_content.strip():
            logger.info("DocumentationAgent: README is empty. Skipping Gemini call.")
            return {
                "agent": "documentation",
                "score": 0,
                "data": {
                    "highlights": [],
                    "findings": ["README file is empty."],
                    "recommendations": [
                        "Populate the README file with project description, setup steps, and license information."
                    ]
                },
                "errors": []
            }

        # Prompt preparation and API call
        prompt = PROMPT_TEMPLATE.format(readme_content=readme_content)
        schema_hint = "JSON dictionary with keys 'score', 'highlights', 'findings', 'recommendations'"
        
        try:
            logger.info("DocumentationAgent: Calling Gemini API to evaluate README.")
            raw_response = call_gemini(prompt, response_schema_hint=schema_hint)
            parsed = parse_json_response(raw_response)
            
            if not validate_response(parsed, REQUIRED_KEYS):
                logger.error(f"DocumentationAgent: Gemini response missing required keys. Keys found: {list(parsed.keys())}")
                return {
                    "agent": "documentation",
                    "score": 0,
                    "data": {"highlights": [], "findings": [], "recommendations": []},
                    "errors": ["Gemini response did not conform to the required JSON schema structure."]
                }
                
            return {
                "agent": "documentation",
                "score": int(parsed["score"]),
                "data": {
                    "highlights": parsed["highlights"],
                    "findings": parsed["findings"],
                    "recommendations": parsed["recommendations"]
                },
                "errors": []
            }
            
        except Exception as e:
            logger.error(f"DocumentationAgent failed during API execution: {e}", exc_info=True)
            return {
                "agent": "documentation",
                "score": 0,
                "data": {"highlights": [], "findings": [], "recommendations": []},
                "errors": [f"Documentation analysis failed: {e}"]
            }
