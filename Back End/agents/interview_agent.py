import logging
import json
from pathlib import Path
from agents.base_agent import BaseAgent
from agents.registry import register_agent
from services.gemini_service import call_gemini, parse_json_response, validate_response

logger = logging.getLogger(__name__)
REQUIRED_KEYS = ["score", "highlights", "findings", "recommendations"]

PROMPT_TEMPLATE = """
You are a senior technical interviewer and recruiting evaluator.
Review the following codebase files and generate 5-10 tailored technical interview questions for a developer candidate who worked on this project.
The questions should check the candidate's understanding of key design patterns, potential bugs, libraries used, or complex sections in this specific codebase.

Folder structure insights from offline scan:
{folder_insights}

Codebase Files Context:
{code_context}

Return a JSON object containing the questions mapped into the canonical agent response schema.
Each question should be a "finding" with severity INFO, and the expected answer should be a "recommendation" linked conceptually.
Ensure the output strictly conforms to the JSON schema specified below.
Your response MUST be valid JSON only. Do not wrap the JSON in conversational text or notes.

Required JSON Structure:
{{
  "score": <integer from 0 to 100 representing codebase review completeness (100 means many suitable interview questions found)>,
  "highlights": [
    "<string: positive comment about technical areas suitable for interview questions, e.g. 'Interesting use of threads in orchestrator.py'>"
  ],
  "findings": [
    {{
      "id": "INT-001",
      "severity": "INFO",
      "file": "<string: relative path of the file the question is about>",
      "line": <integer: line number in file for the question's context>,
      "description": "<string: the interview question itself, including the context/question details>",
      "code_snippet": "<string: code snippet from the file to ask the candidate about>"
    }}
  ],
  "recommendations": [
    {{
      "action": "<string: detailed guide on the expected answer and key technical concepts the candidate should explain>",
      "impact": "<string: what this question evaluates (e.g. 'Tests candidate's understanding of database connection pooling')>",
      "code_fix": "<string: reference solution code snippet or ideal implementation to compare against>"
    }}
  ]
}}
"""

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
        source_files = self._get_source_files(project_root)
        
        if not source_files:
            return {
                "agent": "interview",
                "score": 100,
                "data": {
                    "highlights": ["No source code files detected to build interview questions."],
                    "findings": [],
                    "recommendations": []
                },
                "errors": []
            }

        code_block = self._read_source_files(source_files, project_root)
        
        # Format folder insights
        folder_results = code_context.get("folder_results", {})
        folder_insights_str = "No folder structures provided."
        if folder_results:
            folder_insights_str = json.dumps(folder_results.get("data", {}), indent=2)

        prompt = PROMPT_TEMPLATE.format(folder_insights=folder_insights_str, code_context=code_block)
        schema_hint = "JSON dictionary with keys 'score', 'highlights', 'findings', 'recommendations'"

        try:
            logger.info("InterviewAgent: Calling Gemini API to compile interview questions.")
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
                "agent": "interview",
                "score": int(parsed.get("score", 100)),
                "data": data,
                "errors": []
            }
        except Exception as e:
            logger.error(f"InterviewAgent failed during execution: {e}", exc_info=True)
            return {
                "agent": "interview",
                "score": 0,
                "data": {"highlights": [], "findings": [], "recommendations": []},
                "errors": [f"Interview question compilation failed: {e}"]
            }
