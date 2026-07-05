"""
Improvement Agent
=================
Evaluates a project by consuming the combined outputs of all 7 previous agents 
(Folder, Documentation, Innovation, Bug, Security, Presentation, Interview).
Generates prioritized improvements (title, difficulty, estimated hours, expected score increase), 
overall business recommendation, and an overall conclusion.

Inputs:
  - previous_results (dict) - Outputs from all 7 previous agents.

Returns canonical schema:
  {"agent": "improvement", "score": 0-100, "data": {"highlights": [], "findings": [], "recommendations": []}, "errors": []}
"""

import logging
import json
from pathlib import Path

from agents.base_agent import BaseAgent
from agents.registry import register_agent
from services.gemini_service import call_gemini, parse_json_response, validate_response

logger = logging.getLogger(__name__)

REQUIRED_KEYS = ["score", "highlights", "findings", "recommendations"]

PROMPT_TEMPLATE = """
You are a Principal Software Architect and Technical Product Manager.
Your task is to synthesize the analysis results of 7 different AI agents that just reviewed a candidate's codebase.

--- Previous Agent Results ---
{combined_results}

Based on these results, you must provide:
1. 'highlights': 2-3 overall business recommendations or high-level observations about the project.
2. 'findings': 2-3 overall conclusions summarizing the health and viability of the project.
3. 'recommendations': A prioritized list of specific improvements. Format each exactly as a plain string, e.g., 
   "[High Priority - Hard - 5h - +10 Score] Fix SQL Injection in auth module". 
   Ensure you cover the most critical issues identified by the agents.

Score (0-100) represents the overall composite health and business value of the project.

Return ONLY a valid JSON object matching this schema. All list items MUST be plain strings.
{{
  "score": <integer 0-100>,
  "highlights": [ "<string>" ],
  "findings": [ "<string>" ],
  "recommendations": [ "<string>" ]
}}
"""

@register_agent("improvement")
class ImprovementAgent(BaseAgent):
    def __init__(self):
        super().__init__("Improvement Agent")

    def run(self, code_context: dict) -> dict:
        
        # We expect 'previous_results' to contain the outputs of the 7 agents
        previous_results = code_context.get("previous_results", {})
        if not previous_results:
            logger.warning("ImprovementAgent: No 'previous_results' found in code_context.")
            
        combined_results_str = json.dumps(previous_results, indent=2)
        if len(combined_results_str) > 60000:
            logger.warning("ImprovementAgent: Truncating combined results to 60k characters.")
            combined_results_str = combined_results_str[:60000] + "\n...[TRUNCATED]"
            
        prompt = PROMPT_TEMPLATE.format(combined_results=combined_results_str)
        
        schema_hint = "JSON object with keys 'score', 'highlights', 'findings', 'recommendations'. All lists must contain plain strings."

        try:
            logger.info(f"ImprovementAgent: Calling Gemini API to synthesize results.")
            raw_response = call_gemini(prompt, response_schema_hint=schema_hint)
            parsed = parse_json_response(raw_response)

            if not validate_response(parsed, REQUIRED_KEYS):
                return {
                    "agent": "improvement", "score": 0,
                    "data": {"highlights": [], "findings": [], "recommendations": []},
                    "errors": ["Gemini response missing required keys."]
                }
                
            def _flatten(items):
                return [str(item) if not isinstance(item, dict) else str(item.get("description") or item.get("action") or item) for item in (items or [])]

            return {
                "agent": "improvement",
                "score": int(parsed.get("score", 0)),
                "data": {
                    "highlights": _flatten(parsed.get("highlights", [])),
                    "findings": _flatten(parsed.get("findings", [])),
                    "recommendations": _flatten(parsed.get("recommendations", [])),
                },
                "errors": []
            }
        except Exception as e:
            logger.error(f"ImprovementAgent failed: {e}", exc_info=True)
            return {
                "agent": "improvement", "score": 0,
                "data": {"highlights": [], "findings": [], "recommendations": []},
                "errors": [f"Improvement analysis failed: {e}"]
            }
