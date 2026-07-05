import importlib
import os
from typing import Dict, Type
from agents.base_agent import BaseAgent

# Global registry dictionary mapping agent keys to classes
AGENT_REGISTRY: Dict[str, Type[BaseAgent]] = {}

def register_agent(name: str):
    """Decorator to register a class as an analysis agent."""
    def decorator(cls: Type[BaseAgent]):
        if not issubclass(cls, BaseAgent):
            raise TypeError(f"Class {cls.__name__} must inherit from BaseAgent")
        AGENT_REGISTRY[name] = cls
        return cls
    return decorator

def discover_agents():
    """Scans the agents directory and dynamically imports modules to register classes."""
    agents_dir = os.path.dirname(__file__)
    for filename in os.listdir(agents_dir):
        if filename.endswith(".py") and not filename.startswith(("_", "base_agent", "registry")):
            module_name = f"agents.{filename[:-3]}"
            importlib.import_module(module_name)
