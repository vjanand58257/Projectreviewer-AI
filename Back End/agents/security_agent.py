import logging
from pathlib import Path
from agents.base_agent import BaseAgent
from agents.registry import register_agent
from services.gemini_service import call_gemini, parse_json_response, validate_response

logger = logging.getLogger(__name__)
REQUIRED_KEYS = ["score", "highlights", "findings", "recommendations"]

PROMPT_TEMPLATE = """
You are a senior security researcher and DevSecOps auditor.
Audit the following codebase files for security vulnerabilities based on OWASP Top 10 guidelines.
Specifically look for:
1. Secrets exposure (hardcoded API keys, passwords, private keys, database URLs).
2. Injection flaws (SQL injection, Command injection).
3. Cross-Site Scripting (XSS) or security misconfigurations.
4. Dependency-related risks or lack of input validation.

Codebase Files Context:
{code_context}

Perform a rigorous security check and return a JSON object. Ensure the output strictly conforms to the JSON schema specified below.
Your response MUST be valid JSON only. Do not wrap the JSON in conversational text or notes.

Required JSON Structure:
{{
  "score": <integer from 0 to 100 representing security health (100 means no threats detected)>,
  "highlights": [
    "<string: positive security feature or robust practice detected>"
  ],
  "findings": [
    {{
      "id": "SEC-001",
      "severity": "CRITICAL" | "MAJOR" | "MINOR" | "INFO",
      "file": "<string: relative path of the file where the vulnerability exists>",
      "line": <integer: line number where the issue starts>,
      "description": "<string: explanation of the security risk>",
      "code_snippet": "<string: the insecure line or block of code>"
    }}
  ],
  "recommendations": [
    {{
      "action": "<string: mitigation step or secure implementation instruction>",
      "impact": "<string: how this mitigates the risk>",
      "code_fix": "<string: secure version of the code snippet or config block>"
    }}
  ]
}}
"""

@register_agent("security")
class SecurityAgent(BaseAgent):
    def __init__(self):
        super().__init__("Security Agent")

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
        source_files = self._get_source_files(project_root)
        
        if not source_files:
            return {
                "agent": "security",
                "score": 100,
                "data": {
                    "highlights": ["No source code files detected for security analysis."],
                    "findings": [],
                    "recommendations": []
                },
                "errors": []
            }

        code_block = self._read_source_files(source_files, project_root)
        prompt = PROMPT_TEMPLATE.format(code_context=code_block)
        schema_hint = "JSON dictionary with keys 'score', 'highlights', 'findings', 'recommendations'"

        try:
            logger.info("SecurityAgent: Calling Gemini API to audit security.")
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
                "agent": "security",
                "score": int(parsed.get("score", 100)),
                "data": data,
                "errors": []
            }
        except Exception as e:
            logger.error(f"SecurityAgent failed during execution: {e}", exc_info=True)
            return {
                "agent": "security",
                "score": 0,
                "data": {"highlights": [], "findings": [], "recommendations": []},
                "errors": [f"Security analysis failed: {e}"]
            }
