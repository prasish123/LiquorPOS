#!/usr/bin/env python3
"""
Guardrail Weekly Maintenance Script
====================================

Single command to run complete weekly maintenance routine.

Usage:
    python guardrail-weekly.py
    python guardrail-weekly.py --repo /path/to/repo
    python guardrail-weekly.py --dry-run
"""

import sys
import argparse
from pathlib import Path

# Add guardrail to path
sys.path.insert(0, str(Path(__file__).parent))

from guardrail.core import GuardrailSystem
from guardrail.utils import logger


def main():
    parser = argparse.ArgumentParser(
        description="Run complete Guardrail weekly maintenance routine"
    )
    parser.add_argument(
        "--repo", default=".", help="Repository path (default: current directory)"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show what would be done without making changes",
    )
    parser.add_argument(
        "--skip-fixes",
        action="store_true",
        help="Skip automatic fixes (only audit and report)",
    )

    args = parser.parse_args()

    if args.dry_run:
        logger.info("=" * 60)
        logger.info("DRY RUN MODE - No changes will be made")
        logger.info("=" * 60)
        logger.info("\nWeekly maintenance would perform:")
        logger.info("  1. Update baseline understanding")
        logger.info("  2. Run full maintainability audit")
        logger.info("  3. Update trend tracking")
        logger.info("  4. Apply critical fixes (if not skipped)")
        logger.info("  5. Update documentation")
        logger.info("  6. Generate weekly report")
        logger.info("\nRun without --dry-run to execute")
        return 0

    try:
        # Initialize system
        system = GuardrailSystem(args.repo)

        # Run weekly maintenance
        if args.skip_fixes:
            logger.info("Running weekly maintenance (skipping fixes)...")

            # Manual steps without fixes
            logger.info("\n[Step 1/5] Updating baseline...")
            system.update_baseline(update_memory=True)

            logger.info("\n[Step 2/5] Running maintainability audit...")
            system.run_audit(full=True)

            logger.info("\n[Step 3/5] Updating trend tracking...")
            system.update_trends()

            logger.info("\n[Step 4/5] Updating documentation...")
            system.update_documentation()

            logger.info("\n[Step 5/5] Generating weekly report...")
            system.generate_report(weekly=True)

            logger.info("\n✅ Weekly maintenance complete (fixes skipped)")
        else:
            result = system.run_weekly_maintenance()

            if result["status"] == "success":
                logger.info("\n" + "=" * 60)
                logger.info("✅ WEEKLY MAINTENANCE COMPLETE")
                logger.info("=" * 60)
                logger.info(f"\nReport saved: GUARDRAIL_REPORT_WEEK_*.md")
                logger.info(f"Review the report for detailed results and next actions")
                return 0
            else:
                logger.error("\n❌ Weekly maintenance failed")
                return 1

    except Exception as e:
        logger.error(f"\n❌ Error: {e}")
        import traceback

        traceback.print_exc()
        return 1


if __name__ == "__main__":
    sys.exit(main())

