"""
Agentic Fix Loop
================

Automatically proposes and applies safe fixes for critical issues.
"""

import json
from pathlib import Path
from typing import Dict, List, Any, Optional
from datetime import datetime

from ..models import FixResult
from ..utils import logger, run_command, find_files


class AgenticFixLoop:
    """
    AGENTIC FIX LOOP
    - Only address Red-level critical issues identified by the audit.
    - For each issue:
       1. List minimal files to change.
       2. Describe exact changes.
       3. Implement safely without breaking existing functionality.
       4. Self-review correctness, edge cases, and security.
       5. Generate verification steps including unit/integration tests.
    - Update memory after fixes.
    """

    def __init__(self, system):
        self.system = system
        self.repo_path = system.repo_path

    def apply_fixes(self, critical_only: bool = True) -> Dict[str, Any]:
        """
        Apply agentic fix loop for identified issues.

        Args:
            critical_only: Only fix critical (red-level) issues

        Returns:
            Fix results including files changed and verification steps
        """
        logger.info("Starting agentic fix loop...")

        # Get latest audit results
        audit_result = self._get_latest_audit()
        if not audit_result:
            logger.warning("No audit results found, run audit first")
            return {"status": "no_audit", "fixes": []}

        # Identify issues to fix
        issues_to_fix = self._identify_fixable_issues(audit_result, critical_only)

        if not issues_to_fix:
            logger.info("No fixable issues found")
            return {"status": "no_issues", "fixes": []}

        logger.info(f"Found {len(issues_to_fix)} fixable issues")

        # Apply fixes
        fixes = []
        for issue in issues_to_fix:
            fix_result = self._apply_fix(issue)
            fixes.append(fix_result)

            if fix_result.status == "applied":
                logger.info(f"  Fixed: {issue['description']}")
            elif fix_result.status == "skipped":
                logger.info(f"  Skipped: {issue['description']}")
            else:
                logger.warning(f"  Failed: {issue['description']}")

        # Update memory
        self.system.memory["last_fix_run"] = datetime.now().isoformat()
        self.system.memory["fixes_applied"] = len([f for f in fixes if f.status == "applied"])
        self.system.save_memory()

        return {
            "status": "complete",
            "total_issues": len(issues_to_fix),
            "fixes_applied": len([f for f in fixes if f.status == "applied"]),
            "fixes_skipped": len([f for f in fixes if f.status == "skipped"]),
            "fixes_failed": len([f for f in fixes if f.status == "failed"]),
            "fixes": fixes,
        }

    def _get_latest_audit(self) -> Optional[Dict[str, Any]]:
        """Get the most recent audit result."""
        audit_file = self.system.guardrail_dir / "latest_audit.json"

        if not audit_file.exists():
            return None

        with open(audit_file, "r") as f:
            return json.load(f)

    def _identify_fixable_issues(
        self, audit_result: Dict[str, Any], critical_only: bool
    ) -> List[Dict[str, Any]]:
        """Identify issues that can be automatically fixed."""
        fixable_issues = []

        # Get critical issues
        if critical_only:
            issues = audit_result.get("critical_issues", [])
        else:
            issues = audit_result.get("critical_issues", []) + audit_result.get("warnings", [])

        # Map issues to fixable actions
        for issue in issues:
            fixable = self._map_issue_to_fix(issue)
            if fixable:
                fixable_issues.append(fixable)

        return fixable_issues

    def _map_issue_to_fix(self, issue: str) -> Optional[Dict[str, Any]]:
        """Map an issue to a fixable action."""
        issue_lower = issue.lower()

        # Missing configuration files
        if "eslint configuration missing" in issue_lower:
            if "backend" in issue_lower:
                return {
                    "type": "create_file",
                    "description": issue,
                    "file": "backend/.eslintrc.js",
                    "content": self._get_eslint_config(),
                }
            elif "frontend" in issue_lower:
                return {
                    "type": "create_file",
                    "description": issue,
                    "file": "frontend/.eslintrc.js",
                    "content": self._get_eslint_config(),
                }

        # Missing Prettier configuration
        if "prettier configuration missing" in issue_lower:
            return {
                "type": "create_file",
                "description": issue,
                "file": ".prettierrc",
                "content": self._get_prettier_config(),
            }

        # Missing .env.example
        if ".env.example missing" in issue_lower:
            return {
                "type": "create_file",
                "description": issue,
                "file": ".env.example",
                "content": self._get_env_example(),
            }

        # Missing documentation
        if "readme.md missing" in issue_lower:
            return {
                "type": "create_file",
                "description": issue,
                "file": "README.md",
                "content": self._get_readme_template(),
            }

        # Linting errors (can be auto-fixed)
        if "linting errors" in issue_lower and "backend" in issue_lower:
            return {
                "type": "run_command",
                "description": issue,
                "command": ["npm", "run", "lint", "--", "--fix"],
                "cwd": "backend",
            }

        if "linting errors" in issue_lower and "frontend" in issue_lower:
            return {
                "type": "run_command",
                "description": issue,
                "command": ["npm", "run", "lint", "--", "--fix"],
                "cwd": "frontend",
            }

        # Format code
        if "formatting" in issue_lower:
            return {
                "type": "run_command",
                "description": issue,
                "command": ["npm", "run", "format"],
                "cwd": ".",
            }

        # Issue not automatically fixable
        return None

    def _apply_fix(self, issue: Dict[str, Any]) -> FixResult:
        """Apply a specific fix."""
        fix_type = issue["type"]

        try:
            if fix_type == "create_file":
                return self._create_file_fix(issue)
            elif fix_type == "run_command":
                return self._run_command_fix(issue)
            else:
                return FixResult(
                    issue=issue["description"],
                    status="skipped",
                    description="Unknown fix type",
                )
        except Exception as e:
            logger.error(f"Fix failed: {e}")
            return FixResult(
                issue=issue["description"],
                status="failed",
                error=str(e),
            )

    def _create_file_fix(self, issue: Dict[str, Any]) -> FixResult:
        """Create a missing file."""
        file_path = self.repo_path / issue["file"]

        # Check if file already exists
        if file_path.exists():
            return FixResult(
                issue=issue["description"],
                status="skipped",
                description="File already exists",
            )

        # Create parent directories
        file_path.parent.mkdir(parents=True, exist_ok=True)

        # Write file
        file_path.write_text(issue["content"], encoding="utf-8")

        return FixResult(
            issue=issue["description"],
            status="applied",
            files_changed=[issue["file"]],
            description=f"Created {issue['file']}",
            verification_steps=[
                f"Verify {issue['file']} exists",
                f"Review {issue['file']} content",
            ],
        )

    def _run_command_fix(self, issue: Dict[str, Any]) -> FixResult:
        """Run a command to fix an issue."""
        cwd = self.repo_path / issue["cwd"] if issue["cwd"] != "." else self.repo_path

        result = run_command(issue["command"], cwd=cwd)

        if result.returncode == 0:
            return FixResult(
                issue=issue["description"],
                status="applied",
                description=f"Ran: {' '.join(issue['command'])}",
                verification_steps=[
                    "Run tests to verify no breakage",
                    "Review changed files",
                ],
            )
        else:
            return FixResult(
                issue=issue["description"],
                status="failed",
                description=f"Command failed: {' '.join(issue['command'])}",
                error=result.stderr,
            )

    def _get_eslint_config(self) -> str:
        """Get ESLint configuration template."""
        return """module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: 'tsconfig.json',
    tsconfigRootDir: __dirname,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint/eslint-plugin'],
  extends: [
    'plugin:@typescript-eslint/recommended',
    'plugin:prettier/recommended',
  ],
  root: true,
  env: {
    node: true,
    jest: true,
  },
  ignorePatterns: ['.eslintrc.js', 'dist', 'node_modules'],
  rules: {
    '@typescript-eslint/interface-name-prefix': 'off',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-explicit-any': 'warn',
  },
};
"""

    def _get_prettier_config(self) -> str:
        """Get Prettier configuration template."""
        return """{
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2,
  "semi": true
}
"""

    def _get_env_example(self) -> str:
        """Get .env.example template."""
        return """# Database Configuration
DATABASE_URL=postgresql://user:password@localhost:5432/liquor_pos
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=postgres
DATABASE_PASSWORD=postgres
DATABASE_NAME=liquor_pos

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT Configuration
JWT_SECRET=your-secret-key-here
JWT_EXPIRATION=24h

# Application Configuration
NODE_ENV=development
PORT=3000
FRONTEND_URL=http://localhost:5173

# Payment Gateway (PAX)
PAX_TERMINAL_IP=192.168.1.100
PAX_TERMINAL_PORT=10009

# Logging
LOG_LEVEL=info
"""

    def _get_readme_template(self) -> str:
        """Get README.md template."""
        return """# Liquor POS System

Modern point-of-sale system for Florida liquor stores.

## Features

- Inventory management
- Sales processing
- Payment integration (PAX)
- Compliance tracking
- Reporting and analytics

## Quick Start

1. Clone the repository
2. Copy `.env.example` to `.env` and configure
3. Run `docker-compose up`
4. Access the application at http://localhost:5173

## Documentation

- [Deployment Guide](DEPLOYMENT.md)
- [Architecture](docs/architecture.md)
- [API Documentation](docs/api.md)

## Development

```bash
# Install dependencies
npm install

# Start development servers
docker-compose -f docker-compose.dev.yml up

# Run tests
npm test

# Run linting
npm run lint
```

## License

See [LICENSE](LICENSE) file for details.
"""

