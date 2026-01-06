"""
Guardrail Data Models
=====================

Data structures for audit results, trends, and reports.
"""

from dataclasses import dataclass, field
from typing import Dict, List, Optional, Any
from datetime import datetime
from enum import Enum


class ScoreLevel(Enum):
    """Score level classification."""

    RED = "red"  # 0-49
    YELLOW = "yellow"  # 50-74
    GREEN = "green"  # 75-100


class TrendDirection(Enum):
    """Trend direction."""

    IMPROVING = "improving"  # 🟢
    STABLE = "stable"  # 🟡
    WORSENING = "worsening"  # 🔴


@dataclass
class DimensionScore:
    """Score for a single dimension."""

    name: str
    score: float
    level: ScoreLevel
    issues: List[str] = field(default_factory=list)
    recommendations: List[str] = field(default_factory=list)
    details: Dict[str, Any] = field(default_factory=dict)

    @classmethod
    def from_score(cls, name: str, score: float, **kwargs):
        """Create DimensionScore from numeric score."""
        if score >= 75:
            level = ScoreLevel.GREEN
        elif score >= 50:
            level = ScoreLevel.YELLOW
        else:
            level = ScoreLevel.RED

        return cls(name=name, score=score, level=level, **kwargs)


@dataclass
class AuditResult:
    """Complete audit result."""

    timestamp: str
    overall_score: float
    overall_level: ScoreLevel
    dimensions: Dict[str, DimensionScore]
    critical_issues: List[str] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            "timestamp": self.timestamp,
            "overall_score": self.overall_score,
            "overall_level": self.overall_level.value,
            "dimensions": {
                name: {
                    "score": dim.score,
                    "level": dim.level.value,
                    "issues": dim.issues,
                    "recommendations": dim.recommendations,
                    "details": dim.details,
                }
                for name, dim in self.dimensions.items()
            },
            "critical_issues": self.critical_issues,
            "warnings": self.warnings,
            "metadata": self.metadata,
        }


@dataclass
class TrendData:
    """Trend data for a dimension."""

    dimension: str
    current_score: float
    previous_score: Optional[float]
    change: float
    direction: TrendDirection
    history: List[Dict[str, Any]] = field(default_factory=list)


@dataclass
class TrendReport:
    """Trend analysis report."""

    timestamp: str
    trends: Dict[str, TrendData]
    overall_trend: TrendDirection
    regressions: List[str] = field(default_factory=list)
    improvements: List[str] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            "timestamp": self.timestamp,
            "overall_trend": self.overall_trend.value,
            "trends": {
                name: {
                    "current_score": trend.current_score,
                    "previous_score": trend.previous_score,
                    "change": trend.change,
                    "direction": trend.direction.value,
                    "history": trend.history,
                }
                for name, trend in self.trends.items()
            },
            "regressions": self.regressions,
            "improvements": self.improvements,
            "metadata": self.metadata,
        }


@dataclass
class FixResult:
    """Result of applying a fix."""

    issue: str
    status: str  # "applied", "skipped", "failed"
    files_changed: List[str] = field(default_factory=list)
    description: str = ""
    verification_steps: List[str] = field(default_factory=list)
    error: Optional[str] = None


@dataclass
class WeeklyReport:
    """Weekly maintenance report."""

    timestamp: str
    week_number: int
    audit_result: AuditResult
    trend_report: TrendReport
    fixes_applied: List[FixResult] = field(default_factory=list)
    docs_updated: List[str] = field(default_factory=list)
    recommendations: List[str] = field(default_factory=list)
    next_actions: List[str] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            "timestamp": self.timestamp,
            "week_number": self.week_number,
            "audit_result": self.audit_result.to_dict(),
            "trend_report": self.trend_report.to_dict(),
            "fixes_applied": [
                {
                    "issue": fix.issue,
                    "status": fix.status,
                    "files_changed": fix.files_changed,
                    "description": fix.description,
                    "verification_steps": fix.verification_steps,
                    "error": fix.error,
                }
                for fix in self.fixes_applied
            ],
            "docs_updated": self.docs_updated,
            "recommendations": self.recommendations,
            "next_actions": self.next_actions,
            "metadata": self.metadata,
        }

