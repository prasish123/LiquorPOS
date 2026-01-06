"""
Guardrail CLI
=============

Command-line interface for Guardrail system.
"""

import argparse
import sys
import json
from pathlib import Path

from .core import GuardrailSystem
from .utils import logger


def main():
    """Main CLI entry point."""
    parser = argparse.ArgumentParser(
        description="Guardrail - Automated Code Quality & Maintainability System",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Update baseline understanding
  python -m guardrail baseline --repo . --update-memory

  # Run full audit
  python -m guardrail audit --repo . --full

  # Update trends
  python -m guardrail trend --repo . --update

  # Apply critical fixes
  python -m guardrail fix --repo . --critical-only

  # Update documentation
  python -m guardrail docs --repo . --update

  # Generate weekly report
  python -m guardrail report --repo . --weekly

  # Run complete weekly maintenance
  python -m guardrail weekly --repo . --auto

  # Enable Git hook
  python -m guardrail git-hook --enable
        """,
    )

    parser.add_argument(
        "command",
        choices=[
            "baseline",
            "audit",
            "trend",
            "fix",
            "docs",
            "report",
            "weekly",
            "git-hook",
            "git-check",
        ],
        help="Command to execute",
    )

    parser.add_argument(
        "--repo", default=".", help="Repository path (default: current directory)"
    )

    parser.add_argument("--update-memory", action="store_true", help="Update internal memory")
    parser.add_argument("--full", action="store_true", help="Run full audit")
    parser.add_argument("--update", action="store_true", help="Update trends/docs")
    parser.add_argument("--critical-only", action="store_true", help="Only fix critical issues")
    parser.add_argument("--weekly", action="store_true", help="Generate weekly report")
    parser.add_argument("--auto", action="store_true", help="Run automatically")
    parser.add_argument("--enable", action="store_true", help="Enable Git hook")
    parser.add_argument("--disable", action="store_true", help="Disable Git hook")
    parser.add_argument("--json", action="store_true", help="Output as JSON")

    args = parser.parse_args()

    try:
        # Initialize system
        system = GuardrailSystem(args.repo)

        # Execute command
        if args.command == "baseline":
            result = system.update_baseline(update_memory=args.update_memory)
            _output_result(result, args.json)

        elif args.command == "audit":
            result = system.run_audit(full=args.full)
            # Save audit result
            audit_file = system.guardrail_dir / "latest_audit.json"
            with open(audit_file, "w") as f:
                json.dump(result.to_dict(), f, indent=2)
            _output_result(result.to_dict(), args.json)

        elif args.command == "trend":
            result = system.update_trends()
            # Save trend result
            trend_file = system.guardrail_dir / "latest_trend.json"
            with open(trend_file, "w") as f:
                json.dump(result.to_dict(), f, indent=2)
            _output_result(result.to_dict(), args.json)

        elif args.command == "fix":
            result = system.apply_fixes(critical_only=args.critical_only)
            # Save fixes result
            fixes_file = system.guardrail_dir / "latest_fixes.json"
            with open(fixes_file, "w") as f:
                json.dump(result, f, indent=2)
            _output_result(result, args.json)

        elif args.command == "docs":
            result = system.update_documentation()
            # Save docs result
            docs_file = system.guardrail_dir / "latest_docs.json"
            with open(docs_file, "w") as f:
                json.dump(result, f, indent=2)
            _output_result(result, args.json)

        elif args.command == "report":
            result = system.generate_report(weekly=args.weekly)
            _output_result(result.to_dict(), args.json)

        elif args.command == "weekly":
            result = system.run_weekly_maintenance()
            _output_result(result, args.json)

        elif args.command == "git-hook":
            if args.enable:
                system.enable_git_hook()
            elif args.disable:
                system.disable_git_hook()
            else:
                logger.error("Specify --enable or --disable")
                return 1

        elif args.command == "git-check":
            # Run quick check for Git pre-commit hook
            result = system.run_audit(full=False)
            min_score = system.config["git_hook"]["min_score"]

            if result.overall_score < min_score:
                logger.error(
                    f"❌ Code quality check failed: {result.overall_score:.1f} < {min_score}"
                )
                logger.error("Critical issues:")
                for issue in result.critical_issues[:5]:
                    logger.error(f"  - {issue}")
                return 1
            else:
                logger.info(f"Code quality check passed: {result.overall_score:.1f}")
                return 0

        return 0

    except Exception as e:
        logger.error(f"Error: {e}")
        if not args.json:
            import traceback

            traceback.print_exc()
        return 1


def _output_result(result, as_json: bool):
    """Output result in requested format."""
    if as_json:
        print(json.dumps(result, indent=2))
    else:
        # Pretty print for human consumption
        if isinstance(result, dict):
            _pretty_print_dict(result)
        else:
            print(result)


def _pretty_print_dict(data: dict, indent: int = 0):
    """Pretty print dictionary."""
    for key, value in data.items():
        if isinstance(value, dict):
            print("  " * indent + f"{key}:")
            _pretty_print_dict(value, indent + 1)
        elif isinstance(value, list):
            print("  " * indent + f"{key}:")
            for item in value[:10]:  # Limit to 10 items
                if isinstance(item, dict):
                    _pretty_print_dict(item, indent + 1)
                else:
                    print("  " * (indent + 1) + f"- {item}")
        else:
            print("  " * indent + f"{key}: {value}")


if __name__ == "__main__":
    sys.exit(main())

