"""
Guardrail - Automated Code Quality & Maintainability System
============================================================

A comprehensive system for maintaining code quality, PRD compliance,
documentation, and deployment readiness through automated audits,
trend tracking, and agentic fix loops.

Usage:
    python -m guardrail baseline --repo . --update-memory
    python -m guardrail audit --repo . --full
    python -m guardrail trend --repo . --update
    python -m guardrail fix --repo . --critical-only
    python -m guardrail docs --repo . --update
    python -m guardrail report --repo . --weekly
    python -m guardrail weekly --repo . --auto
"""

__version__ = "1.0.0"
__author__ = "Liquor POS Team"

from .core import GuardrailSystem
from .agents import (
    InterpreterAgent,
    MaintainabilityAgent,
    TrendAgent,
    AgenticFixLoop,
    DocumentationAgent,
    ReportingAgent,
)

__all__ = [
    "GuardrailSystem",
    "InterpreterAgent",
    "MaintainabilityAgent",
    "TrendAgent",
    "AgenticFixLoop",
    "DocumentationAgent",
    "ReportingAgent",
]

