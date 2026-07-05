import sys
import os

# Add current folder to sys.path to mimic execution environment
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

try:
    from agents.registry import discover_agents, AGENT_REGISTRY
    print("Testing dynamic agent discovery...")
    discover_agents()
    print("SUCCESS: Dynamic agent discovery completed successfully!")
    print(f"Registered Agent list: {list(AGENT_REGISTRY.keys())}")
    assert len(AGENT_REGISTRY) == 8, "Expected 8 registered agents, got less!"
    print("SUCCESS: All 8 agents imported and registered correctly with no errors.")
except Exception as e:
    print(f"FAILED: Import error or syntax error occurred: {e}")
    sys.exit(1)
