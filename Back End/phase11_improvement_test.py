import json
from pathlib import Path
from dotenv import load_dotenv
from agents.improvement_agent import ImprovementAgent

load_dotenv()

def main():
    print("Testing ImprovementAgent with fake combined results...")
    
    # Fake combined results from 7 agents
    fake_results = {
        "folder_agent": {
            "score": 60,
            "data": {
                "highlights": ["Found src directory", "Found tests"],
                "findings": ["Missing .gitignore", "Missing docker-compose.yml"],
                "recommendations": ["Add a .gitignore for python", "Add docker setup"]
            }
        },
        "documentation_agent": {
            "score": 50,
            "data": {
                "highlights": ["Basic README exists"],
                "findings": ["No setup instructions", "No API docs"],
                "recommendations": ["Document setup steps", "Add Swagger docs"]
            }
        },
        "innovation_agent": {
            "score": 75,
            "data": {
                "highlights": ["Uses modern React framework"],
                "findings": ["No AI integration", "Basic CRUD only"],
                "recommendations": ["Add LLM features to stand out"]
            }
        },
        "bug_agent": {
            "score": 40,
            "data": {
                "highlights": [],
                "findings": ["Null pointer exception possible in user.py:42", "Unhandled promise in API call"],
                "recommendations": ["Add null check in user.py", "Add catch block in frontend API call"]
            }
        },
        "security_agent": {
            "score": 30,
            "data": {
                "highlights": [],
                "findings": ["SQL injection vulnerability in auth.py", "Hardcoded API key in config.js"],
                "recommendations": ["Use parameterized queries in auth.py", "Move API key to .env"]
            }
        },
        "presentation_agent": {
            "score": 80,
            "data": {
                "highlights": ["Clean UI layout"],
                "findings": ["No demo script"],
                "recommendations": ["Create a 5-minute demo script"]
            }
        },
        "interview_agent": {
            "score": 65,
            "data": {
                "highlights": ["Good use of MVC pattern"],
                "findings": ["Candidate might struggle with scaling questions"],
                "recommendations": ["[Hard] How would you scale this to 10k users?"]
            }
        }
    }
    
    agent = ImprovementAgent()
    result = agent.run({"previous_results": fake_results})
    
    print("\n--- ImprovementAgent Result ---")
    print(json.dumps(result, indent=2))
    
if __name__ == "__main__":
    main()
