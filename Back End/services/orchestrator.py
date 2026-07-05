import logging
from pathlib import Path

from agents.folder_agent import FolderAgent
from agents.documentation_agent import DocumentationAgent
from agents.innovation_agent import InnovationAgent
from agents.bug_agent import BugAgent
from agents.security_agent import SecurityAgent
from agents.presentation_agent import PresentationAgent
from agents.interview_agent import InterviewAgent
from agents.improvement_agent import ImprovementAgent

logger = logging.getLogger(__name__)

# In-memory store for status polling
STATUS_DB = {}

class Orchestrator:
    @staticmethod
    def run_all(project_id: str, project_root: Path, project_name: str) -> dict:
        STATUS_DB[project_id] = {
            "status": "in_progress",
            "agents": {
                "folder": "pending",
                "documentation": "pending",
                "innovation": "pending",
                "bug": "pending",
                "security": "pending",
                "presentation": "pending",
                "interview": "pending",
                "improvement": "pending"
            }
        }
        
        results = {}
        
        def _run_agent(agent_name, agent_cls, context):
            STATUS_DB[project_id]["agents"][agent_name] = "in_progress"
            class_name = agent_cls.__name__
            logger.info(f"START {class_name}")
            try:
                agent = agent_cls()
                res = agent.run(context)
                
                if not isinstance(res, dict):
                    STATUS_DB[project_id]["agents"][agent_name] = "failed"
                    logger.info(f"END {class_name}")
                    return {
                        "agent": class_name,
                        "score": 0,
                        "errors": [
                            "Agent returned invalid response."
                        ],
                        "data": {}
                    }

                if res.get("errors") and len(res.get("errors", [])) > 0:
                    STATUS_DB[project_id]["agents"][agent_name] = "failed"
                else:
                    STATUS_DB[project_id]["agents"][agent_name] = "done"
                    
                logger.info(f"END {class_name}")
                return res
            except Exception as e:
                logger.exception(
                    "-------------------------------------------------\n"
                    f"FAILED {class_name}\n"
                    f"Exception Type: {type(e).__name__}\n"
                    f"Exception Message: {str(e)}\n"
                    "Full Traceback:\n"
                    "-------------------------------------------------"
                )
                STATUS_DB[project_id]["agents"][agent_name] = "failed"
                return {
                    "agent": class_name,
                    "score": 0,
                    "errors": [
                        f"{type(e).__name__}: {str(e)}"
                    ],
                    "data": {}
                }

        # 1. Folder Agent
        f_res = _run_agent("folder", FolderAgent, {"project_root": str(project_root)})
        results["folder"] = f_res
        
        # Readme extraction once
        try:
            readme_content = ""
            for item in project_root.iterdir():
                if item.is_file() and item.name.lower() in {"readme.md", "readme.txt", "readme.rst", "readme"}:
                    readme_content = item.read_text(encoding="utf-8", errors="ignore")[:8000]
                    break
        except Exception:
            readme_content = ""
            
        common_context = {
            "project_root": str(project_root),
            "project_name": project_name,
            "folder_results": f_res,
            "readme_content": readme_content
        }
        
        # 2. Tier 2 Agents (Sequential)
        tier_2 = [
            ("documentation", DocumentationAgent),
            ("innovation", InnovationAgent),
            ("bug", BugAgent),
            ("security", SecurityAgent),
            ("presentation", PresentationAgent),
            ("interview", InterviewAgent)
        ]
        
        for name, cls in tier_2:
            results[name] = _run_agent(name, cls, common_context)
            
        # 3. Improvement Agent
        imp_res = _run_agent("improvement", ImprovementAgent, {"previous_results": results})
        results["improvement"] = imp_res
        
        STATUS_DB[project_id]["status"] = "done"
        
        logger.info("All agents finished successfully.")
        
        overall_score = 0
        if isinstance(imp_res, dict):
            overall_score = imp_res.get("score", 0)
            
        if not isinstance(results, dict):
            logger.error("Validation failed: results is not a dictionary.")
        if not isinstance(imp_res, dict):
            logger.error("Validation failed: improvement result is not a dictionary.")
        if not isinstance(overall_score, (int, float)):
            logger.error("Validation failed: overall_score is not numeric.")
        
        return {
            "success": True,
            "project_id": project_id,
            "overall_score": overall_score,
            "results": results
        }

    @staticmethod
    def get_status(project_id: str) -> dict:
        return STATUS_DB.get(project_id, {"status": "not_found", "agents": {}})
