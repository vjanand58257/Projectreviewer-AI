from flask import Blueprint, jsonify, current_app
from pathlib import Path
import logging

from agents.folder_agent import FolderAgent
from agents.documentation_agent import DocumentationAgent
from agents.innovation_agent import InnovationAgent
from agents.bug_agent import BugAgent
from agents.security_agent import SecurityAgent
from agents.presentation_agent import PresentationAgent
from agents.interview_agent import InterviewAgent

from agents.folder_agent import FolderAgent
from agents.documentation_agent import DocumentationAgent
from agents.innovation_agent import InnovationAgent
from agents.bug_agent import BugAgent
from agents.security_agent import SecurityAgent
from agents.presentation_agent import PresentationAgent
from agents.interview_agent import InterviewAgent
from services.orchestrator import Orchestrator

logger = logging.getLogger(__name__)

analyze_bp = Blueprint("analyze", __name__, url_prefix="/api/analyze")

@analyze_bp.route("/all/<project_id>", methods=["POST"])
def analyze_all(project_id: str):
    """
    Run all 8 agents via the Orchestrator and return the combined report.
    """
    base_dir = Path(current_app.config["BASE_DIR"])
    project_root = base_dir / "extracted" / project_id

    if not project_root.is_dir():
        return jsonify({
            "success": False,
            "error": f"No extracted project found for project_id '{project_id}'."
        }), 404

    try:
        report = Orchestrator.run_all(project_id, project_root, project_root.name)
        return jsonify(report), 200
    except Exception as e:
        logger.error(f"Orchestration failed for {project_id}: {e}", exc_info=True)
        return jsonify({"success": False, "error": str(e)}), 500

@analyze_bp.route("/status/<project_id>", methods=["GET"])
def get_status(project_id: str):
    """
    Return the current status of the orchestrator run for the project.
    """
    return jsonify(Orchestrator.get_status(project_id)), 200

@analyze_bp.route("/folder/<project_id>", methods=["POST"])
def analyze_folder(project_id: str):
    """
    Run the Folder Analyzer Agent against an already-extracted project.
    The project must have been extracted via POST /api/extract/<project_id> first.
    """
    base_dir = Path(current_app.config["BASE_DIR"])
    project_root = base_dir / "extracted" / project_id

    logger.info(f"Folder analysis requested for project: {project_id}")

    if not project_root.is_dir():
        logger.error(f"Extracted directory not found: {project_root}")
        return jsonify({
            "success": False,
            "error": f"No extracted project found for project_id '{project_id}'. "
                     "Run /api/extract/<project_id> first."
        }), 404

    try:
        agent = FolderAgent()
        result = agent.run({"project_root": str(project_root)})

        return jsonify({
            "success": True,
            "project_id": project_id,
            **result
        }), 200

    except Exception as e:
        logger.error(f"FolderAgent failed for {project_id}: {e}", exc_info=True)
        return jsonify({
            "success": False,
            "error": f"Folder analysis failed: {e}"
        }), 500


@analyze_bp.route("/documentation/<project_id>", methods=["POST"])
def analyze_documentation(project_id: str):
    """
    Run the Documentation Analyzer Agent against an already-extracted project.
    """
    base_dir = Path(current_app.config["BASE_DIR"])
    project_root = base_dir / "extracted" / project_id

    logger.info(f"Documentation analysis requested for project: {project_id}")

    if not project_root.is_dir():
        logger.error(f"Extracted directory not found: {project_root}")
        return jsonify({
            "success": False,
            "error": f"No extracted project found for project_id '{project_id}'. "
                     "Run /api/extract/<project_id> first."
        }), 404

    try:
        agent = DocumentationAgent()
        result = agent.run({"project_root": str(project_root)})

        return jsonify({
            "success": True,
            "project_id": project_id,
            **result
        }), 200

    except Exception as e:
        logger.error(f"DocumentationAgent failed for {project_id}: {e}", exc_info=True)
        return jsonify({
            "success": False,
            "error": f"Documentation analysis failed: {e}"
        }), 500


@analyze_bp.route("/innovation/<project_id>", methods=["POST"])
def analyze_innovation(project_id: str):
    """
    Run the Innovation Agent against an already-extracted project.

    Pipeline (mirrors the orchestrator's Tier 1 → Tier 2 pattern):
      1. FolderAgent runs offline (no Gemini call) to produce structural signals.
      2. Its canonical output is passed directly into InnovationAgent as
         `folder_results` — no second filesystem scan is performed.

    The project must have been extracted via POST /api/extract/<project_id> first.
    """
    base_dir = Path(current_app.config["BASE_DIR"])
    project_root = base_dir / "extracted" / project_id

    logger.info(f"Innovation analysis requested for project: {project_id}")

    if not project_root.is_dir():
        logger.error(f"Extracted directory not found: {project_root}")
        return jsonify({
            "success": False,
            "error": (
                f"No extracted project found for project_id '{project_id}'. "
                "Run /api/extract/<project_id> first."
            )
        }), 404

    try:
        # ── Step 1: Folder Agent (offline, Tier 1) ────────────────────────────
        logger.info(f"[innovation route] Running FolderAgent (offline) for: {project_id}")
        folder_agent = FolderAgent()
        folder_results = folder_agent.run({"project_root": str(project_root)})
        logger.info(
            f"[innovation route] FolderAgent complete. Score={folder_results.get('score')}/100. "
            "Passing result to InnovationAgent — no re-scan."
        )

        # Derive project name from the directory name (same convention as orchestrator)
        project_name = project_root.name

        # ── Step 2: Innovation Agent (Tier 2, consumes folder_results) ─────────
        agent = InnovationAgent()
        result = agent.run({
            "project_root": str(project_root),
            "project_name": project_name,
            "folder_results": folder_results,      # pre-computed; no re-scan inside agent
            # readme_content intentionally omitted → agent reads it once if present
        })

        return jsonify({
            "success": True,
            "project_id": project_id,
            "folder_score": folder_results.get("score"),   # expose so caller can see signals
            **result
        }), 200

    except Exception as e:
        logger.error(f"InnovationAgent failed for {project_id}: {e}", exc_info=True)
        return jsonify({
            "success": False,
            "error": f"Innovation analysis failed: {e}"
        }), 500


@analyze_bp.route("/bug/<project_id>", methods=["POST"])
def analyze_bug(project_id: str):
    """
    Run the Bug Finder Agent against an already-extracted project.

    Scans .py/.js/.jsx/.ts/.tsx/.java files (capped at 15 files, 35 000 chars).
    Returns score 100 without calling Gemini if no analysable files are found.
    """
    base_dir = Path(current_app.config["BASE_DIR"])
    project_root = base_dir / "extracted" / project_id

    logger.info(f"Bug analysis requested for project: {project_id}")

    if not project_root.is_dir():
        logger.error(f"Extracted directory not found: {project_root}")
        return jsonify({
            "success": False,
            "error": (
                f"No extracted project found for project_id '{project_id}'. "
                "Run /api/extract/<project_id> first."
            )
        }), 404

    try:
        agent = BugAgent()
        result = agent.run({"project_root": str(project_root)})

        return jsonify({
            "success": True,
            "project_id": project_id,
            **result
        }), 200

    except Exception as e:
        logger.error(f"BugAgent failed for {project_id}: {e}", exc_info=True)
        return jsonify({
            "success": False,
            "error": f"Bug analysis failed: {e}"
        }), 500


@analyze_bp.route("/security/<project_id>", methods=["POST"])
def analyze_security(project_id: str):
    """
    Run the Security Agent against an already-extracted project.
    Scans .py/.js/.jsx/.ts/.tsx/.java files (cap=15, 35 000 chars).
    Explicitly excludes .env.example-style files to prevent false positives.
    """
    base_dir = Path(current_app.config["BASE_DIR"])
    project_root = base_dir / "extracted" / project_id

    logger.info(f"Security analysis requested for project: {project_id}")

    if not project_root.is_dir():
        return jsonify({
            "success": False,
            "error": f"No extracted project found for project_id '{project_id}'."
        }), 404

    try:
        agent = SecurityAgent()
        result = agent.run({"project_root": str(project_root)})
        return jsonify({"success": True, "project_id": project_id, **result}), 200
    except Exception as e:
        logger.error(f"SecurityAgent failed for {project_id}: {e}", exc_info=True)
        return jsonify({"success": False, "error": f"Security analysis failed: {e}"}), 500


@analyze_bp.route("/presentation/<project_id>", methods=["POST"])
def analyze_presentation(project_id: str):
    """
    Run the Presentation Agent against an already-extracted project.
    Pipeline:
      1. FolderAgent runs offline (no Gemini) to produce structural signals.
      2. Result injected into PresentationAgent — no second filesystem scan.
    """
    base_dir = Path(current_app.config["BASE_DIR"])
    project_root = base_dir / "extracted" / project_id

    logger.info(f"Presentation analysis requested for project: {project_id}")

    if not project_root.is_dir():
        return jsonify({
            "success": False,
            "error": f"No extracted project found for project_id '{project_id}'."
        }), 404

    try:
        # Step 1: FolderAgent (offline, Tier 1)
        logger.info(f"[presentation route] Running FolderAgent (offline) for: {project_id}")
        folder_results = FolderAgent().run({"project_root": str(project_root)})
        logger.info(
            f"[presentation route] FolderAgent done (score={folder_results.get('score')}/100). "
            "Passing to PresentationAgent — no re-scan."
        )

        # Step 2: PresentationAgent (consumes folder_results)
        result = PresentationAgent().run({
            "project_root": str(project_root),
            "project_name": project_root.name,
            "folder_results": folder_results,
        })
        return jsonify({
            "success": True,
            "project_id": project_id,
            "folder_score": folder_results.get("score"),
            **result
        }), 200
    except Exception as e:
        logger.error(f"PresentationAgent failed for {project_id}: {e}", exc_info=True)
        return jsonify({"success": False, "error": f"Presentation analysis failed: {e}"}), 500


@analyze_bp.route("/interview/<project_id>", methods=["POST"])
def analyze_interview(project_id: str):
    """
    Run the Interview Agent against an already-extracted project.
    Pipeline:
      1. FolderAgent runs offline (no Gemini) to produce structural signals.
      2. Result injected into InterviewAgent — no second filesystem scan.
    """
    base_dir = Path(current_app.config["BASE_DIR"])
    project_root = base_dir / "extracted" / project_id

    logger.info(f"Interview analysis requested for project: {project_id}")

    if not project_root.is_dir():
        return jsonify({
            "success": False,
            "error": f"No extracted project found for project_id '{project_id}'."
        }), 404

    try:
        # Step 1: FolderAgent (offline, Tier 1)
        logger.info(f"[interview route] Running FolderAgent (offline) for: {project_id}")
        folder_results = FolderAgent().run({"project_root": str(project_root)})
        
        # Step 2: InterviewAgent (consumes folder_results)
        result = InterviewAgent().run({
            "project_root": str(project_root),
            "project_name": project_root.name,
            "folder_results": folder_results,
        })
        return jsonify({
            "success": True,
            "project_id": project_id,
            "folder_score": folder_results.get("score"),
            **result
        }), 200
    except Exception as e:
        logger.error(f"InterviewAgent failed for {project_id}: {e}", exc_info=True)
        return jsonify({"success": False, "error": f"Interview analysis failed: {e}"}), 500
