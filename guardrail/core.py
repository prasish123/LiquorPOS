"""
Guardrail Core System
=====================

Central orchestration for all Guardrail agents and operations.
"""

import os
import json
from pathlib import Path
from typing import Dict, List, Optional, Any
from datetime import datetime

from .agents import (
    InterpreterAgent,
    MaintainabilityAgent,
    TrendAgent,
    AgenticFixLoop,
    DocumentationAgent,
    ReportingAgent,
)
from .models import AuditResult, TrendReport, WeeklyReport
from .utils import logger, ensure_dir


class GuardrailSystem:
    """
    Central Guardrail system that orchestrates all agents.
    """

    def __init__(self, repo_path: str = "."):
        self.repo_path = Path(repo_path).resolve()
        self.guardrail_dir = self.repo_path / ".guardrail"
        self.memory_file = self.guardrail_dir / "memory.json"
        self.history_file = self.guardrail_dir / "history.json"
        self.config_file = self.guardrail_dir / "config.json"

        # Ensure directories exist
        ensure_dir(self.guardrail_dir)

        # Load configuration and memory FIRST (before initializing agents)
        self.config = self._load_config()
        self.memory = self._load_memory()

        # Initialize agents (after config is loaded)
        self.interpreter = InterpreterAgent(self)
        self.maintainability = MaintainabilityAgent(self)
        self.trend = TrendAgent(self)
        self.fix_loop = AgenticFixLoop(self)
        self.docs = DocumentationAgent(self)
        self.reporting = ReportingAgent(self)

        logger.info(f"Guardrail initialized for repo: {self.repo_path}")

    def _load_config(self) -> Dict[str, Any]:
        """Load or create default configuration."""
        if self.config_file.exists():
            with open(self.config_file, "r") as f:
                return json.load(f)

        # Default configuration
        default_config = {
            "version": "1.0.0",
            "thresholds": {
                "green": 75,
                "yellow": 50,
                "red": 0,
            },
            "scoring": {
                "code_quality": 25,
                "testing": 25,
                "deployment": 20,
                "documentation": 15,
                "prd_compliance": 15,
            },
            "git_hook": {
                "enabled": False,
                "min_score": 70,
                "block_on_fail": True,
            },
            "notifications": {
                "enabled": False,
                "webhook_url": None,
            },
        }

        self._save_config(default_config)
        return default_config

    def _save_config(self, config: Dict[str, Any]):
        """Save configuration to disk."""
        with open(self.config_file, "w") as f:
            json.dump(config, f, indent=2)

    def _load_memory(self) -> Dict[str, Any]:
        """Load system memory."""
        if self.memory_file.exists():
            with open(self.memory_file, "r") as f:
                return json.load(f)
        return {
            "last_scan": None,
            "repo_structure": {},
            "prd_mapping": {},
            "known_issues": [],
        }

    def save_memory(self):
        """Save system memory to disk."""
        with open(self.memory_file, "w") as f:
            json.dump(self.memory, f, indent=2)

    def update_baseline(self, update_memory: bool = True) -> Dict[str, Any]:
        """
        Update baseline understanding of the repository.

        Args:
            update_memory: Whether to update internal memory

        Returns:
            Baseline scan results
        """
        logger.info("Updating baseline...")
        result = self.interpreter.scan_repository()

        if update_memory:
            self.memory["last_scan"] = datetime.now().isoformat()
            self.memory["repo_structure"] = result["structure"]
            self.memory["prd_mapping"] = result["prd_mapping"]
            self.save_memory()

        return result

    def run_audit(self, full: bool = True) -> AuditResult:
        """
        Run full maintainability audit.

        Args:
            full: Whether to run full audit or quick check

        Returns:
            Audit results with scores and recommendations
        """
        logger.info("Running maintainability audit...")
        return self.maintainability.audit(full=full)

    def update_trends(self) -> TrendReport:
        """
        Update trend tracking with latest audit results.

        Returns:
            Trend report comparing current vs historical scores
        """
        logger.info("Updating trend tracking...")
        return self.trend.update_trends()

    def apply_fixes(self, critical_only: bool = True) -> Dict[str, Any]:
        """
        Apply agentic fix loop for identified issues.

        Args:
            critical_only: Only fix critical (red-level) issues

        Returns:
            Fix results including files changed and verification steps
        """
        logger.info("Applying agentic fix loop...")
        return self.fix_loop.apply_fixes(critical_only=critical_only)

    def update_documentation(self) -> Dict[str, Any]:
        """
        Update documentation to reflect current code state.

        Returns:
            Documentation update results
        """
        logger.info("Updating documentation...")
        return self.docs.update_docs()

    def generate_report(self, weekly: bool = True) -> WeeklyReport:
        """
        Generate comprehensive report.

        Args:
            weekly: Generate weekly report format

        Returns:
            Comprehensive report for team review
        """
        logger.info("Generating report...")
        return self.reporting.generate_report(weekly=weekly)

    def run_weekly_maintenance(self) -> Dict[str, Any]:
        """
        Run complete weekly maintenance routine.

        Returns:
            Summary of all maintenance activities
        """
        logger.info("=" * 60)
        logger.info("Starting Weekly Guardrail Maintenance Routine")
        logger.info("=" * 60)

        results = {
            "timestamp": datetime.now().isoformat(),
            "steps": {},
        }

        try:
            # Step 1: Update baseline
            logger.info("\n[Step 1/6] Updating baseline...")
            results["steps"]["baseline"] = self.update_baseline(update_memory=True)

            # Step 2: Run audit
            logger.info("\n[Step 2/6] Running maintainability audit...")
            results["steps"]["audit"] = self.run_audit(full=True)

            # Step 3: Update trends
            logger.info("\n[Step 3/6] Updating trend tracking...")
            results["steps"]["trends"] = self.update_trends()

            # Step 4: Apply fixes
            logger.info("\n[Step 4/6] Applying critical fixes...")
            results["steps"]["fixes"] = self.apply_fixes(critical_only=True)

            # Step 5: Update documentation
            logger.info("\n[Step 5/6] Updating documentation...")
            results["steps"]["docs"] = self.update_documentation()

            # Step 6: Generate report
            logger.info("\n[Step 6/6] Generating weekly report...")
            results["steps"]["report"] = self.generate_report(weekly=True)

            results["status"] = "success"
            logger.info("\n" + "=" * 60)
            logger.info("Weekly maintenance routine completed successfully!")
            logger.info("=" * 60)

        except Exception as e:
            results["status"] = "failed"
            results["error"] = str(e)
            logger.error(f"Weekly maintenance failed: {e}")
            raise

        return results

    def enable_git_hook(self):
        """Enable Git pre-commit hook."""
        logger.info("Enabling Git hook...")
        self.config["git_hook"]["enabled"] = True
        self._save_config(self.config)

        # Create pre-commit hook
        hook_path = self.repo_path / ".git" / "hooks" / "pre-commit"
        hook_content = """#!/bin/sh
# Guardrail pre-commit hook

python -m guardrail git-check || exit 1
"""
        hook_path.write_text(hook_content)
        hook_path.chmod(0o755)

        logger.info("Git hook enabled")

    def disable_git_hook(self):
        """Disable Git pre-commit hook."""
        logger.info("Disabling Git hook...")
        self.config["git_hook"]["enabled"] = False
        self._save_config(self.config)

        hook_path = self.repo_path / ".git" / "hooks" / "pre-commit"
        if hook_path.exists():
            hook_path.unlink()

        logger.info("Git hook disabled")

