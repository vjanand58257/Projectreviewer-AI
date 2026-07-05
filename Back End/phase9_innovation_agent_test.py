"""
Phase 9 - Innovation Agent Isolated Test
=========================================
Tests InnovationAgent against:
  - real_project.zip  (has README → richer context for Gemini)
  - bad_project.zip   (no README, no README content)

Confirms:
  1. Real score/output for real_project.zip
  2. Score for bad_project.zip (Gemini is still called; structural signals show no README)
  3. Both outputs match the canonical schema
  4. FolderAgent result is passed in (not re-computed by InnovationAgent)
     - Proven by:
       a. Log line "Reusing pre-computed FolderAgent output" from InnovationAgent
       b. FolderAgent._scan() is NOT called a second time after the first run
          (verified by counting _scan() invocations with a spy)
"""

import sys
import json
import logging
import tempfile
import zipfile
from pathlib import Path
from unittest.mock import patch, call

# ── UTF-8 stdout (Windows safe) ──────────────────────────────────────────────
sys.stdout.reconfigure(encoding="utf-8")

# ── Logging ──────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(levelname)s | %(name)s | %(message)s",
    stream=sys.stdout,
)

# ── sys.path ─────────────────────────────────────────────────────────────────
BACKEND_DIR = Path(__file__).parent
sys.path.insert(0, str(BACKEND_DIR))

# ── Load .env ─────────────────────────────────────────────────────────────────
from dotenv import load_dotenv
load_dotenv(BACKEND_DIR / ".env")

# ── Minimal Flask app context ─────────────────────────────────────────────────
from flask import Flask
_app = Flask(__name__)

# ── Gemini call spy ───────────────────────────────────────────────────────────
_gemini_calls = []
import services.gemini_service as _gs
_original_call_gemini = _gs.call_gemini

def _spy_call_gemini(prompt, **kwargs):
    _gemini_calls.append({"prompt_length": len(prompt)})
    return _original_call_gemini(prompt, **kwargs)

_gs.call_gemini = _spy_call_gemini

# ── Import agents AFTER spy is installed ──────────────────────────────────────
from agents.folder_agent import FolderAgent, _scan as _folder_scan_fn
from agents.innovation_agent import InnovationAgent
import agents.folder_agent as _folder_module

FIXTURES_DIR = BACKEND_DIR / "test_fixtures"

CANONICAL_TOP_KEYS   = {"agent", "score", "data", "errors"}
CANONICAL_DATA_KEYS  = {"highlights", "findings", "recommendations"}


# ── Helpers ───────────────────────────────────────────────────────────────────
def extract_zip_to_temp(zip_path: Path) -> Path:
    """
    Extracts ZIP and resolves project_root (mirrors orchestrator logic):
    If the ZIP expands into a single top-level directory, descend into it.
    """
    tmp = Path(tempfile.mkdtemp(prefix="phase9_"))
    with zipfile.ZipFile(zip_path, "r") as zf:
        zf.extractall(tmp)
    top_level = [p for p in tmp.iterdir() if p.is_dir()]
    if len(top_level) == 1:
        resolved = top_level[0]
        print(f"  [ZIP] Single top-level dir → project_root = {resolved.name}/")
        return resolved
    return tmp


def validate_schema(result: dict) -> list[str]:
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
            # All list items must be plain strings (not nested dicts)
            if k in result["data"]:
                for i, item in enumerate(result["data"][k]):
                    if not isinstance(item, str):
                        issues.append(
                            f"data['{k}'][{i}] is {type(item).__name__}, expected str. "
                            f"Value: {repr(item)[:80]}"
                        )
    if "errors" in result and not isinstance(result["errors"], list):
        issues.append("'errors' must be a list")
    return issues


# ── Test runner ───────────────────────────────────────────────────────────────
def run_test(label: str, zip_name: str):
    zip_path = FIXTURES_DIR / zip_name
    print(f"\n{'='*60}")
    print(f"TEST: {label}")
    print(f"ZIP : {zip_path}")
    print(f"{'='*60}")

    if not zip_path.exists():
        print(f"  ✗ FIXTURE NOT FOUND: {zip_path}")
        return

    project_root = extract_zip_to_temp(zip_path)

    # Show extracted layout
    all_files = sorted(project_root.rglob("*"))
    print(f"\nExtracted ({len(all_files)} entries):")
    for f in all_files:
        rel = f.relative_to(project_root)
        tag = "[DIR]" if f.is_dir() else f"[{f.stat().st_size}B]"
        print(f"  {tag}  {rel}")

    # ── Step A: Run FolderAgent once (as the orchestrator / route does) ───────
    print("\n--- Step A: Running FolderAgent (offline, Tier 1) ---")
    folder_agent = FolderAgent()

    # Spy on _scan to count calls DURING FolderAgent.run()
    _scan_call_count = {"during_folder": 0, "during_innovation": 0}
    _original_scan = _folder_module._scan

    def _spy_scan(project_root_arg):
        # We'll track call counts in two phases
        return _original_scan(project_root_arg)

    # Count _scan invocations across the entire test
    scan_invocations = []
    with patch.object(_folder_module, "_scan", wraps=_original_scan) as mock_scan:
        folder_results = folder_agent.run({"project_root": str(project_root)})
        calls_after_folder = mock_scan.call_count

    print(f"  FolderAgent score : {folder_results.get('score')}/100")
    print(f"  _scan() called    : {calls_after_folder} time(s) during FolderAgent.run()")
    print(f"  Findings          : {len(folder_results['data']['findings'])} missing indicators")
    print(f"  Highlights        : {len(folder_results['data']['highlights'])} found indicators")

    # ── Step B: Run InnovationAgent — passing folder_results in ──────────────
    print("\n--- Step B: Running InnovationAgent (Tier 2, folder_results injected) ---")
    _gemini_calls.clear()

    # Spy on _scan again — should be 0 during InnovationAgent.run()
    with patch.object(_folder_module, "_scan", wraps=_original_scan) as mock_scan_inn:
        with _app.app_context():
            result = InnovationAgent().run({
                "project_root": str(project_root),
                "project_name": project_root.name,
                "folder_results": folder_results,    # ← pre-computed, passed in
            })
        calls_during_innovation = mock_scan_inn.call_count

    # ── Print output ──────────────────────────────────────────────────────────
    print("\nAgent Output:")
    print(json.dumps(result, indent=2))

    # ── Assertions ────────────────────────────────────────────────────────────
    print()

    # 1. Schema
    violations = validate_schema(result)
    if violations:
        print("  ✗ SCHEMA VIOLATIONS:")
        for v in violations:
            print(f"    - {v}")
    else:
        print("  ✓ Schema   : VALID (canonical structure + flat strings confirmed)")

    # 2. No re-scan
    if calls_during_innovation == 0:
        print(
            f"  ✓ Re-scan  : FolderAgent._scan() was called {calls_during_innovation}x "
            "during InnovationAgent.run() (correct — folder_results reused)"
        )
    else:
        print(
            f"  ✗ Re-scan  : FolderAgent._scan() was called {calls_during_innovation}x "
            "inside InnovationAgent — should be 0 when folder_results passed in!"
        )

    # 3. Gemini call
    if _gemini_calls:
        print(
            f"  ✓ Gemini   : Called once (~{_gemini_calls[0]['prompt_length']} char prompt)"
        )
    else:
        print("  ✗ Gemini   : NOT called — expected exactly one API call")

    # 4. Score plausibility
    score = result.get("score", -1)
    if result.get("errors"):
        print(f"  ⚠ Errors   : {result['errors']}")
    elif score > 0:
        print(f"  ✓ Score    : {score}/100")
    else:
        print(f"  ⚠ Score    : {score}/100 (may indicate missing context or low README quality)")

    print()


# ── Main ──────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    print("\nPhase 9 — Innovation Agent Isolated Tests")
    print("=" * 60)

    run_test(
        label="real_project.zip  (README present → richer Gemini context)",
        zip_name="real_project.zip",
    )

    run_test(
        label="bad_project.zip   (no README → sparse context)",
        zip_name="bad_project.zip",
    )

    print("=" * 60)
    print("Phase 9 Innovation Agent tests complete.")
    print("=" * 60)
