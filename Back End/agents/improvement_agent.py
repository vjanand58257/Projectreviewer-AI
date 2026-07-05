import logging
import json
from pathlib import Path
from agents.base_agent import BaseAgent
from agents.registry import register_agent
from services.gemini_service import call_gemini, parse_json_response, validate_response

logger = logging.getLogger(__name__)
REQUIRED_KEYS = ["score", "highlights", "findings", "recommendations"]

PROMPT_TEMPLATE = """
You are a senior systems engineer, refactoring architect, and developer coach.
Your task is to review the compiled analysis results from all other analysis agents (Folder, Documentation, Innovation, Bug, Security, Presentation, and Interview)
and synthesize a single, actionable refactoring priority roadmap.

Analysis Results from other Agents:
{agents_results}

Create a unified report representing the overall optimization plan. Match the canonical agent response schema.
Format the "findings" list to represent prioritized tasks:
- Categorize tasks into Short-term fixes (Critical/Major bugs or security flaws).
- Medium-term refactoring (Docstrings, UI styling fixes, folder layout improvements).
- Long-term features (Novel architectures, library migrations, new endpoints).

Format the "recommendations" list to provide step-by-step refactoring instructions and code fixes for the priority tasks.
Ensure the output strictly conforms to the JSON schema specified below.
Your response MUST be valid JSON only. Do not wrap the JSON in conversational text or notes.

Required JSON Structure:
{{
  "score": <integer from 0 to 100 representing the project's overall roadmap maturity (100 means a highly clear, optimized codebase requiring minor tuning)>,
  "highlights": [
    "<string: positive general statement summarizing the main strengths across all analyses>"
  ],
  "findings": [
    {{
      "id": "IMP-001",
      "severity": "CRITICAL" | "MAJOR" | "MINOR" | "INFO",
      "file": "<string: relative path of the file or module for this roadmap task, or 'general' if global>",
      "line": <integer: line number or 0 if global>,
      "description": "<string: category of priority (e.g. '[Short-term] Fix secrets exposure' or '[Medium-term] Standardize CSS styling') and detailed roadmap description>"
    }}
  ],
  "recommendations": [
    {{
      "action": "<string: clear, step-by-step refactoring action plan for this roadmap task>",
      "impact": "<string: optimization outcome (performance, scalability, readability)>",
      "code_fix": "<string: code snippet or structural design pattern example for the refactoring>"
    }}
  ]
}}
"""

@register_agent("improvement")
class ImprovementAgent(BaseAgent):
    def __init__(self):
        super().__init__("Improvement Agent")

    def run(self, code_context: dict) -> dict:
        project_root_raw = code_context.get("project_root")
        if not project_root_raw:
            return {
                "agent": "improvement",
                "score": 0,
                "data": {"highlights": [], "findings": [], "recommendations": []},
                "errors": ["Missing 'project_root' in code_context."],
            }

        # Gather previous results
        previous_results = code_context.get("results", {})
        
        # Strip out details we don't want to bloat the prompt
        summarized_results = {}
        for agent_name, result in previous_results.items():
            if agent_name == "improvement" or not isinstance(result, dict):
                continue
            
            data_dict = result.get("data", {})
            raw_findings = data_dict.get("findings", [])
            raw_recs = data_dict.get("recommendations", [])
            
            findings_list = []
            for f in raw_findings:
                if isinstance(f, dict):
                    findings_list.append({
                        "id": f.get("id", ""),
                        "severity": f.get("severity", "INFO"),
                        "file": f.get("file", ""),
                        "description": f.get("description", "")
                    })
                elif isinstance(f, str):
                    findings_list.append({
                        "description": f
                    })
                    
            recs_list = []
            for r in raw_recs:
                if isinstance(r, dict):
                    recs_list.append({
                        "action": r.get("action", ""),
                        "impact": r.get("impact", "")
                    })
                elif isinstance(r, str):
                    recs_list.append({
                        "action": r
                    })

            summarized_results[agent_name] = {
                "score": result.get("score"),
                "highlights": data_dict.get("highlights", []),
                "findings": findings_list,
                "recommendations": recs_list
            }

        agents_results_str = json.dumps(summarized_results, indent=2)
        prompt = PROMPT_TEMPLATE.format(agents_results=agents_results_str)
        schema_hint = "JSON dictionary with keys 'score', 'highlights', 'findings', 'recommendations'"

        try:
            logger.info("ImprovementAgent: Calling Gemini API to synthesize final roadmap.")
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
                "agent": "improvement",
                "score": int(parsed.get("score", 100)),
                "data": data,
                "errors": []
            }
        except Exception as e:
            logger.error(f"ImprovementAgent failed during execution: {e}", exc_info=True)
            return {
                "agent": "improvement",
                "score": 0,
                "data": {"highlights": [], "findings": [], "recommendations": []},
                "errors": [f"Roadmap synthesis failed: {e}"]
            }
