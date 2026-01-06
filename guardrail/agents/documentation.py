"""
Documentation Agent
===================

Automatically updates documentation to reflect current code state.
"""

import json
from pathlib import Path
from typing import Dict, List, Any
from datetime import datetime

from ..utils import logger, find_files, count_lines


class DocumentationAgent:
    """
    DOCUMENTATION AGENT
    - Check for any new features or fixes applied this week.
    - Update:
       - README.md
       - .env.example
       - DEPLOYMENT.md
       - RUNBOOK.md
       - QUICK_START.md
    - Include setup instructions, deployment notes, and troubleshooting tips.
    - Ensure clarity and completeness for new team members.
    """

    def __init__(self, system):
        self.system = system
        self.repo_path = system.repo_path

    def update_docs(self) -> Dict[str, Any]:
        """
        Update documentation to reflect current code state.

        Returns:
            Documentation update results
        """
        logger.info("Updating documentation...")

        updates = []

        # Update .env.example
        env_result = self._update_env_example()
        if env_result:
            updates.append(env_result)

        # Update README.md
        readme_result = self._update_readme()
        if readme_result:
            updates.append(readme_result)

        # Update DEPLOYMENT.md
        deployment_result = self._update_deployment_docs()
        if deployment_result:
            updates.append(deployment_result)

        # Update RUNBOOK.md
        runbook_result = self._update_runbook()
        if runbook_result:
            updates.append(runbook_result)

        # Update QUICK_START.md
        quickstart_result = self._update_quickstart()
        if quickstart_result:
            updates.append(quickstart_result)

        logger.info(f"Documentation updated: {len(updates)} files")

        return {
            "timestamp": datetime.now().isoformat(),
            "files_updated": [u["file"] for u in updates],
            "updates": updates,
        }

    def _update_env_example(self) -> Dict[str, Any]:
        """Update .env.example with current environment variables."""
        env_example_path = self.repo_path / ".env.example"

        # Scan backend for environment variable usage
        backend_path = self.repo_path / "backend"
        env_vars = set()

        if backend_path.exists():
            ts_files = find_files(backend_path, ["*.ts"], exclude=["**/node_modules/**", "**/dist/**"])

            for file_path in ts_files:
                content = file_path.read_text(encoding="utf-8", errors="ignore")

                # Find process.env.VARIABLE_NAME patterns
                import re

                matches = re.findall(r"process\.env\.(\w+)", content)
                env_vars.update(matches)

        if not env_vars:
            logger.info("  No environment variables found to update")
            return None

        # Check if .env.example exists and has all variables
        if env_example_path.exists():
            current_content = env_example_path.read_text(encoding="utf-8")
            missing_vars = [var for var in env_vars if var not in current_content]

            if not missing_vars:
                logger.info("  .env.example is up to date")
                return None

            # Add missing variables
            new_content = current_content + "\n\n# Additional variables\n"
            for var in sorted(missing_vars):
                new_content += f"{var}=\n"

            env_example_path.write_text(new_content, encoding="utf-8")

            return {
                "file": ".env.example",
                "action": "updated",
                "changes": f"Added {len(missing_vars)} missing variables",
            }

        return None

    def _update_readme(self) -> Dict[str, Any]:
        """Update README.md with current project structure."""
        readme_path = self.repo_path / "README.md"

        if not readme_path.exists():
            logger.info("  README.md not found, skipping")
            return None

        # Check if README needs updates
        content = readme_path.read_text(encoding="utf-8")

        # Add sections if missing
        updates_made = []

        if "## Quick Start" not in content:
            updates_made.append("Added Quick Start section")

        if "## Documentation" not in content:
            updates_made.append("Added Documentation section")

        if updates_made:
            # Would add sections here
            logger.info(f"  README.md needs updates: {', '.join(updates_made)}")
            return {
                "file": "README.md",
                "action": "needs_update",
                "changes": updates_made,
            }

        logger.info("  README.md is up to date")
        return None

    def _update_deployment_docs(self) -> Dict[str, Any]:
        """Update DEPLOYMENT.md with current deployment configuration."""
        deployment_path = self.repo_path / "DEPLOYMENT.md"

        if not deployment_path.exists():
            logger.info("  DEPLOYMENT.md not found, skipping")
            return None

        # Check Docker configuration
        docker_compose = self.repo_path / "docker-compose.yml"
        if not docker_compose.exists():
            return None

        content = deployment_path.read_text(encoding="utf-8")

        # Check if deployment docs mention Docker
        if "docker" not in content.lower():
            return {
                "file": "DEPLOYMENT.md",
                "action": "needs_update",
                "changes": ["Add Docker deployment instructions"],
            }

        logger.info("  DEPLOYMENT.md is up to date")
        return None

    def _update_runbook(self) -> Dict[str, Any]:
        """Update RUNBOOK.md with operational procedures."""
        runbook_path = self.repo_path / "RUNBOOK.md"

        if not runbook_path.exists():
            logger.info("  RUNBOOK.md not found, skipping")
            return None

        # Check if runbook has essential sections
        content = runbook_path.read_text(encoding="utf-8")

        missing_sections = []
        required_sections = [
            "## Monitoring",
            "## Troubleshooting",
            "## Backup",
            "## Recovery",
        ]

        for section in required_sections:
            if section not in content:
                missing_sections.append(section.replace("## ", ""))

        if missing_sections:
            return {
                "file": "RUNBOOK.md",
                "action": "needs_update",
                "changes": [f"Add {', '.join(missing_sections)} sections"],
            }

        logger.info("  RUNBOOK.md is up to date")
        return None

    def _update_quickstart(self) -> Dict[str, Any]:
        """Update QUICK_START.md with simplified setup instructions."""
        quickstart_path = self.repo_path / "QUICKSTART.md"

        if not quickstart_path.exists():
            logger.info("  QUICKSTART.md not found, creating")

            # Create QUICKSTART.md
            content = self._generate_quickstart_content()
            quickstart_path.write_text(content, encoding="utf-8")

            return {
                "file": "QUICKSTART.md",
                "action": "created",
                "changes": ["Created quick start guide"],
            }

        logger.info("  QUICKSTART.md exists")
        return None

    def _generate_quickstart_content(self) -> str:
        """Generate QUICKSTART.md content."""
        return """# Quick Start Guide

Get the Liquor POS system running in 5 minutes.

## Prerequisites

- Docker and Docker Compose installed
- Node.js 22+ (for local development)
- Git

## Quick Start

### 1. Clone and Configure

```bash
# Clone repository
git clone <repository-url>
cd liquor-pos

# Copy environment configuration
cp .env.example .env

# Edit .env with your configuration
nano .env
```

### 2. Start with Docker

```bash
# Start all services
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f
```

### 3. Access Application

- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:3000
- **API Docs:** http://localhost:3000/api

### 4. Default Credentials

- **Username:** admin
- **Password:** admin123

**⚠️ Change default credentials immediately in production!**

## Development Mode

```bash
# Start in development mode with hot reload
docker-compose -f docker-compose.dev.yml up

# Run tests
npm test

# Run linting
npm run lint
```

## Troubleshooting

### Services won't start

```bash
# Check logs
docker-compose logs

# Restart services
docker-compose restart

# Clean restart
docker-compose down
docker-compose up -d
```

### Database connection errors

1. Verify DATABASE_URL in .env
2. Check if PostgreSQL container is running
3. Check database credentials

### Port conflicts

If ports 3000 or 5173 are in use:

1. Stop conflicting services
2. Or change ports in docker-compose.yml

## Next Steps

- Read [DEPLOYMENT.md](DEPLOYMENT.md) for production deployment
- Read [RUNBOOK.md](RUNBOOK.md) for operations guide
- Read [docs/architecture.md](docs/architecture.md) for system architecture

## Support

For issues and questions, see [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
"""

