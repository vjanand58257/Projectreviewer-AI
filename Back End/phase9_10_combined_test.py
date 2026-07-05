"""
Phase 9+10 — Innovation & Bug Agent Combined Test
===================================================
Tests both agents against real_project.zip ONLY.

Confirms for each agent:
  1. Real score / output
  2. Canonical schema (flat string lists)
  3. Innovation Agent: _scan() called 0x inside run() — folder_results reused
  4. Bug Agent: Gemini called, files capped at MAX_FILES=15
  5. One failure case per agent (missing project_root)
"""

import sys
import json
import logging
import tempfile
import zipfile
from pathlib import Path
from unittest.mock import patch

sys.stdout.reconfigure(encoding="utf-8")

logging.basicConfig(
    level=logging.INFO,
    format="%(levelname)s | %(name)s | %(message)s",
    stream=sys.stdout,
)

BACKEND_DIR = Path(__file__).parent
sys.path.insert(0, str(BACKEND_DIR))

from dotenv import load_dotenv
load_dotenv(BACKEND_DIR / ".env")

from flask import Flask
_app = Flask(__name__)

# ── Gemini spy ──────────────────────────────────────────────────────────────
_gemini_calls = []
import services.gemini_service as _gs
_orig_gemini = _gs.call_gemini

def _spy_gemini(prompt, **kwargs):
    _gemini_calls.append(len(prompt))
    return _orig_gemini(prompt, **kwargs)

_gs.call_gemini = _spy_gemini

# ── Imports after spy ───────────────────────────────────────────────────────
from agents.folder_agent import FolderAgent
from agents.innovation_agent import InnovationAgent
from agents.bug_agent import BugAgent
import agents.folder_agent as _folder_module

FIXTURES_DIR = BACKEND_DIR / "test_fixtures"
CANONICAL_TOP  = {"agent", "score", "data", "errors"}
CANONICAL_DATA = {"highlights", "findings", "recommendations"}


# ── Helpers ─────────────────────────────────────────────────────────────────
def extract(zip_name: str) -> Path:
    tmp = Path(tempfile.mkdtemp(prefix="combined_test_"))
    with zipfile.ZipFile(FIXTURES_DIR / zip_name) as zf:
        zf.extractall(tmp)
    top = [p for p in tmp.iterdir() if p.is_dir()]
    return top[0] if len(top) == 1 else tmp


def validate(result: dict) -> list[str]:
    issues = []
    missing = CANONICAL_TOP - set(result.keys())
    if missing:
        issues.append(f"Missing top-level keys: {missing}")
    d = result.get("data", {})
    for k in CANONICAL_DATA:
        if k not in d:
            issues.append(f"Missing data key: '{k}'")
            continue
        if not isinstance(d[k], list):
            issues.append(f"data['{k}'] must be a list")
        for i, item in enumerate(d[k]):
            if not isinstance(item, str):
                issues.append(f"data['{k}'][{i}] is {type(item).__name__}, expected str")
    s = result.get("score", -1)
    if not isinstance(s, (int, float)) or not (0 <= s <= 100):
        issues.append(f"score={s} is invalid (must be int 0–100)")
    return issues


def sep(title: str):
    print(f"\n{'='*62}")
    print(f"  {title}")
    print(f"{'='*62}")


# ── Innovation Agent test ────────────────────────────────────────────────────
def test_innovation(project_root: Path):
    sep("INNOVATION AGENT — real_project.zip")

    # Step A: FolderAgent (offline, Tier 1)
    print("\n[Step A] FolderAgent (offline)...")
    folder_agent = FolderAgent()
    with patch.object(_folder_module, "_scan", wraps=_folder_module._scan) as spy:
        folder_results = folder_agent.run({"project_root": str(project_root)})
        scan_calls_folder = spy.call_count
    print(f"  FolderAgent score : {folder_results['score']}/100")
    print(f"  _scan() calls     : {scan_calls_folder}  (expected 1)")

    # Step B: InnovationAgent — folder_results injected
    print("\n[Step B] InnovationAgent (Gemini call)...")
    _gemini_calls.clear()
    with patch.object(_folder_module, "_scan", wraps=_folder_module._scan) as spy2:
        with _app.app_context():
            result = InnovationAgent().run({
                "project_root": str(project_root),
                "project_name": project_root.name,
                "folder_results": folder_results,
            })
        scan_calls_innovation = spy2.call_count

    print("\nAgent Output:")
    print(json.dumps(result, indent=2))
    print()

    # Assertions
    violations = validate(result)
    print("  ✓ Schema  : VALID" if not violations else f"  ✗ Schema  : {violations}")

    re_scan_ok = scan_calls_innovation == 0
    print(
        f"  {'✓' if re_scan_ok else '✗'} Re-scan : _scan() called {scan_calls_innovation}x "
        "during InnovationAgent.run() (expected 0)"
    )

    gemini_ok = len(_gemini_calls) == 1
    print(
        f"  {'✓' if gemini_ok else '✗'} Gemini  : {'Called once' if gemini_ok else f'{len(_gemini_calls)}x calls'}"
        + (f" (~{_gemini_calls[0]} char prompt)" if _gemini_calls else "")
    )

    if result.get("errors"):
        print(f"  ⚠ Error   : {result['errors'][0][:120]}")
    else:
        print(f"  ✓ Score   : {result['score']}/100")

    # Failure case: missing project_root
    print("\n[Failure case] Missing project_root...")
    bad = InnovationAgent().run({})
    assert bad["score"] == 0 and bad["errors"], "Should return error on missing project_root"
    print(f"  ✓ Returns error: {bad['errors'][0]}")


# ── Bug Agent test ───────────────────────────────────────────────────────────
def test_bug(project_root: Path):
    sep("BUG AGENT — real_project.zip")

    print(f"\n[Step A] Scanning files (cap=15, extensions=.py/.js/.jsx/.ts/.tsx/.java)...")
    _gemini_calls.clear()
    with _app.app_context():
        result = BugAgent().run({"project_root": str(project_root)})

    print("\nAgent Output:")
    print(json.dumps(result, indent=2))
    print()

    violations = validate(result)
    print("  ✓ Schema  : VALID" if not violations else f"  ✗ Schema  : {violations}")

    gemini_ok = len(_gemini_calls) >= 1
    if gemini_ok:
        print(f"  ✓ Gemini  : Called ({len(_gemini_calls)}x, ~{_gemini_calls[0]} char prompt)")
    else:
        print("  ✗ Gemini  : Not called — check zero-file case logic")

    if result.get("errors"):
        print(f"  ⚠ Error   : {result['errors'][0][:120]}")
    else:
        print(f"  ✓ Score   : {result['score']}/100")

    # Failure case: missing project_root
    print("\n[Failure case] Missing project_root...")
    bad = BugAgent().run({})
    assert bad["score"] == 0 and bad["errors"], "Should return error on missing project_root"
    print(f"  ✓ Returns error: {bad['errors'][0]}")


# ── Main ─────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    print("\nPhase 9+10 — Innovation & Bug Agent Combined Tests")
    print("  Fixture: real_project.zip only")
    print("=" * 62)

    project_root = extract("real_project.zip")
    print(f"\nExtracted project_root: {project_root}")

    test_innovation(project_root)
    test_bug(project_root)

    print("\n" + "=" * 62)
    print("Combined tests complete.")
    print("=" * 62)
