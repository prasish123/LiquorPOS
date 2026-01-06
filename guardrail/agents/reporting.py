"""
Reporting Agent
===============

Generates comprehensive reports for team review.
"""

import json
from pathlib import Path
from typing import Dict, List, Any
from datetime import datetime, timedelta

from ..models import WeeklyReport, AuditResult, TrendReport
from ..utils import logger, load_json, format_score, format_trend


class ReportingAgent:
    """
    REPORTING AGENT
    - Summarize current scores per dimension.
    - Include trend changes since last week.
    - List critical/failing issues and fixes applied.
    - Highlight Yellow-level areas for attention.
    - Output actionable recommendations for next week.
    """

    def __init__(self, system):
        self.system = system
        self.repo_path = system.repo_path

    def generate_report(self, weekly: bool = True) -> WeeklyReport:
        """
        Generate comprehensive report.

        Args:
            weekly: Generate weekly report format

        Returns:
            Comprehensive report for team review
        """
        logger.info("Generating report...")

        # Load latest audit and trend data
        audit_result = self._load_audit_result()
        trend_report = self._load_trend_report()

        # Get fixes applied
        fixes_applied = self._get_recent_fixes()

        # Get documentation updates
        docs_updated = self._get_recent_doc_updates()

        # Generate recommendations
        recommendations = self._generate_recommendations(audit_result, trend_report)

        # Generate next actions
        next_actions = self._generate_next_actions(audit_result, trend_report)

        # Calculate week number
        week_number = datetime.now().isocalendar()[1]

        report = WeeklyReport(
            timestamp=datetime.now().isoformat(),
            week_number=week_number,
            audit_result=audit_result,
            trend_report=trend_report,
            fixes_applied=fixes_applied,
            docs_updated=docs_updated,
            recommendations=recommendations,
            next_actions=next_actions,
            metadata={
                "repo_path": str(self.repo_path),
                "report_type": "weekly" if weekly else "adhoc",
            },
        )

        # Save report
        self._save_report(report)

        # Generate markdown report
        self._generate_markdown_report(report)

        logger.info(f"Report generated: Week {week_number}")
        return report

    def _load_audit_result(self) -> AuditResult:
        """Load latest audit result."""
        audit_file = self.system.guardrail_dir / "latest_audit.json"

        if not audit_file.exists():
            # Return empty audit result
            from ..models import ScoreLevel

            return AuditResult(
                timestamp=datetime.now().isoformat(),
                overall_score=0.0,
                overall_level=ScoreLevel.RED,
                dimensions={},
                critical_issues=["No audit data available"],
                warnings=[],
            )

        data = load_json(audit_file)

        # Convert back to AuditResult
        from ..models import DimensionScore, ScoreLevel

        dimensions = {}
        for name, dim_data in data.get("dimensions", {}).items():
            dimensions[name] = DimensionScore(
                name=name,
                score=dim_data["score"],
                level=ScoreLevel(dim_data["level"]),
                issues=dim_data.get("issues", []),
                recommendations=dim_data.get("recommendations", []),
                details=dim_data.get("details", {}),
            )

        return AuditResult(
            timestamp=data["timestamp"],
            overall_score=data["overall_score"],
            overall_level=ScoreLevel(data["overall_level"]),
            dimensions=dimensions,
            critical_issues=data.get("critical_issues", []),
            warnings=data.get("warnings", []),
            metadata=data.get("metadata", {}),
        )

    def _load_trend_report(self) -> TrendReport:
        """Load latest trend report."""
        trend_file = self.system.guardrail_dir / "latest_trend.json"

        if not trend_file.exists():
            from ..models import TrendDirection

            return TrendReport(
                timestamp=datetime.now().isoformat(),
                trends={},
                overall_trend=TrendDirection.STABLE,
                regressions=[],
                improvements=[],
            )

        data = load_json(trend_file)

        from ..models import TrendData, TrendDirection

        trends = {}
        for name, trend_data in data.get("trends", {}).items():
            trends[name] = TrendData(
                dimension=name,
                current_score=trend_data["current_score"],
                previous_score=trend_data.get("previous_score"),
                change=trend_data["change"],
                direction=TrendDirection(trend_data["direction"]),
                history=trend_data.get("history", []),
            )

        return TrendReport(
            timestamp=data["timestamp"],
            trends=trends,
            overall_trend=TrendDirection(data["overall_trend"]),
            regressions=data.get("regressions", []),
            improvements=data.get("improvements", []),
            metadata=data.get("metadata", {}),
        )

    def _get_recent_fixes(self) -> List:
        """Get recently applied fixes."""
        fixes_file = self.system.guardrail_dir / "latest_fixes.json"

        if not fixes_file.exists():
            return []

        data = load_json(fixes_file)

        from ..models import FixResult

        return [
            FixResult(
                issue=fix["issue"],
                status=fix["status"],
                files_changed=fix.get("files_changed", []),
                description=fix.get("description", ""),
                verification_steps=fix.get("verification_steps", []),
                error=fix.get("error"),
            )
            for fix in data.get("fixes", [])
        ]

    def _get_recent_doc_updates(self) -> List[str]:
        """Get recently updated documentation."""
        docs_file = self.system.guardrail_dir / "latest_docs.json"

        if not docs_file.exists():
            return []

        data = load_json(docs_file)
        return data.get("files_updated", [])

    def _generate_recommendations(
        self, audit_result: AuditResult, trend_report: TrendReport
    ) -> List[str]:
        """Generate actionable recommendations."""
        recommendations = []

        # Recommendations based on critical issues
        if audit_result.critical_issues:
            recommendations.append(
                f"[CRITICAL] Address {len(audit_result.critical_issues)} critical issues immediately"
            )

        # Recommendations based on low-scoring dimensions
        from ..models import ScoreLevel

        for name, dim in audit_result.dimensions.items():
            if dim.level == ScoreLevel.RED:
                recommendations.append(f"[RED] {name}: Score {dim.score:.1f} - {dim.recommendations[0] if dim.recommendations else 'Needs attention'}")
            elif dim.level == ScoreLevel.YELLOW:
                recommendations.append(f"[YELLOW] {name}: Score {dim.score:.1f} - {dim.recommendations[0] if dim.recommendations else 'Can be improved'}")

        # Recommendations based on trends
        if trend_report.regressions:
            recommendations.append(
                f"📉 Investigate regressions: {', '.join(trend_report.regressions[:3])}"
            )

        return recommendations[:10]  # Limit to top 10

    def _generate_next_actions(
        self, audit_result: AuditResult, trend_report: TrendReport
    ) -> List[str]:
        """Generate next actions for the team."""
        actions = []

        # Actions based on audit results
        from ..models import ScoreLevel

        red_dimensions = [
            name for name, dim in audit_result.dimensions.items() if dim.level == ScoreLevel.RED
        ]

        if red_dimensions:
            actions.append(f"Fix critical issues in: {', '.join(red_dimensions)}")

        yellow_dimensions = [
            name
            for name, dim in audit_result.dimensions.items()
            if dim.level == ScoreLevel.YELLOW
        ]

        if yellow_dimensions:
            actions.append(f"Improve: {', '.join(yellow_dimensions)}")

        # Actions based on trends
        if trend_report.regressions:
            actions.append("Investigate and address regressions")

        # General actions
        if audit_result.overall_score < 75:
            actions.append("Schedule team review of quality issues")

        actions.append("Run weekly Guardrail maintenance next week")

        return actions

    def _save_report(self, report: WeeklyReport):
        """Save report to disk."""
        # Save as JSON
        report_file = self.system.guardrail_dir / f"report_week_{report.week_number}.json"
        with open(report_file, "w") as f:
            json.dump(report.to_dict(), f, indent=2)

        # Also save as latest
        latest_file = self.system.guardrail_dir / "latest_report.json"
        with open(latest_file, "w") as f:
            json.dump(report.to_dict(), f, indent=2)

    def _generate_markdown_report(self, report: WeeklyReport):
        """Generate markdown report for easy reading."""
        # Format score without emojis for Windows compatibility
        score_level = report.audit_result.overall_level.value.upper()
        
        md_content = f"""# Guardrail Weekly Report - Week {report.week_number}

**Generated:** {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}

---

## Overall Score

**{report.audit_result.overall_score:.1f}/100** ({score_level})

---

## Dimension Scores

| Dimension | Score | Level | Trend |
|-----------|-------|-------|-------|
"""

        for name, dim in report.audit_result.dimensions.items():
            trend_data = report.trend_report.trends.get(name)
            if trend_data:
                change = trend_data.change
                if change > 5:
                    trend_str = f"+{change:.1f} (improving)"
                elif change < -5:
                    trend_str = f"{change:.1f} (worsening)"
                else:
                    trend_str = f"{change:+.1f} (stable)"
            else:
                trend_str = "N/A"

            md_content += f"| {name.replace('_', ' ').title()} | {dim.score:.1f} | {dim.level.value} | {trend_str} |\n"

        md_content += "\n---\n\n"

        # Critical Issues
        if report.audit_result.critical_issues:
            md_content += "## [CRITICAL] Issues\n\n"
            for issue in report.audit_result.critical_issues:
                md_content += f"- {issue}\n"
            md_content += "\n---\n\n"

        # Warnings
        if report.audit_result.warnings:
            md_content += "## [WARNING] Items to Address\n\n"
            for warning in report.audit_result.warnings[:5]:  # Limit to 5
                md_content += f"- {warning}\n"
            md_content += "\n---\n\n"

        # Trends
        md_content += "## Trends\n\n"

        if report.trend_report.improvements:
            md_content += "### Improvements\n\n"
            for improvement in report.trend_report.improvements:
                md_content += f"- {improvement}\n"
            md_content += "\n"

        if report.trend_report.regressions:
            md_content += "### Regressions\n\n"
            for regression in report.trend_report.regressions:
                md_content += f"- {regression}\n"
            md_content += "\n"

        if not report.trend_report.improvements and not report.trend_report.regressions:
            md_content += "No trend data available yet. Run weekly maintenance to track changes over time.\n\n"

        md_content += "---\n\n"

        # Fixes Applied
        if report.fixes_applied:
            md_content += "## Fixes Applied\n\n"
            for fix in report.fixes_applied:
                if fix.status == "applied":
                    md_content += f"- [APPLIED] {fix.issue}\n"
                    if fix.files_changed:
                        md_content += f"  - Files: {', '.join(fix.files_changed)}\n"
            md_content += "\n---\n\n"

        # Documentation Updates
        if report.docs_updated:
            md_content += "## Documentation Updated\n\n"
            for doc in report.docs_updated:
                md_content += f"- {doc}\n"
            md_content += "\n---\n\n"

        # Recommendations
        if report.recommendations:
            md_content += "## Recommendations\n\n"
            for rec in report.recommendations:
                # Remove emojis from recommendations
                clean_rec = rec.replace("🔴", "[RED]").replace("🟡", "[YELLOW]").replace("🟢", "[GREEN]")
                md_content += f"- {clean_rec}\n"
            md_content += "\n---\n\n"

        # Next Actions
        if report.next_actions:
            md_content += "## Next Actions\n\n"
            for action in report.next_actions:
                md_content += f"- [ ] {action}\n"
            md_content += "\n---\n\n"

        md_content += f"""
## Detailed Dimension Breakdown

"""

        for name, dim in report.audit_result.dimensions.items():
            md_content += f"### {name.replace('_', ' ').title()}\n\n"
            md_content += f"**Score:** {dim.score:.1f}/100 ({dim.level.value})\n\n"

            if dim.issues:
                md_content += "**Issues:**\n"
                for issue in dim.issues:
                    md_content += f"- {issue}\n"
                md_content += "\n"

            if dim.recommendations:
                md_content += "**Recommendations:**\n"
                for rec in dim.recommendations:
                    md_content += f"- {rec}\n"
                md_content += "\n"

        # Save markdown report
        md_file = self.repo_path / f"GUARDRAIL_REPORT_WEEK_{report.week_number}.md"
        md_file.write_text(md_content, encoding="utf-8")

        logger.info(f"  Markdown report saved: {md_file.name}")

