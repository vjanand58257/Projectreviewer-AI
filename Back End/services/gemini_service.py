import os
import time
import json
import re
import logging
import threading
from flask import current_app
import google.generativeai as genai
from google.api_core.exceptions import GoogleAPICallError

logger = logging.getLogger(__name__)

class GeminiParseError(Exception):
    """Raised when the response from Gemini cannot be parsed as JSON."""
    pass

# Global lock and state for rate limiting
_rate_limit_lock = threading.Lock()
_last_call_time = 0.0
_MIN_INTERVAL = 4.0  # Minimum 4 seconds between API calls to conform with 15 RPM Free Tier limit

def _wait_for_rate_limit():
    """Simple client-side rate limiter to avoid hammering the API."""
    global _last_call_time
    with _rate_limit_lock:
        now = time.time()
        elapsed = now - _last_call_time
        if elapsed < _MIN_INTERVAL:
            sleep_time = _MIN_INTERVAL - elapsed
            logger.info(f"Rate limiting: spacing requests. Sleeping for {sleep_time:.2f} seconds...")
            time.sleep(sleep_time)
        _last_call_time = time.time()

# Prompt templates library
PROMPT_TEMPLATES = {
    "json_review": (
        "You are an expert AI software agent. Review the provided content and return a JSON object.\n"
        "Your response MUST be valid JSON only. Do not include any extra conversational text outside the JSON.\n\n"
        "Content to review:\n"
        "{content}\n\n"
        "Required JSON schema structure: {schema_hint}"
    ),
    "code_agent_review": (
        "Review the following code file for bugs, style, and optimizations. "
        "Return a JSON object matching this schema:\n"
        "{{\n"
        "  \"score\": <int 0-100>,\n"
        "  \"highlights\": [<list of positive comments>],\n"
        "  \"findings\": [<list of issues/bugs found>],\n"
        "  \"recommendations\": [<list of actionable advice>]\n"
        "}}\n\n"
        "File Content:\n"
        "{content}"
    )
}

def parse_json_response(text: str) -> dict:
    """
    Cleans markdown code fences (```json ... ```) from a text response
    and parses it into a Python dictionary.
    Raises GeminiParseError if parsing fails.
    """
    if not text:
        raise GeminiParseError("Empty response text received.")
    
    cleaned = text.strip()
    # Match ```json ... ``` or ``` ... ``` patterns
    match = re.search(r"```(?:json)?\s*(.*?)\s*```", cleaned, re.DOTALL | re.IGNORECASE)
    if match:
        cleaned = match.group(1).strip()
    
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError as e:
        raise GeminiParseError(f"Failed to parse JSON response: {e}. Raw text was: {text}")

def validate_response(data: dict, required_keys: list) -> bool:
    """Confirms the dict contains all required keys."""
    if not isinstance(data, dict):
        return False
    return all(key in data for key in required_keys)

def call_gemini(prompt: str, response_schema_hint: str = None) -> str:
    """
    Calls the Gemini Generative Model API with retries and client-side rate limiting.
    
    Args:
        prompt: The text prompt to send to the model.
        response_schema_hint: Optional hint text or instructions about the expected output schema.
        
    Returns:
        The raw text response from the Gemini model.
    """
    # 1. Enforce rate limiting
    _wait_for_rate_limit()

    # 2. Get API key from config or environment
    api_key = None
    try:
        api_key = current_app.config.get("GEMINI_API_KEY")
    except RuntimeError:
        # Flask context not available, fallback to environment
        pass
    
    if not api_key:
        api_key = os.getenv("GEMINI_API_KEY")

    if not api_key:
        raise ValueError("GEMINI_API_KEY is not configured. Please set it in your environment or .env file.")

    # Configure the library
    genai.configure(api_key=api_key)

    # 3. Setup prompt
    full_prompt = prompt
    if response_schema_hint:
        full_prompt = f"{prompt}\n\n[Expected Schema/Instructions]:\n{response_schema_hint}"

    # Use gemini-2.5-flash as default model
    model_name = "gemini-2.5-flash"
    model = genai.GenerativeModel(model_name)

    # 4. Retry loop with backoff for transient issues
    max_attempts = 4
    base_backoff = 3.0  # seconds
    
    last_error = None
    for attempt in range(1, max_attempts + 1):
        try:
            logger.info(f"Calling Gemini API (Attempt {attempt}/{max_attempts})...")
            response = model.generate_content(full_prompt)
            if not response or not response.text:
                raise ValueError("Received empty or invalid response from Gemini API.")
            return response.text
        except (GoogleAPICallError, Exception) as e:
            last_error = e
            err_str = str(e)
            logger.warning(f"Gemini API call failed on attempt {attempt}: {e}")
            
            # If it's the last attempt, don't sleep, just let it fail/raise
            if attempt == max_attempts:
                break
                
            # If it's a 429 / Rate Limit error, look for retry time or use a safe default
            if "429" in err_str or "quota" in err_str.lower() or "limit" in err_str.lower():
                # Extract "retry in X.XXs" or "retry in Xs"
                match = re.search(r"retry in ([\d\.]+)s", err_str, re.IGNORECASE)
                if match:
                    sleep_time = float(match.group(1)) + 2.0
                    logger.warning(f"Gemini Rate Limit! Extracted cool-down: sleeping for {sleep_time:.2f} seconds...")
                else:
                    sleep_time = 35.0
                    logger.warning(f"Gemini Rate Limit! Defaulting to 35.0 seconds cool-down...")
            else:
                sleep_time = base_backoff * (2 ** (attempt - 1))
                logger.info(f"Sleeping for {sleep_time:.2f} seconds before retrying...")
                
            time.sleep(sleep_time)
            
    raise RuntimeError(f"Gemini API call failed after {max_attempts} attempts. Last error: {last_error}")
