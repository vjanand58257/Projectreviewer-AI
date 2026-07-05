import logging
import threading
from datetime import datetime, timezone
import uuid
import json
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed

from flask import current_app
from agents.registry import AGENT_REGISTRY
from database import save_report

logger = logging.getLogger(__name__)

# Global thread-safe state to store in-progress status for polling
status_lock = threading.Lock()
ACTIVE_ANALYSES = {}

def get_analysis_status(project_id: str) -> dict:
    """Helper to retrieve the current analysis status for polling."""
    with status_lock:
        return ACTIVE_ANALYSES.get(project_id)

def init_analysis_status(project_id: str, analysis_id: str, agents_to_run: list) -> dict:
    """Initializes status entry for a project."""
    with status_lock:
        status_entry = {
            "project_id": project_id,
            "analysis_id": analysis_id,
            "status": "pending",
            "progress_percentage": 0,
            "agents": {
                name: {
                    "status": "pending",
                    "started_at": None,
                    "completed_at": None
                } for name in agents_to_run
            }
        }
        ACTIVE_ANALYSES[project_id] = status_entry
        return status_entry

def update_agent_status(project_id: str, agent_name: str, status: str, started_at: str = None, completed_at: str = None):
    """Updates status for a specific agent and calculates overall progress."""
    with status_lock:
        if project_id not in ACTIVE_ANALYSES:
            return
        
        entry = ACTIVE_ANALYSES[project_id]
        if agent_name in entry["agents"]:
            if status:
                entry["agents"][agent_name]["status"] = status
            if started_at:
                entry["agents"][agent_name]["started_at"] = started_at
            if completed_at:
                entry["agents"][agent_name]["completed_at"] = completed_at

        # Calculate progress percentage dynamically
        agents_states = entry["agents"]
        total_agents = len(agents_states)
        if total_agents == 0:
            entry["progress_percentage"] = 100
            return

        completed_count = sum(1 for a in agents_states.values() if a["status"] in ("completed", "failed"))
        in_progress_count = sum(1 for a in agents_states.values() if a["status"] == "in_progress")
        
        # Base progress starts at 5% if any agent is active
        progress = 5
        # Allocate 10% for Folder agent, 70% split among Tier 2 agents, 15% for Tier 3 Improvement agent
        # Let's just do a simple linear calculation for transparency
        progress += int((completed_count / total_agents) * 90)
        if in_progress_count > 0:
            progress += 5
            
        entry["progress_percentage"] = min(progress, 100)
        
        if completed_count == total_agents:
            entry["status"] = "completed"
        elif in_progress_count > 0 or completed_count > 0:
            entry["status"] = "in_progress"

def mark_analysis_failed(project_id: str, error_message: str):
    """Marks the entire analysis run as failed."""
    with status_lock:
        if project_id in ACTIVE_ANALYSES:
            ACTIVE_ANALYSES[project_id]["status"] = "failed"
            ACTIVE_ANALYSES[project_id]["error"] = error_message


class Orchestrator:
    def __init__(self, project_id: str, agents_override: list = None):
        self.project_id = project_id
        self.analysis_id = f"anly_{uuid.uuid4().hex[:12]}"
        
        # Determine target agents to run
        all_agent_names = list(AGENT_REGISTRY.keys())
        if agents_override:
            # Filter and validate requested agents
            self.agents_to_run = [a for a in agents_override if a in all_agent_names]
        else:
            self.agents_to_run = all_agent_names
            
        self.results = {}
        self.completed_agents = []
        self.failed_agents = []

    def execute_analysis(self) -> dict:
        """
        Executes the three-tier sequential and parallel analysis pipeline.
        This function runs in a background thread or synchronously depending on call context.
        """
        logger.info(f"Starting orchestration pipeline for project: {self.project_id} (Analysis: {self.analysis_id})")
        
        # 1. Initialize status tracking
        init_analysis_status(self.project_id, self.analysis_id, self.agents_to_run)
        
        # Resolve project root path
        try:
            base_dir = Path(current_app.config["BASE_DIR"])
        except RuntimeError:
            # Fallback if outside Flask context
            base_dir = Path(__file__).resolve().parent
            
        project_root = base_dir / "extracted" / self.project_id
        
        if not project_root.is_dir():
            err_msg = f"Project root directory not found: {project_root}"
            logger.error(err_msg)
            mark_analysis_failed(self.project_id, err_msg)
            return {
                "success": False,
                "error": err_msg
            }

        # Find project name/zip filename
        project_name = f"{self.project_id}.zip"
        try:
            upload_folder = Path(current_app.config.get("UPLOAD_FOLDER"))
            # Find the actual original filename from the zip folder or metadata
            # We can lookup by project_id
            for p in upload_folder.iterdir():
                if p.is_file() and p.stem == self.project_id:
                    project_name = p.name
                    break
        except Exception:
            pass

        created_at = datetime.now(timezone.utc).isoformat()

        # =====================================================================
        # TIER 1: Folder Agent Execution (Synchronous, Offline)
        # =====================================================================
        folder_results = None
        if "folder" in self.agents_to_run:
            logger.info("Executing Tier 1: Folder Agent...")
            t_start = datetime.now(timezone.utc).isoformat()
            update_agent_status(self.project_id, "folder", "in_progress", started_at=t_start)
            
            try:
                folder_agent = AGENT_REGISTRY["folder"]()
                folder_results = folder_agent.run({"project_root": str(project_root)})
                self.results["folder"] = folder_results
                self.completed_agents.append("folder")
                update_agent_status(
                    self.project_id, "folder", "completed", 
                    completed_at=datetime.now(timezone.utc).isoformat()
                )
            except Exception as e:
                logger.error(f"Folder Agent failed: {e}", exc_info=True)
                self.failed_agents.append("folder")
                self.results["folder"] = self._get_error_payload("folder", str(e))
                update_agent_status(
                    self.project_id, "folder", "failed", 
                    completed_at=datetime.now(timezone.utc).isoformat()
                )

        # =====================================================================
        # TIER 2: Parallel Batch Execution (Calls Gemini)
        # =====================================================================
        tier2_agents = ["documentation", "innovation", "bug", "security", "presentation", "interview"]
        tier2_to_run = [a for a in tier2_agents if a in self.agents_to_run]

        if tier2_to_run:
            logger.info(f"Executing Tier 2 Agents in Parallel: {tier2_to_run}")
            
            # Prepare common context for Tier 2
            code_context = {
                "project_root": str(project_root),
                "folder_results": folder_results
            }

            def run_single_agent(agent_name):
                t_start = datetime.now(timezone.utc).isoformat()
                update_agent_status(self.project_id, agent_name, "in_progress", started_at=t_start)
                try:
                    agent_cls = AGENT_REGISTRY[agent_name]
                    agent_inst = agent_cls()
                    res = agent_inst.run(code_context)
                    return agent_name, res, None
                except Exception as e:
                    logger.error(f"Agent {agent_name} execution failed: {e}", exc_info=True)
                    return agent_name, None, str(e)

            # Use ThreadPoolExecutor to run LLM requests in parallel
            with ThreadPoolExecutor(max_workers=len(tier2_to_run)) as executor:
                futures = {executor.submit(run_single_agent, name): name for name in tier2_to_run}
                
                for future in as_completed(futures):
                    agent_name, res, err = future.result()
                    t_end = datetime.now(timezone.utc).isoformat()
                    
                    if err:
                        self.failed_agents.append(agent_name)
                        self.results[agent_name] = self._get_error_payload(agent_name, err)
                        update_agent_status(self.project_id, agent_name, "failed", completed_at=t_end)
                    else:
                        self.completed_agents.append(agent_name)
                        self.results[agent_name] = res
                        update_agent_status(self.project_id, agent_name, "completed", completed_at=t_end)

        # =====================================================================
        # TIER 3: Improvement Agent Execution (Synchronous, Synthesis)
        # =====================================================================
        if "improvement" in self.agents_to_run:
            logger.info("Executing Tier 3: Improvement Agent...")
            t_start = datetime.now(timezone.utc).isoformat()
            update_agent_status(self.project_id, "improvement", "in_progress", started_at=t_start)
            
            try:
                improvement_agent = AGENT_REGISTRY["improvement"]()
                # Feed it all results collected so far
                improvement_results = improvement_agent.run({
                    "project_root": str(project_root),
                    "results": self.results
                })
                self.results["improvement"] = improvement_results
                self.completed_agents.append("improvement")
                update_agent_status(
                    self.project_id, "improvement", "completed", 
                    completed_at=datetime.now(timezone.utc).isoformat()
                )
            except Exception as e:
                logger.error(f"Improvement Agent failed: {e}", exc_info=True)
                self.failed_agents.append("improvement")
                self.results["improvement"] = self._get_error_payload("improvement", str(e))
                update_agent_status(
                    self.project_id, "improvement", "failed", 
                    completed_at=datetime.now(timezone.utc).isoformat()
                )

        # Compute overall score as an average of all agent scores (excluding improvement)
        scores = [res.get("score", 0) for name, res in self.results.items() if name != "improvement"]
        overall_score = int(sum(scores) / len(scores)) if scores else 0

        # Build response payload and compute codebase metrics
        metrics = self._compute_project_metrics(project_root)
        final_payload = {
            "project_id": self.project_id,
            "analysis_id": self.analysis_id,
            "status": "completed" if not self.failed_agents else "partial_success",
            "overall_score": overall_score,
            "completed_agents": self.completed_agents,
            "failed_agents": self.failed_agents,
            "created_at": created_at,
            "meta": {
                "project_name": project_name,
                "files_scanned": metrics["files_scanned"],
                "loc": metrics["loc"],
                "language": metrics["language"]
            },
            "results": self.results
        }

        # Update polling cache state to completed
        with status_lock:
            if self.project_id in ACTIVE_ANALYSES:
                ACTIVE_ANALYSES[self.project_id].update({
                    "status": "completed",
                    "progress_percentage": 100,
                })

        # Persist results in SQLite database
        try:
            results_json = json.dumps(final_payload)
            save_report(
                analysis_id=self.analysis_id,
                project_id=self.project_id,
                project_name=project_name,
                overall_score=overall_score,
                status=final_payload["status"],
                created_at=created_at,
                results_json=results_json
            )
            logger.info(f"Analysis saved to database. Analysis ID: {self.analysis_id}")
        except Exception as db_err:
            logger.error(f"Failed to persist report to SQLite database: {db_err}", exc_info=True)

        return final_payload

    def _compute_project_metrics(self, project_root: Path) -> dict:
        """
        Dynamically computes codebase metrics: file count, total LOC, and primary languages.
        """
        from agents.base_agent import IGNORED_DIRS, SOURCE_EXTENSIONS
        files_count = 0
        total_loc = 0
        detected_languages = set()
        
        lang_mapping = {
            ".py": "Python",
            ".js": "JavaScript",
            ".jsx": "React (JS)",
            ".ts": "TypeScript",
            ".tsx": "React (TS)",
            ".java": "Java",
            ".go": "Go",
            ".rs": "Rust",
            ".cpp": "C++",
            ".c": "C",
            ".h": "C/C++ Header",
            ".cs": "C#",
            ".rb": "Ruby",
            ".php": "PHP",
            ".html": "HTML",
            ".css": "CSS",
            ".vue": "Vue",
            ".svelte": "Svelte"
        }
        
        try:
            for path in project_root.rglob("*"):
                if not path.is_file():
                    continue
                
                # Skip ignored directories
                parts = path.relative_to(project_root).parts
                if any(part in IGNORED_DIRS for part in parts):
                    continue
                    
                suffix = path.suffix.lower()
                if suffix in SOURCE_EXTENSIONS:
                    files_count += 1
                    # Detect language
                    lang = lang_mapping.get(suffix)
                    if lang:
                        detected_languages.add(lang)
                    
                    # Count lines of code
                    try:
                        with open(path, "r", encoding="utf-8", errors="ignore") as f:
                            total_loc += sum(1 for _ in f)
                    except Exception:
                        pass
        except Exception as e:
            logger.error(f"Error computing project metrics: {e}")
            
        primary_lang = ", ".join(list(detected_languages)[:2]) if detected_languages else "Unknown"
        
        return {
            "files_scanned": files_count,
            "loc": total_loc,
            "language": primary_lang
        }

    def _get_error_payload(self, agent_name: str, error_message: str) -> dict:
        """Helper to create a graceful error fallback payload matching canonical schema."""
        return {
            "agent": agent_name,
            "score": 0,
            "data": {
                "highlights": [],
                "findings": [],
                "recommendations": []
            },
            "errors": [
                {
                    "code": "AGENT_EXECUTION_FAILURE",
                    "message": f"{agent_name.capitalize()} Agent encountered an unhandled exception: {error_message}"
                }
            ]
        }
