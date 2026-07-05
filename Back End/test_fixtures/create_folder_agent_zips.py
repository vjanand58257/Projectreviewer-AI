"""
Creates two test project zips for the Folder Agent tests:

1. good_project.zip — a well-structured project with README, tests, CI/CD, Docker,
   frontend, backend, database layer, .gitignore, LICENSE, and assets.

2. bad_project.zip — a minimal project missing README, tests, LICENSE, CI/CD,
   database layer, and Docker — just enough to have some frontend code.
"""
import zipfile
from pathlib import Path

FIXTURES_DIR = Path(__file__).resolve().parent

# ---------------------------------------------------------------------------
# 1. good_project.zip — should score close to 100
# ---------------------------------------------------------------------------

good_files = {
    # Root essentials
    "README.md":                         "# Good Project\n\nA fully structured project.\n",
    "LICENSE":                           "MIT License\n\nCopyright 2026 ...",
    ".gitignore":                        "__pycache__/\n.env\nnode_modules/\ndist/\n",

    # Frontend
    "frontend/package.json":             '{"name":"frontend","version":"1.0.0"}',
    "frontend/src/App.jsx":              "export default function App() { return <div/> }",
    "frontend/src/index.js":             "import React from 'react';",
    "frontend/public/logo.svg":          "<svg/>",
    "frontend/assets/bg.png":            "\x89PNG\r\n\x1a\n",  # PNG header bytes

    # Backend
    "backend/requirements.txt":          "flask==3.0.3\npython-dotenv==1.0.1\n",
    "backend/app.py":                    "from flask import Flask\napp = Flask(__name__)\n",
    "backend/models.py":                 "from flask_sqlalchemy import SQLAlchemy\ndb = SQLAlchemy()\n",

    # Database
    "backend/migrations/001_init.sql":   "CREATE TABLE users (id INTEGER PRIMARY KEY);",

    # Tests
    "tests/test_app.py":                 "def test_health(): assert True",
    "tests/__init__.py":                 "",

    # Docker
    "Dockerfile":                        "FROM python:3.11\nCOPY . /app\n",
    "docker-compose.yml":                (
        "version: '3'\nservices:\n"
        "  app:\n    build: .\n"
        "  postgres:\n    image: postgres:15\n"
    ),

    # CI/CD
    ".github/workflows/ci.yml":          (
        "name: CI\non: [push]\njobs:\n  test:\n    runs-on: ubuntu-latest\n"
    ),
}

good_zip_path = FIXTURES_DIR / "good_project.zip"
with zipfile.ZipFile(good_zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
    for path, content in good_files.items():
        if isinstance(content, str):
            zf.writestr(path, content)
        else:
            zf.writestr(path, content)

print(f"Created: {good_zip_path}  ({len(good_files)} entries)")

# ---------------------------------------------------------------------------
# 2. bad_project.zip — should score low
#    Missing: README, tests, LICENSE, CI/CD, database, Docker
#    Has: frontend src files, no .gitignore either
# ---------------------------------------------------------------------------

bad_files = {
    "src/index.html":        "<!DOCTYPE html><html><body><h1>Hello</h1></body></html>",
    "src/app.js":            "console.log('hello');",
    "src/styles.css":        "body { color: red; }",
}

bad_zip_path = FIXTURES_DIR / "bad_project.zip"
with zipfile.ZipFile(bad_zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
    for path, content in bad_files.items():
        zf.writestr(path, content)

print(f"Created: {bad_zip_path}  ({len(bad_files)} entries)")
print()
print("Expected results:")
print("  good_project.zip -> score = 100  (all 10 checks pass)")
print("  bad_project.zip  -> score =  26  (frontend=10 + gitignore=0 + frontend-assets via src/=8? actually frontend dir counts)")
print("  (actual scores will be printed by test_folder_agent.py)")
