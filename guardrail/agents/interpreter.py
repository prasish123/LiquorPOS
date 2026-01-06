"""
Interpreter Agent
=================

Scans repository, maps features to PRD, and maintains baseline understanding.
"""

import json
from pathlib import Path
from typing import Dict, List, Any
from datetime import datetime

from ..utils import logger, find_files, count_lines, load_json


class InterpreterAgent:
    """
    INTERPRETER AGENT
    - Scan entire repo for current code, file structure, and PRD implementation.
    - Map features to PRD requirements.
    - Update internal memory to reflect current repo state.
    - Identify any gaps in PRD coverage.
    """

    def __init__(self, system):
        self.system = system
        self.repo_path = system.repo_path

    def scan_repository(self) -> Dict[str, Any]:
        """
        Scan the entire repository and build baseline understanding.

        Returns:
            Dictionary with repo structure, PRD mapping, and gaps
        """
        logger.info("Scanning repository structure...")

        result = {
            "timestamp": datetime.now().isoformat(),
            "structure": self._analyze_structure(),
            "prd_mapping": self._map_prd_requirements(),
            "gaps": self._identify_gaps(),
            "statistics": self._calculate_statistics(),
        }

        logger.info(f"Repository scan complete: {result['statistics']['total_files']} files analyzed")
        return result

    def _analyze_structure(self) -> Dict[str, Any]:
        """Analyze repository file structure."""
        structure = {
            "backend": self._scan_directory(self.repo_path / "backend"),
            "frontend": self._scan_directory(self.repo_path / "frontend"),
            "docs": self._scan_directory(self.repo_path / "docs"),
            "scripts": self._scan_directory(self.repo_path / "scripts"),
            "config": self._scan_config_files(),
        }

        return structure

    def _scan_directory(self, path: Path) -> Dict[str, Any]:
        """Scan a specific directory."""
        if not path.exists():
            return {"exists": False}

        files = {
            "typescript": find_files(path, ["*.ts", "*.tsx"], exclude=["**/node_modules/**", "**/dist/**"]),
            "javascript": find_files(path, ["*.js", "*.jsx"], exclude=["**/node_modules/**", "**/dist/**"]),
            "python": find_files(path, ["*.py"], exclude=["**/__pycache__/**", "**/venv/**"]),
            "config": find_files(path, ["*.json", "*.yaml", "*.yml"], exclude=["**/node_modules/**"]),
        }

        total_lines = sum(count_lines(f) for file_list in files.values() for f in file_list)

        return {
            "exists": True,
            "files": {k: [str(f.relative_to(self.repo_path)) for f in v] for k, v in files.items()},
            "total_files": sum(len(v) for v in files.values()),
            "total_lines": total_lines,
        }

    def _scan_config_files(self) -> Dict[str, bool]:
        """Check for essential configuration files."""
        config_files = {
            "docker-compose.yml": (self.repo_path / "docker-compose.yml").exists(),
            "docker-compose.dev.yml": (self.repo_path / "docker-compose.dev.yml").exists(),
            ".env.example": (self.repo_path / ".env.example").exists(),
            "package.json": (self.repo_path / "package.json").exists(),
            "README.md": (self.repo_path / "README.md").exists(),
            "DEPLOYMENT.md": (self.repo_path / "DEPLOYMENT.md").exists(),
            "RUNBOOK.md": (self.repo_path / "RUNBOOK.md").exists(),
        }

        return config_files

    def _map_prd_requirements(self) -> Dict[str, Any]:
        """Map implemented features to PRD requirements."""
        prd_path = self.repo_path / "docs" / "PRD.md"

        if not prd_path.exists():
            logger.warning("PRD.md not found, skipping requirement mapping")
            return {"status": "prd_not_found"}

        # Read PRD and extract requirements
        with open(prd_path, "r", encoding="utf-8") as f:
            prd_content = f.read()

        # Parse requirements (simplified - would need more sophisticated parsing)
        requirements = self._extract_requirements(prd_content)

        # Map to implementation
        mapping = {}
        for req_id, req_data in requirements.items():
            mapping[req_id] = {
                "title": req_data["title"],
                "priority": req_data.get("priority", "unknown"),
                "implemented": self._check_implementation(req_id, req_data),
                "files": self._find_related_files(req_id, req_data),
            }

        return {
            "status": "mapped",
            "total_requirements": len(requirements),
            "implemented": sum(1 for m in mapping.values() if m["implemented"]),
            "mapping": mapping,
        }

    def _extract_requirements(self, prd_content: str) -> Dict[str, Dict[str, Any]]:
        """Extract requirements from PRD content."""
        # Simplified requirement extraction
        # In production, this would use more sophisticated parsing
        requirements = {}

        lines = prd_content.split("\n")
        current_req = None

        for line in lines:
            # Look for requirement IDs (e.g., REQ-001, REQ-002)
            if line.startswith("## REQ-") or line.startswith("### REQ-"):
                req_id = line.split()[1].strip(":")
                current_req = req_id
                requirements[req_id] = {
                    "title": " ".join(line.split()[2:]),
                    "priority": "unknown",
                }
            elif current_req and "Priority:" in line:
                priority = line.split("Priority:")[1].strip().split()[0]
                requirements[current_req]["priority"] = priority

        return requirements

    def _check_implementation(self, req_id: str, req_data: Dict[str, Any]) -> bool:
        """Check if requirement is implemented."""
        # Simplified implementation check
        # In production, would check for specific code patterns, tests, etc.
        title_lower = req_data["title"].lower()

        # Check for related files
        related_files = self._find_related_files(req_id, req_data)
        return len(related_files) > 0

    def _find_related_files(self, req_id: str, req_data: Dict[str, Any]) -> List[str]:
        """Find files related to a requirement."""
        # Simplified file search based on requirement keywords
        keywords = req_data["title"].lower().split()
        related = []

        # Search in backend and frontend
        for directory in ["backend", "frontend"]:
            dir_path = self.repo_path / directory
            if dir_path.exists():
                for file_path in find_files(dir_path, ["*.ts", "*.tsx", "*.js", "*.jsx"]):
                    file_content = file_path.read_text(encoding="utf-8", errors="ignore").lower()
                    if any(keyword in file_content for keyword in keywords):
                        related.append(str(file_path.relative_to(self.repo_path)))

        return related[:10]  # Limit to 10 files

    def _identify_gaps(self) -> List[Dict[str, Any]]:
        """Identify gaps in PRD coverage."""
        gaps = []

        # Check for missing critical files
        critical_files = {
            "README.md": "Project documentation",
            "DEPLOYMENT.md": "Deployment instructions",
            ".env.example": "Environment configuration template",
            "docker-compose.yml": "Docker configuration",
        }

        for file_name, description in critical_files.items():
            if not (self.repo_path / file_name).exists():
                gaps.append({
                    "type": "missing_file",
                    "severity": "high",
                    "file": file_name,
                    "description": f"Missing {description}",
                })

        # Check for missing tests
        backend_tests = find_files(
            self.repo_path / "backend", ["*.spec.ts", "*.test.ts"], exclude=["**/node_modules/**"]
        )
        if len(backend_tests) == 0:
            gaps.append({
                "type": "missing_tests",
                "severity": "critical",
                "description": "No backend tests found",
            })

        return gaps

    def _calculate_statistics(self) -> Dict[str, Any]:
        """Calculate repository statistics."""
        all_files = []
        total_lines = 0

        for directory in ["backend", "frontend", "docs", "scripts"]:
            dir_path = self.repo_path / directory
            if dir_path.exists():
                files = find_files(
                    dir_path,
                    ["*.ts", "*.tsx", "*.js", "*.jsx", "*.py", "*.md"],
                    exclude=["**/node_modules/**", "**/dist/**", "**/__pycache__/**"],
                )
                all_files.extend(files)
                total_lines += sum(count_lines(f) for f in files)

        return {
            "total_files": len(all_files),
            "total_lines": total_lines,
            "backend_files": len(find_files(self.repo_path / "backend", ["*.ts"], exclude=["**/node_modules/**"])),
            "frontend_files": len(find_files(self.repo_path / "frontend", ["*.tsx", "*.ts"], exclude=["**/node_modules/**"])),
            "test_files": len(find_files(self.repo_path, ["*.spec.ts", "*.test.ts"], exclude=["**/node_modules/**"])),
        }

