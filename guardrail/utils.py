"""
Guardrail Utilities
===================

Helper functions and utilities.
"""

import os
import sys
import json
import logging
import subprocess
from pathlib import Path
from typing import List, Dict, Any, Optional


# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)

logger = logging.getLogger("guardrail")


def ensure_dir(path: Path):
    """Ensure directory exists."""
    path.mkdir(parents=True, exist_ok=True)


def run_command(
    cmd: List[str], cwd: Optional[Path] = None, capture: bool = True
) -> subprocess.CompletedProcess:
    """
    Run shell command and return result.

    Args:
        cmd: Command to run as list
        cwd: Working directory
        capture: Whether to capture output

    Returns:
        CompletedProcess result
    """
    try:
        result = subprocess.run(
            cmd,
            cwd=cwd,
            capture_output=capture,
            text=True,
            check=False,
        )
        return result
    except Exception as e:
        logger.error(f"Command failed: {' '.join(cmd)}: {e}")
        raise


def count_lines(file_path: Path) -> int:
    """Count lines in a file."""
    try:
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            return sum(1 for _ in f)
    except Exception:
        return 0


def find_files(
    root: Path, patterns: List[str], exclude: Optional[List[str]] = None
) -> List[Path]:
    """
    Find files matching patterns.

    Args:
        root: Root directory to search
        patterns: File patterns to match (e.g., "*.ts", "*.tsx")
        exclude: Patterns to exclude

    Returns:
        List of matching file paths
    """
    import fnmatch

    exclude = exclude or []
    matches = []

    for pattern in patterns:
        for path in root.rglob(pattern):
            # Check if should be excluded
            should_exclude = False
            for exc_pattern in exclude:
                if fnmatch.fnmatch(str(path), exc_pattern):
                    should_exclude = True
                    break

            if not should_exclude and path.is_file():
                matches.append(path)

    return matches


def calculate_weighted_score(scores: Dict[str, float], weights: Dict[str, float]) -> float:
    """
    Calculate weighted average score.

    Args:
        scores: Dictionary of dimension scores
        weights: Dictionary of dimension weights (should sum to 100)

    Returns:
        Weighted average score
    """
    total = 0.0
    total_weight = 0.0

    for dimension, score in scores.items():
        weight = weights.get(dimension, 0)
        total += score * weight
        total_weight += weight

    if total_weight == 0:
        return 0.0

    return total / total_weight


def format_score(score: float) -> str:
    """Format score with color indicator."""
    if score >= 75:
        return f"🟢 {score:.1f}"
    elif score >= 50:
        return f"🟡 {score:.1f}"
    else:
        return f"🔴 {score:.1f}"


def format_trend(change: float) -> str:
    """Format trend change with indicator."""
    if change > 5:
        return f"🟢 +{change:.1f}"
    elif change < -5:
        return f"🔴 {change:.1f}"
    else:
        return f"🟡 {change:+.1f}"


def load_json(file_path: Path) -> Dict[str, Any]:
    """Load JSON file."""
    if not file_path.exists():
        return {}

    with open(file_path, "r") as f:
        return json.load(f)


def save_json(file_path: Path, data: Dict[str, Any]):
    """Save JSON file."""
    with open(file_path, "w") as f:
        json.dump(data, f, indent=2)


def get_git_root(path: Path) -> Optional[Path]:
    """Get Git repository root."""
    current = path.resolve()

    while current != current.parent:
        if (current / ".git").exists():
            return current
        current = current.parent

    return None


def is_git_repo(path: Path) -> bool:
    """Check if path is in a Git repository."""
    return get_git_root(path) is not None


def get_changed_files(repo_path: Path) -> List[str]:
    """Get list of changed files in Git."""
    result = run_command(["git", "diff", "--name-only", "HEAD"], cwd=repo_path)
    if result.returncode == 0:
        return [line.strip() for line in result.stdout.split("\n") if line.strip()]
    return []


def get_staged_files(repo_path: Path) -> List[str]:
    """Get list of staged files in Git."""
    result = run_command(["git", "diff", "--cached", "--name-only"], cwd=repo_path)
    if result.returncode == 0:
        return [line.strip() for line in result.stdout.split("\n") if line.strip()]
    return []

