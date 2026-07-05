"""
Phase 8 - Documentation Agent Test
===================================
Tests DocumentationAgent in isolation against:
  - real_project.zip  (contains a README)
  - bad_project.zip   (no README)

Confirms:
  1. Real score/output for real_project.zip
  2. Score=0, no Gemini call for bad_project.zip
  3. Output matches canonical schema: {agent, score, data:{highlights,findings,recommendations}, errors}
"""

import sys
import json
import logging
import tempfile
import zipfile
from pathlib import Path

# ── Logging: emit to stdout so we can capture "Gemini" call traces ──────────
logging.basicConfig(
    level=logging.INFO,
    format="%(levelname)s | %(name)s | %(message)s",
    stream=sys.stdout
)

# Patch sys.path so imports resolve from the Back End directory
BACKEND_DIR = Path(__file__).parent
sys.path.insert(0, str(BACKEND_DIR))

# ── Load .env so GEMINI_API_KEY is available without running the full Flask app
from dotenv import load_dotenv
load_dotenv(BACKEND_DIR / ".env")

# ── Minimal Flask app context so config.py / app.py env vars load ───────────
from flask import Flask
_app = Flask(__name__)

# ── Gemini call spy ─────────────────────────────────────────────────────────
_gemini_calls = []

import services.gemini_service as _gs
_original_call_gemini = _gs.call_gemini

def _spy_call_gemini(prompt, **kwargs):
    _gemini_calls.append({"prompt_length": len(prompt)})
    return _original_call_gemini(prompt, **kwargs)

_gs.call_gemini = _spy_call_gemini

# ── Import agent AFTER spy is installed ─────────────────────────────────────
from agents.documentation_agent import DocumentationAgent

FIXTURES_DIR = BACKEND_DIR / "test_fixtures"

CANONICAL_TOP_KEYS = {"agent", "score", "data", "errors"}
CANONICAL_DATA_KEYS = {"highlights", "findings", "recommendations"}

# ── Helpers ──────────────────────────────────────────────────────────────────
def extract_zip_to_temp(zip_path: Path) -> Path:
    """
    Extracts the ZIP to a temp directory and resolves the project_root
    the same way the orchestrator does:
    - If the ZIP contains a single top-level directory (GitHub-style), descend into it.
    - Otherwise the extraction root IS the project root.
    """
    tmp = Path(tempfile.mkdtemp(prefix="phase8_"))
    with zipfile.ZipFile(zip_path, "r") as zf:
        zf.extractall(tmp)

    # Resolve inner project root (mirror orchestrator / ZipService behaviour)
    top_level = [p for p in tmp.iterdir() if p.is_dir()]
    if len(top_level) == 1:
        resolved = top_level[0]
        print(f"  [ZIP structure] Single top-level dir detected → project_root = {resolved.name}/")
        return resolved

    return tmp

def validate_schema(result: dict) -> list[str]:
    """Returns list of schema violations; empty means OK."""
    issues = []
    missing_top = CANONICAL_TOP_KEYS - set(result.keys())
    if missing_top:
        issues.append(f"Missing top-level keys: {missing_top}")
    if "score" in result:
        if not isinstance(result["score"], (int, float)):
            issues.append(f"'score' must be numeric, got {type(result['score'])}")
        if not (0 <= result["score"] <= 100):
            issues.append(f"'score' out of range [0,100]: {result['score']}")
    if "data" in result:
        missing_data = CANONICAL_DATA_KEYS - set(result["data"].keys())
        if missing_data:
            issues.append(f"Missing data sub-keys: {missing_data}")
        for k in CANONICAL_DATA_KEYS:
            if k in result["data"] and not isinstance(result["data"][k], list):
                issues.append(f"data['{k}'] must be a list")
    if "errors" in result and not isinstance(result["errors"], list):
        issues.append("'errors' must be a list")
    return issues


# ── Tests ────────────────────────────────────────────────────────────────────
def run_test(label: str, zip_name: str, expect_gemini_call: bool):
    zip_path = FIXTURES_DIR / zip_name
    print(f"\n{'='*60}")
    print(f"TEST: {label}")
    print(f"ZIP : {zip_path}")
    print(f"{'='*60}")

    if not zip_path.exists():
        print(f"  ✗ FIXTURE NOT FOUND: {zip_path}")
        return

    project_root = extract_zip_to_temp(zip_path)

    # Show what was extracted
    all_files = sorted(project_root.rglob("*"))
    print(f"\nExtracted files ({len(all_files)}):")
    for f in all_files:
        rel = f.relative_to(project_root)
        tag = "[DIR]" if f.is_dir() else f"[{f.stat().st_size}B]"
        print(f"  {tag}  {rel}")

    agent = DocumentationAgent()
    _gemini_calls.clear()

    with _app.app_context():
        result = agent.run({"project_root": str(project_root)})

    # ── Print raw output ──────────────────────────────────────────────────
    print(f"\nAgent Output:")
    print(json.dumps(result, indent=2))

    # ── Schema validation ─────────────────────────────────────────────────
    violations = validate_schema(result)
    if violations:
        print(f"\n  ✗ SCHEMA VIOLATIONS:")
        for v in violations:
            print(f"    - {v}")
    else:
        print(f"\n  ✓ Schema: VALID (canonical structure confirmed)")

    # ── Gemini call assertion ─────────────────────────────────────────────
    gemini_was_called = len(_gemini_calls) > 0
    if expect_gemini_call:
        if gemini_was_called:
            print(f"  ✓ Gemini: Called (1 call, prompt ~{_gemini_calls[0]['prompt_length']} chars)")
        else:
            print(f"  ✗ Gemini: Expected a call but NONE was made")
    else:
        if not gemini_was_called:
            print(f"  ✓ Gemini: NOT called (correct — no README present)")
        else:
            print(f"  ✗ Gemini: Was called but should NOT have been (no README)")

    # ── Score expectations ────────────────────────────────────────────────
    score = result.get("score", -1)
    if not expect_gemini_call:
        if score == 0:
            print(f"  ✓ Score : 0 (correct for missing README)")
        else:
            print(f"  ✗ Score : Expected 0, got {score}")
    else:
        if score > 0:
            print(f"  ✓ Score : {score}/100 (non-zero — Gemini evaluated README)")
        else:
            print(f"  ⚠ Score : {score}/100 (Gemini returned 0 or failed — check errors: {result.get('errors')})")

    print()


# ── Main ─────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    print("\nPhase 8 — Documentation Agent Isolated Tests")
    print("=" * 60)

    # Test 1: real_project.zip (should have README → Gemini called)
    run_test(
        label="real_project.zip  (README present → Gemini should be called)",
        zip_name="real_project.zip",
        expect_gemini_call=True,
    )

    # Test 2: bad_project.zip (no README → Gemini must NOT be called)
    run_test(
        label="bad_project.zip  (no README → Gemini must NOT be called)",
        zip_name="bad_project.zip",
        expect_gemini_call=False,
    )

    print("\n" + "=" * 60)
    print("Phase 8 Documentation Agent tests complete.")
    print("=" * 60)
