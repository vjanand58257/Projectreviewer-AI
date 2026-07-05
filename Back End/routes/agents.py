from flask import Blueprint, jsonify, request, current_app
import logging
import threading
import json
from agents.registry import AGENT_REGISTRY
from orchestrator import Orchestrator, get_analysis_status
from database import list_reports as db_list_reports, get_report as db_get_report

logger = logging.getLogger(__name__)

agents_bp = Blueprint("agents", __name__, url_prefix="/api")

@agents_bp.route("/status/<project_id>", methods=["GET"])
def get_status(project_id):
    logger.info(f"Checking status for project: {project_id}")
    
    # 1. Check in-memory active analyses first
    status_data = get_analysis_status(project_id)
    if status_data:
        return jsonify(status_data), 200

    # 2. Check if a report exists in the database
    # We need to query reports by project_id
    from database import get_db_connection
    try:
        conn = get_db_connection()
        row = conn.execute(
            "SELECT results FROM reports WHERE project_id = ? ORDER BY created_at DESC LIMIT 1",
            (project_id,)
        ).fetchone()
        conn.close()
        
        if row:
            report_data = json.loads(row["results"])
            # Format report to match status shape
            return jsonify({
                "project_id": project_id,
                "analysis_id": report_data.get("analysis_id"),
                "status": "completed",
                "progress_percentage": 100,
                "agents": {
                    name: {"status": "completed"} for name in report_data.get("results", {}).keys()
                }
            }), 200
    except Exception as e:
        logger.error(f"Error querying database for status: {e}")

    # 3. Default to pending if not found anywhere
    return jsonify({
        "project_id": project_id,
        "status": "pending",
        "progress_percentage": 0,
        "agents": {name: {"status": "pending"} for name in AGENT_REGISTRY.keys()}
    }), 200

@agents_bp.route("/analyze", methods=["POST"])
def analyze_project():
    data = request.get_json() or {}
    project_id = data.get("project_id")
    agents_override = data.get("agents_override")  # Optional override array
    
    if not project_id:
        logger.error("Analyze request failed: Missing 'project_id' in body.")
        return jsonify({"success": False, "error": "Missing 'project_id' in request body."}), 400

    logger.info(f"Triggering background analysis orchestration for project: {project_id}")

    try:
        orchestrator = Orchestrator(project_id, agents_override)
        
        # Start analysis in a background thread to prevent gateway timeout
        flask_app = current_app._get_current_object()
        
        def run_orchestrated_analysis():
            with flask_app.app_context():
                try:
                    orchestrator.execute_analysis()
                except Exception as e:
                    logger.error(f"Background analysis failed for project {project_id}: {e}", exc_info=True)
        
        thread = threading.Thread(target=run_orchestrated_analysis)
        thread.daemon = True
        thread.start()

        return jsonify({
            "success": True,
            "project_id": project_id,
            "analysis_id": orchestrator.analysis_id,
            "status": "pending"
        }), 202

    except Exception as e:
        logger.error(f"Failed to start analysis for {project_id}: {e}", exc_info=True)
        return jsonify({"success": False, "error": f"Failed to initiate analysis: {e}"}), 500

@agents_bp.route("/analyze/<agent_name>", methods=["POST"])
def analyze_single_agent(agent_name):
    """
    Synchronously runs a single agent based on POST request body:
    { "project_id": "..." }

    For agents that consume FolderAgent output (e.g. innovation), the FolderAgent
    is run first (offline, no Gemini call) and its result is injected as
    `folder_results` into the code_context — no duplicate filesystem scan.
    """
    data = request.get_json() or {}
    project_id = data.get("project_id")

    if not project_id:
        return jsonify({"success": False, "error": "Missing 'project_id' in request body."}), 400

    logger.info(f"Request to run single agent analysis: {agent_name} for project: {project_id}")
    if agent_name not in AGENT_REGISTRY:
        logger.error(f"Agent name '{agent_name}' not found in registry.")
        return jsonify({"success": False, "error": f"Agent '{agent_name}' not found."}), 404

    try:
        from pathlib import Path
        base_dir = Path(current_app.config["BASE_DIR"])
        project_root = base_dir / "extracted" / project_id

        if not project_root.is_dir():
            return jsonify({"success": False, "error": f"Extracted directory not found for project '{project_id}'."}), 404

        # Base context shared by all agents
        code_context = {"project_root": str(project_root)}

        # For agents that consume pre-computed folder signals, run FolderAgent once
        # (offline — zero API calls) and inject the result. This prevents InnovationAgent
        # and any future Tier-2 agents from needing to re-scan the filesystem.
        FOLDER_AWARE_AGENTS = {"innovation", "bug", "security", "presentation", "interview", "improvement"}
        if agent_name in FOLDER_AWARE_AGENTS:
            from agents.folder_agent import FolderAgent as _FA
            logger.info(f"[single-agent route] Pre-running FolderAgent (offline) for '{agent_name}'.")
            folder_results = _FA().run({"project_root": str(project_root)})
            code_context["folder_results"] = folder_results
            logger.info(
                f"[single-agent route] FolderAgent done (score={folder_results.get('score')}/100). "
                f"Passing result to '{agent_name}' — no re-scan inside agent."
            )

        agent_cls = AGENT_REGISTRY[agent_name]
        agent_inst = agent_cls()
        result = agent_inst.run(code_context)

        return jsonify({
            "success": True,
            "project_id": project_id,
            "agent": agent_name,
            "result": result
        }), 200

    except Exception as e:
        logger.error(f"Single agent {agent_name} failed: {e}", exc_info=True)
        return jsonify({"success": False, "error": str(e)}), 500

@agents_bp.route("/reports/<analysis_id>", methods=["GET"])
def get_report(analysis_id):
    logger.info(f"Fetching report metrics for analysis_id: {analysis_id}")
    try:
        report = db_get_report(analysis_id)
        if not report:
            return jsonify({"success": False, "error": f"Report not found for analysis_id '{analysis_id}'."}), 404
            
        # Parse result string back to json
        result_payload = json.loads(report["results"])
        return jsonify(result_payload), 200
    except Exception as e:
        logger.error(f"Failed to fetch report {analysis_id}: {e}", exc_info=True)
        return jsonify({"success": False, "error": str(e)}), 500

@agents_bp.route("/reports", methods=["GET"])
def list_reports():
    logger.info("Listing review history reports.")
    # Support query params ?page=1&limit=10
    try:
        page = int(request.args.get("page", 1))
        limit = int(request.args.get("limit", 10))
        offset = (page - 1) * limit
        
        reports, total = db_list_reports(limit=limit, offset=offset)
        
        return jsonify({
            "success": True,
            "reports": reports,
            "total_count": total
        }), 200
    except Exception as e:
        logger.error(f"Failed to list reports: {e}", exc_info=True)
        return jsonify({"success": False, "error": str(e)}), 500
