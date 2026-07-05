"""
Creates two test zip fixtures in the test_fixtures/ directory:

1. real_project.zip — a small mock project with backend/, frontend/, README.md,
   and multiple source files to exercise language detection and structure preservation.

2. zipslip_attack.zip — a crafted archive whose entries use "../.." to attempt
   path traversal outside the extraction directory.
"""
import zipfile
import io
from pathlib import Path

FIXTURES_DIR = Path(__file__).resolve().parent

# ---------------------------------------------------------------------------
# 1. Build real_project.zip
# ---------------------------------------------------------------------------
real_zip_path = FIXTURES_DIR / "real_project.zip"

real_files = {
    # Wrapper folder "myproject/" — should be unwrapped automatically
    "myproject/README.md":              "# My Project\n\nA demo project.\n",
    "myproject/backend/__init__.py":    "",
    "myproject/backend/app.py":         "from flask import Flask\napp = Flask(__name__)\n",
    "myproject/backend/models.py":      "class User:\n    pass\n",
    "myproject/backend/utils.py":       "def helper(): pass\n",
    "myproject/frontend/index.html":    "<!DOCTYPE html><html><body></body></html>",
    "myproject/frontend/main.jsx":      "import React from 'react';\nexport default function App() {}",
    "myproject/frontend/styles.css":    "body { margin: 0; }",
    "myproject/frontend/index.ts":      "const x: number = 42;",
    # Junk that should be filtered
    "myproject/__MACOSX/._README.md":   "junk",
    "myproject/.DS_Store":              "\x00junk",
}

with zipfile.ZipFile(real_zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
    # Add the wrapper dir entry first
    zf.mkdir("myproject/")
    for path, content in real_files.items():
        zf.writestr(path, content)

print(f"Created: {real_zip_path}")
print(f"  Entries: {list(real_files.keys())}")

# ---------------------------------------------------------------------------
# 2. Build zipslip_attack.zip
# ---------------------------------------------------------------------------
slip_zip_path = FIXTURES_DIR / "zipslip_attack.zip"

with zipfile.ZipFile(slip_zip_path, "w") as zf:
    # A benign entry first
    zf.writestr("legit.txt", "This is fine.\n")
    # Path traversal attempt — goes two directories up and writes "evil.txt"
    # zipfile won't normalise this on write, it stores the raw name
    evil_info = zipfile.ZipInfo("../../evil.txt")
    zf.writestr(evil_info, "PWNED — this should never be written outside extracted/\n")
    # Another traversal using an absolute path variant
    abs_info = zipfile.ZipInfo("/tmp/absolute_evil.txt")
    zf.writestr(abs_info, "absolute path traversal\n")

print(f"Created: {slip_zip_path}")
print(f"  Entries: {[m.filename for m in zipfile.ZipFile(slip_zip_path).infolist()]}")
