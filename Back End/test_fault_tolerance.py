import json
from pathlib import Path
from unittest.mock import patch
from dotenv import load_dotenv

load_dotenv()

from services.orchestrator import Orchestrator

def main():
    project_id = "5be8e61a-10f9-49f7-ad10-98a77fa1b419"
    project_root = Path("extracted") / project_id
    
    print(f"Testing fault tolerance on {project_id} without consuming Gemini quota...")
    
    # Mock the BugAgent to fail with an exception
    def mock_bug_run(*args, **kwargs):
        raise RuntimeError("SIMULATED BUG AGENT CRASH (Timeout / Network Error)")
        
    class MockResponse:
        text = '```json\n{"score": 85, "highlights": ["Fake Highlight"], "findings": ["Fake Finding"], "recommendations": ["Fake Rec"]}\n```'
        
    def mock_generate_content(*args, **kwargs):
        return MockResponse()
        
    with patch("agents.bug_agent.BugAgent.run", side_effect=mock_bug_run), \
         patch("google.generativeai.GenerativeModel.generate_content", side_effect=mock_generate_content):
         
        # Run orchestrator
        report = Orchestrator.run_all(project_id, project_root, "Test Project")
        
        # Verify Bug Agent result
        bug_result = report["results"]["bug"]
        print("\n--- Bug Agent Result (Failed) ---")
        print(json.dumps(bug_result, indent=2))
        
        # Verify other agents completed (e.g. documentation)
        doc_result = report["results"]["documentation"]
        print("\n--- Documentation Agent Result (Succeeded) ---")
        print(json.dumps(doc_result, indent=2))
        
        print(f"\nOverall Orchestrator Success: {report['success']}")
        print(f"Total Agents Completed (including mocked/failed): {len(report['results'])}")

if __name__ == "__main__":
    main()
