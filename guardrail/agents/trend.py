"""
Trend Agent
===========

Tracks changes in scores over time and identifies trends.
"""

import json
from pathlib import Path
from typing import Dict, List, Any, Optional
from datetime import datetime

from ..models import TrendReport, TrendData, TrendDirection
from ..utils import logger, load_json, save_json


class TrendAgent:
    """
    TREND TRACKER AGENT
    - Compare current audit scores with historical scores.
    - Identify regressions or improvements in each dimension.
    - Mark trends as:
       🔴 Red → worsening
       🟡 Yellow → stable
       🟢 Green → improving
    - Generate a weekly trend report.
    """

    def __init__(self, system):
        self.system = system
        self.repo_path = system.repo_path
        self.history_file = system.guardrail_dir / "history.json"

    def update_trends(self) -> TrendReport:
        """
        Update trend tracking with latest audit results.

        Returns:
            Trend report with comparisons and direction indicators
        """
        logger.info("Updating trend tracking...")

        # Load historical data
        history = self._load_history()

        # Get latest audit result
        latest_audit = self._get_latest_audit()
        if not latest_audit:
            logger.warning("No audit results found, run audit first")
            return self._empty_trend_report()

        # Add to history
        history.append({
            "timestamp": latest_audit["timestamp"],
            "overall_score": latest_audit["overall_score"],
            "dimensions": {
                name: dim["score"]
                for name, dim in latest_audit["dimensions"].items()
            },
        })

        # Keep last 52 weeks (1 year)
        if len(history) > 52:
            history = history[-52:]

        # Save updated history
        self._save_history(history)

        # Calculate trends
        trends = self._calculate_trends(history)

        # Determine overall trend
        overall_trend = self._determine_overall_trend(trends)

        # Identify regressions and improvements
        regressions = []
        improvements = []

        for name, trend_data in trends.items():
            if trend_data.direction == TrendDirection.WORSENING:
                regressions.append(f"{name}: {trend_data.change:+.1f} points")
            elif trend_data.direction == TrendDirection.IMPROVING:
                improvements.append(f"{name}: {trend_data.change:+.1f} points")

        report = TrendReport(
            timestamp=datetime.now().isoformat(),
            trends=trends,
            overall_trend=overall_trend,
            regressions=regressions,
            improvements=improvements,
            metadata={
                "history_length": len(history),
                "weeks_tracked": len(history),
            },
        )

        logger.info(f"Trend tracking updated: {len(improvements)} improvements, {len(regressions)} regressions")
        return report

    def _load_history(self) -> List[Dict[str, Any]]:
        """Load historical audit data."""
        if not self.history_file.exists():
            return []

        return load_json(self.history_file)

    def _save_history(self, history: List[Dict[str, Any]]):
        """Save historical audit data."""
        save_json(self.history_file, history)

    def _get_latest_audit(self) -> Optional[Dict[str, Any]]:
        """Get the most recent audit result."""
        audit_file = self.system.guardrail_dir / "latest_audit.json"

        if not audit_file.exists():
            return None

        return load_json(audit_file)

    def _calculate_trends(self, history: List[Dict[str, Any]]) -> Dict[str, TrendData]:
        """Calculate trend data for each dimension."""
        if len(history) < 2:
            # Not enough data for trends
            latest = history[-1] if history else {}
            dimensions = latest.get("dimensions", {})

            return {
                name: TrendData(
                    dimension=name,
                    current_score=score,
                    previous_score=None,
                    change=0.0,
                    direction=TrendDirection.STABLE,
                    history=[],
                )
                for name, score in dimensions.items()
            }

        latest = history[-1]
        previous = history[-2]

        trends = {}

        for dimension_name, current_score in latest["dimensions"].items():
            previous_score = previous["dimensions"].get(dimension_name)
            change = current_score - previous_score if previous_score is not None else 0.0

            # Determine direction
            if change > 5:
                direction = TrendDirection.IMPROVING
            elif change < -5:
                direction = TrendDirection.WORSENING
            else:
                direction = TrendDirection.STABLE

            # Get historical data for this dimension
            dimension_history = [
                {
                    "timestamp": entry["timestamp"],
                    "score": entry["dimensions"].get(dimension_name, 0),
                }
                for entry in history[-10:]  # Last 10 weeks
            ]

            trends[dimension_name] = TrendData(
                dimension=dimension_name,
                current_score=current_score,
                previous_score=previous_score,
                change=change,
                direction=direction,
                history=dimension_history,
            )

        return trends

    def _determine_overall_trend(self, trends: Dict[str, TrendData]) -> TrendDirection:
        """Determine overall trend direction."""
        if not trends:
            return TrendDirection.STABLE

        improving = sum(1 for t in trends.values() if t.direction == TrendDirection.IMPROVING)
        worsening = sum(1 for t in trends.values() if t.direction == TrendDirection.WORSENING)

        if improving > worsening:
            return TrendDirection.IMPROVING
        elif worsening > improving:
            return TrendDirection.WORSENING
        else:
            return TrendDirection.STABLE

    def _empty_trend_report(self) -> TrendReport:
        """Create empty trend report when no data available."""
        return TrendReport(
            timestamp=datetime.now().isoformat(),
            trends={},
            overall_trend=TrendDirection.STABLE,
            regressions=[],
            improvements=[],
            metadata={"error": "No audit data available"},
        )

    def generate_trend_chart(self, dimension: Optional[str] = None) -> str:
        """
        Generate ASCII trend chart for visualization.

        Args:
            dimension: Specific dimension to chart, or None for overall

        Returns:
            ASCII chart as string
        """
        history = self._load_history()

        if len(history) < 2:
            return "Not enough data for trend chart (need at least 2 data points)"

        # Get data points
        if dimension:
            data_points = [
                entry["dimensions"].get(dimension, 0) for entry in history[-10:]
            ]
            title = f"Trend Chart: {dimension}"
        else:
            data_points = [entry["overall_score"] for entry in history[-10:]]
            title = "Trend Chart: Overall Score"

        # Generate ASCII chart
        chart = self._generate_ascii_chart(data_points, title)
        return chart

    def _generate_ascii_chart(self, data_points: List[float], title: str) -> str:
        """Generate ASCII line chart."""
        if not data_points:
            return "No data"

        height = 10
        width = len(data_points)

        # Normalize data to chart height
        min_val = min(data_points)
        max_val = max(data_points)
        range_val = max_val - min_val if max_val > min_val else 1

        normalized = [
            int((val - min_val) / range_val * (height - 1)) for val in data_points
        ]

        # Build chart
        lines = [title, "=" * (width * 4)]

        for y in range(height - 1, -1, -1):
            line = f"{min_val + (y / (height - 1)) * range_val:5.1f} |"
            for x in range(width):
                if normalized[x] == y:
                    line += " ● "
                elif normalized[x] > y:
                    line += " │ "
                else:
                    line += "   "
            lines.append(line)

        # Add x-axis
        lines.append("      " + "─" * (width * 3))
        lines.append("      " + "".join(f" {i+1} " for i in range(width)))

        return "\n".join(lines)

