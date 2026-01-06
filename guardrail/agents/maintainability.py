"""
Maintainability Agent
=====================

Evaluates code quality, testing, deployment, documentation, and PRD compliance.
"""

import json
from pathlib import Path
from typing import Dict, List, Any
from datetime import datetime

from ..models import AuditResult, DimensionScore, ScoreLevel
from ..utils import logger, run_command, find_files, calculate_weighted_score


class MaintainabilityAgent:
    """
    MAINTAINABILITY AGENT
    - Evaluate code quality, linting, formatting, TypeScript strictness.
    - Measure test coverage and verify passing tests.
    - Verify deployment readiness (Docker, CI/CD, scripts, env files).
    - Evaluate documentation completeness and clarity.
    - Score each dimension: Red (0-49), Yellow (50-74), Green (75-100).
    - Provide actionable recommendations for dimensions scoring <75.
    """

    def __init__(self, system):
        self.system = system
        self.repo_path = system.repo_path
        self.config = system.config

    def audit(self, full: bool = True) -> AuditResult:
        """
        Run maintainability audit.

        Args:
            full: Whether to run full audit or quick check

        Returns:
            Complete audit results with scores and recommendations
        """
        logger.info("Running maintainability audit...")

        dimensions = {}

        # Evaluate each dimension
        dimensions["code_quality"] = self._evaluate_code_quality()
        dimensions["testing"] = self._evaluate_testing()
        dimensions["deployment"] = self._evaluate_deployment()
        dimensions["documentation"] = self._evaluate_documentation()
        dimensions["prd_compliance"] = self._evaluate_prd_compliance()

        # Calculate overall score
        scores = {name: dim.score for name, dim in dimensions.items()}
        weights = self.config["scoring"]
        overall_score = calculate_weighted_score(scores, weights)

        # Determine overall level
        if overall_score >= 75:
            overall_level = ScoreLevel.GREEN
        elif overall_score >= 50:
            overall_level = ScoreLevel.YELLOW
        else:
            overall_level = ScoreLevel.RED

        # Collect critical issues
        critical_issues = []
        warnings = []

        for name, dim in dimensions.items():
            if dim.level == ScoreLevel.RED:
                critical_issues.extend([f"[{name}] {issue}" for issue in dim.issues])
            elif dim.level == ScoreLevel.YELLOW:
                warnings.extend([f"[{name}] {issue}" for issue in dim.issues])

        result = AuditResult(
            timestamp=datetime.now().isoformat(),
            overall_score=overall_score,
            overall_level=overall_level,
            dimensions=dimensions,
            critical_issues=critical_issues,
            warnings=warnings,
            metadata={
                "full_audit": full,
                "repo_path": str(self.repo_path),
            },
        )

        logger.info(f"Audit complete: Overall score {overall_score:.1f} ({overall_level.value})")
        return result

    def _evaluate_code_quality(self) -> DimensionScore:
        """Evaluate code quality dimension."""
        logger.info("  Evaluating code quality...")

        issues = []
        recommendations = []
        score = 100.0

        # Check for linting configuration
        backend_eslint = (self.repo_path / "backend" / ".eslintrc.js").exists()
        frontend_eslint = (self.repo_path / "frontend" / ".eslintrc.js").exists()

        if not backend_eslint:
            issues.append("Backend ESLint configuration missing")
            score -= 15
            recommendations.append("Add .eslintrc.js to backend/")

        if not frontend_eslint:
            issues.append("Frontend ESLint configuration missing")
            score -= 15
            recommendations.append("Add .eslintrc.js to frontend/")

        # Check for TypeScript configuration
        backend_tsconfig = (self.repo_path / "backend" / "tsconfig.json").exists()
        frontend_tsconfig = (self.repo_path / "frontend" / "tsconfig.json").exists()

        if not backend_tsconfig:
            issues.append("Backend TypeScript configuration missing")
            score -= 10

        if not frontend_tsconfig:
            issues.append("Frontend TypeScript configuration missing")
            score -= 10

        # Run linting if possible
        lint_results = self._run_linting()
        if lint_results["backend"]["errors"] > 0:
            issues.append(f"Backend has {lint_results['backend']['errors']} linting errors")
            score -= min(20, lint_results["backend"]["errors"] * 2)
            recommendations.append("Fix backend linting errors: npm run lint --fix")

        if lint_results["frontend"]["errors"] > 0:
            issues.append(f"Frontend has {lint_results['frontend']['errors']} linting errors")
            score -= min(20, lint_results["frontend"]["errors"] * 2)
            recommendations.append("Fix frontend linting errors: npm run lint --fix")

        # Check for formatting
        prettier_config = (self.repo_path / ".prettierrc").exists() or (self.repo_path / "prettier.config.js").exists()
        if not prettier_config:
            issues.append("Prettier configuration missing")
            score -= 5
            recommendations.append("Add .prettierrc for consistent formatting")

        score = max(0, score)

        return DimensionScore.from_score(
            name="code_quality",
            score=score,
            issues=issues,
            recommendations=recommendations,
            details=lint_results,
        )

    def _evaluate_testing(self) -> DimensionScore:
        """Evaluate testing dimension."""
        logger.info("  Evaluating testing...")

        issues = []
        recommendations = []
        score = 100.0

        # Check for test files
        backend_tests = find_files(
            self.repo_path / "backend", ["*.spec.ts", "*.test.ts"], exclude=["**/node_modules/**"]
        )
        frontend_tests = find_files(
            self.repo_path / "frontend", ["*.spec.tsx", "*.test.tsx", "*.spec.ts", "*.test.ts"], exclude=["**/node_modules/**"]
        )

        if len(backend_tests) == 0:
            issues.append("No backend tests found")
            score -= 30
            recommendations.append("Add unit tests for backend services and controllers")

        if len(frontend_tests) == 0:
            issues.append("No frontend tests found")
            score -= 20
            recommendations.append("Add component tests for frontend")

        # Check for test configuration
        jest_config = (self.repo_path / "backend" / "jest.config.js").exists()
        if not jest_config:
            issues.append("Jest configuration missing")
            score -= 10

        # Try to run tests
        test_results = self._run_tests()

        if test_results["backend"]["status"] == "failed":
            issues.append(f"Backend tests failing: {test_results['backend'].get('failures', 0)} failures")
            score -= 20
            recommendations.append("Fix failing backend tests")

        if test_results["backend"]["coverage"] < 80:
            issues.append(f"Backend test coverage low: {test_results['backend']['coverage']}%")
            score -= 10
            recommendations.append("Increase test coverage to at least 80%")

        score = max(0, score)

        return DimensionScore.from_score(
            name="testing",
            score=score,
            issues=issues,
            recommendations=recommendations,
            details={
                "backend_tests": len(backend_tests),
                "frontend_tests": len(frontend_tests),
                "test_results": test_results,
            },
        )

    def _evaluate_deployment(self) -> DimensionScore:
        """Evaluate deployment readiness."""
        logger.info("  Evaluating deployment readiness...")

        issues = []
        recommendations = []
        score = 100.0

        # Check for Docker files
        docker_compose = (self.repo_path / "docker-compose.yml").exists()
        docker_compose_dev = (self.repo_path / "docker-compose.dev.yml").exists()
        backend_dockerfile = (self.repo_path / "backend" / "Dockerfile").exists()
        frontend_dockerfile = (self.repo_path / "frontend" / "Dockerfile").exists()

        if not docker_compose:
            issues.append("docker-compose.yml missing")
            score -= 20
            recommendations.append("Create docker-compose.yml for production deployment")

        if not docker_compose_dev:
            issues.append("docker-compose.dev.yml missing")
            score -= 10
            recommendations.append("Create docker-compose.dev.yml for development")

        if not backend_dockerfile:
            issues.append("Backend Dockerfile missing")
            score -= 15
            recommendations.append("Create Dockerfile for backend service")

        if not frontend_dockerfile:
            issues.append("Frontend Dockerfile missing")
            score -= 15
            recommendations.append("Create Dockerfile for frontend service")

        # Check for environment configuration
        env_example = (self.repo_path / ".env.example").exists()
        if not env_example:
            issues.append(".env.example missing")
            score -= 10
            recommendations.append("Create .env.example with all required environment variables")

        # Check for deployment scripts
        deploy_script = (self.repo_path / "deploy.sh").exists() or (self.repo_path / "deploy.ps1").exists()
        if not deploy_script:
            issues.append("Deployment script missing")
            score -= 10
            recommendations.append("Create deployment automation script")

        # Check for CI/CD configuration
        github_actions = (self.repo_path / ".github" / "workflows").exists()
        if not github_actions:
            issues.append("CI/CD configuration missing")
            score -= 10
            recommendations.append("Set up GitHub Actions for automated testing and deployment")

        score = max(0, score)

        return DimensionScore.from_score(
            name="deployment",
            score=score,
            issues=issues,
            recommendations=recommendations,
            details={
                "docker_compose": docker_compose,
                "dockerfiles": {
                    "backend": backend_dockerfile,
                    "frontend": frontend_dockerfile,
                },
                "env_example": env_example,
                "deploy_script": deploy_script,
                "ci_cd": github_actions,
            },
        )

    def _evaluate_documentation(self) -> DimensionScore:
        """Evaluate documentation completeness."""
        logger.info("  Evaluating documentation...")

        issues = []
        recommendations = []
        score = 100.0

        # Check for essential documentation files
        required_docs = {
            "README.md": 20,
            "DEPLOYMENT.md": 15,
            "RUNBOOK.md": 15,
            "docs/architecture.md": 10,
            "docs/PRD.md": 10,
        }

        for doc_file, weight in required_docs.items():
            doc_path = self.repo_path / doc_file
            if not doc_path.exists():
                issues.append(f"{doc_file} missing")
                score -= weight
                recommendations.append(f"Create {doc_file}")
            else:
                # Check if file is not empty
                content = doc_path.read_text(encoding="utf-8", errors="ignore")
                if len(content.strip()) < 100:
                    issues.append(f"{doc_file} is incomplete (too short)")
                    score -= weight / 2
                    recommendations.append(f"Expand {doc_file} with more details")

        # Check for API documentation
        api_docs = find_files(self.repo_path / "docs", ["*api*.md"])
        if len(api_docs) == 0:
            issues.append("API documentation missing")
            score -= 10
            recommendations.append("Document API endpoints and schemas")

        # Check for inline code documentation
        backend_files = find_files(self.repo_path / "backend", ["*.ts"], exclude=["**/node_modules/**"])
        documented_files = 0
        for file_path in backend_files[:10]:  # Sample first 10 files
            content = file_path.read_text(encoding="utf-8", errors="ignore")
            if "/**" in content or "* @" in content:
                documented_files += 1

        if documented_files < len(backend_files[:10]) * 0.5:
            issues.append("Low inline code documentation")
            score -= 10
            recommendations.append("Add JSDoc comments to functions and classes")

        score = max(0, score)

        return DimensionScore.from_score(
            name="documentation",
            score=score,
            issues=issues,
            recommendations=recommendations,
            details={
                "required_docs": {k: (self.repo_path / k).exists() for k in required_docs.keys()},
                "api_docs": len(api_docs),
            },
        )

    def _evaluate_prd_compliance(self) -> DimensionScore:
        """Evaluate PRD compliance."""
        logger.info("  Evaluating PRD compliance...")

        issues = []
        recommendations = []
        score = 100.0

        # Check if PRD exists
        prd_path = self.repo_path / "docs" / "PRD.md"
        if not prd_path.exists():
            issues.append("PRD.md not found")
            score = 0
            recommendations.append("Create Product Requirements Document (PRD)")
            return DimensionScore.from_score(
                name="prd_compliance",
                score=score,
                issues=issues,
                recommendations=recommendations,
            )

        # Get PRD mapping from interpreter
        prd_mapping = self.system.memory.get("prd_mapping", {})

        if prd_mapping.get("status") == "prd_not_found":
            issues.append("PRD mapping not available")
            score -= 50
            recommendations.append("Run baseline scan to map PRD requirements")
        else:
            total_reqs = prd_mapping.get("total_requirements", 0)
            implemented = prd_mapping.get("implemented", 0)

            if total_reqs > 0:
                implementation_rate = (implemented / total_reqs) * 100
                score = implementation_rate

                if implementation_rate < 75:
                    issues.append(f"Only {implemented}/{total_reqs} requirements implemented ({implementation_rate:.1f}%)")
                    recommendations.append("Implement remaining PRD requirements")

                if implementation_rate < 50:
                    issues.append("Critical PRD requirements missing")
                    recommendations.append("Prioritize P0 and P1 requirements")

        score = max(0, score)

        return DimensionScore.from_score(
            name="prd_compliance",
            score=score,
            issues=issues,
            recommendations=recommendations,
            details=prd_mapping,
        )

    def _run_linting(self) -> Dict[str, Any]:
        """Run linting and return results."""
        results = {
            "backend": {"errors": 0, "warnings": 0, "status": "not_run"},
            "frontend": {"errors": 0, "warnings": 0, "status": "not_run"},
        }

        # Try backend linting
        backend_path = self.repo_path / "backend"
        if backend_path.exists() and (backend_path / "package.json").exists():
            try:
                result = run_command(["npm", "run", "lint"], cwd=backend_path)
                results["backend"]["status"] = "success" if result.returncode == 0 else "failed"
                # Parse output for error count (simplified)
                if "error" in result.stdout.lower():
                    results["backend"]["errors"] = result.stdout.lower().count("error")
            except Exception as e:
                logger.debug(f"Backend linting failed: {e}")
                results["backend"]["status"] = "error"

        # Try frontend linting
        frontend_path = self.repo_path / "frontend"
        if frontend_path.exists() and (frontend_path / "package.json").exists():
            try:
                result = run_command(["npm", "run", "lint"], cwd=frontend_path)
                results["frontend"]["status"] = "success" if result.returncode == 0 else "failed"
                if "error" in result.stdout.lower():
                    results["frontend"]["errors"] = result.stdout.lower().count("error")
            except Exception as e:
                logger.debug(f"Frontend linting failed: {e}")
                results["frontend"]["status"] = "error"

        return results

    def _run_tests(self) -> Dict[str, Any]:
        """Run tests and return results."""
        results = {
            "backend": {"status": "not_run", "coverage": 0, "failures": 0},
            "frontend": {"status": "not_run", "coverage": 0, "failures": 0},
        }

        # Try backend tests
        backend_path = self.repo_path / "backend"
        if backend_path.exists() and (backend_path / "package.json").exists():
            try:
                result = run_command(["npm", "run", "test:cov"], cwd=backend_path)
                results["backend"]["status"] = "success" if result.returncode == 0 else "failed"

                # Parse coverage (simplified - would need proper parsing)
                if "coverage" in result.stdout.lower():
                    # Try to extract coverage percentage
                    import re

                    match = re.search(r"(\d+\.?\d*)%", result.stdout)
                    if match:
                        results["backend"]["coverage"] = float(match.group(1))
            except Exception as e:
                logger.debug(f"Backend tests failed: {e}")
                results["backend"]["status"] = "error"

        return results

