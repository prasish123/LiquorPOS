#!/usr/bin/env node

/**
 * Maintainability Score Calculator
 * Runs on every commit to track code quality
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const WEIGHTS = {
  codeOrganization: 0.20,
  documentation: 0.25,
  testing: 0.20,
  errorHandling: 0.15,
  deployment: 0.15,
  codeQuality: 0.05,
};

const THRESHOLDS = {
  excellent: 85,
  good: 70,
  fair: 55,
  poor: 40,
};

class MaintainabilityCalculator {
  constructor() {
    this.scores = {};
    this.details = {};
  }

  /**
   * Calculate overall maintainability score
   */
  async calculate() {
    console.log('🔍 Calculating maintainability score...\n');

    // Calculate each dimension
    this.scores.codeOrganization = await this.checkCodeOrganization();
    this.scores.documentation = await this.checkDocumentation();
    this.scores.testing = await this.checkTesting();
    this.scores.errorHandling = await this.checkErrorHandling();
    this.scores.deployment = await this.checkDeployment();
    this.scores.codeQuality = await this.checkCodeQuality();

    // Calculate weighted score
    const totalScore = Object.keys(this.scores).reduce((sum, key) => {
      return sum + (this.scores[key] * WEIGHTS[key]);
    }, 0);

    return Math.round(totalScore);
  }

  /**
   * Check code organization
   */
  async checkCodeOrganization() {
    console.log('📁 Checking code organization...');
    let score = 100;
    const issues = [];

    // Check for consistent folder structure
    const requiredDirs = [
      'backend/src/orders',
      'backend/src/products',
      'backend/src/customers',
      'backend/src/auth',
      'backend/src/common',
    ];

    for (const dir of requiredDirs) {
      if (!fs.existsSync(dir)) {
        score -= 10;
        issues.push(`Missing directory: ${dir}`);
      }
    }

    // Check for large files (>500 lines)
    try {
      const largeFiles = execSync(
        'find backend/src -name "*.ts" -type f -exec wc -l {} + | awk \'$1 > 500 {print $2}\' | wc -l',
        { encoding: 'utf8' }
      ).trim();
      
      if (parseInt(largeFiles) > 5) {
        score -= 20;
        issues.push(`${largeFiles} files over 500 lines`);
      }
    } catch (e) {
      // Skip on Windows
    }

    this.details.codeOrganization = { score, issues };
    console.log(`   Score: ${score}/100`);
    return score;
  }

  /**
   * Check documentation
   */
  async checkDocumentation() {
    console.log('📚 Checking documentation...');
    let score = 0;
    const issues = [];

    // Required documentation files
    const requiredDocs = {
      'README.md': 20,
      'docs/QUICK_START.md': 15,
      'docs/DEPLOYMENT.md': 15,
      'docs/ARCHITECTURE.md': 10,
      'docs/TROUBLESHOOTING.md': 10,
      'docs/CONTRIBUTING.md': 10,
      'backend/README.md': 10,
      'frontend/README.md': 10,
    };

    for (const [file, points] of Object.entries(requiredDocs)) {
      if (fs.existsSync(file)) {
        const content = fs.readFileSync(file, 'utf8');
        if (content.length > 100) {
          score += points;
        } else {
          issues.push(`${file} is too short`);
        }
      } else {
        issues.push(`Missing: ${file}`);
      }
    }

    // Check for API documentation
    if (fs.existsSync('backend/openapi.json')) {
      score += 10;
    } else {
      issues.push('Missing: OpenAPI documentation');
    }

    this.details.documentation = { score, issues };
    console.log(`   Score: ${score}/100`);
    return score;
  }

  /**
   * Check testing
   */
  async checkTesting() {
    console.log('🧪 Checking testing...');
    let score = 0;
    const issues = [];

    // Check for test coverage
    if (fs.existsSync('backend/coverage/coverage-summary.json')) {
      const coverage = JSON.parse(
        fs.readFileSync('backend/coverage/coverage-summary.json', 'utf8')
      );
      
      const statementCoverage = coverage.total.statements.pct;
      
      if (statementCoverage >= 80) {
        score = 100;
      } else if (statementCoverage >= 60) {
        score = 80;
      } else if (statementCoverage >= 40) {
        score = 60;
      } else if (statementCoverage >= 20) {
        score = 40;
      } else {
        score = 20;
      }
      
      issues.push(`Statement coverage: ${statementCoverage.toFixed(1)}%`);
    } else {
      score = 0;
      issues.push('No coverage report found');
    }

    // Check for test files
    try {
      const testFiles = execSync(
        'find backend/src -name "*.spec.ts" | wc -l',
        { encoding: 'utf8' }
      ).trim();
      
      if (parseInt(testFiles) < 10) {
        score -= 20;
        issues.push(`Only ${testFiles} test files found`);
      }
    } catch (e) {
      // Skip on Windows
    }

    this.details.testing = { score, issues };
    console.log(`   Score: ${score}/100`);
    return score;
  }

  /**
   * Check error handling and logging
   */
  async checkErrorHandling() {
    console.log('🚨 Checking error handling...');
    let score = 50; // Base score
    const issues = [];

    // Check for logger service
    if (fs.existsSync('backend/src/common/logger.service.ts')) {
      score += 20;
    } else {
      issues.push('Missing: Logger service');
    }

    // Check for error handling middleware
    if (fs.existsSync('backend/src/common/filters/app-exception.filter.ts')) {
      score += 15;
    } else {
      issues.push('Missing: Exception filter');
    }

    // Check for Sentry configuration
    const mainFile = 'backend/src/main.ts';
    if (fs.existsSync(mainFile)) {
      const content = fs.readFileSync(mainFile, 'utf8');
      if (content.includes('Sentry')) {
        score += 15;
      } else {
        issues.push('Sentry not configured in main.ts');
      }
    }

    this.details.errorHandling = { score, issues };
    console.log(`   Score: ${score}/100`);
    return score;
  }

  /**
   * Check deployment readiness
   */
  async checkDeployment() {
    console.log('🚀 Checking deployment...');
    let score = 0;
    const issues = [];

    // Check for Docker
    if (fs.existsSync('backend/Dockerfile')) {
      score += 25;
    } else {
      issues.push('Missing: backend/Dockerfile');
    }

    if (fs.existsSync('frontend/Dockerfile')) {
      score += 15;
    } else {
      issues.push('Missing: frontend/Dockerfile');
    }

    if (fs.existsSync('docker-compose.yml')) {
      score += 20;
    } else {
      issues.push('Missing: docker-compose.yml');
    }

    // Check for CI/CD
    if (fs.existsSync('.github/workflows/ci.yml')) {
      score += 20;
    } else {
      issues.push('Missing: CI pipeline');
    }

    if (fs.existsSync('.github/workflows/deploy.yml')) {
      score += 10;
    } else {
      issues.push('Missing: Deployment pipeline');
    }

    // Check for environment configuration
    if (fs.existsSync('backend/.env.example')) {
      score += 10;
    } else {
      issues.push('Missing: .env.example');
    }

    this.details.deployment = { score, issues };
    console.log(`   Score: ${score}/100`);
    return score;
  }

  /**
   * Check code quality
   */
  async checkCodeQuality() {
    console.log('✨ Checking code quality...');
    let score = 50; // Base score
    const issues = [];

    // Check for ESLint
    if (fs.existsSync('backend/.eslintrc.js') || fs.existsSync('backend/eslint.config.mjs')) {
      score += 20;
    } else {
      issues.push('Missing: ESLint configuration');
    }

    // Check for Prettier
    if (fs.existsSync('backend/.prettierrc') || fs.existsSync('backend/.prettierrc.json')) {
      score += 15;
    } else {
      issues.push('Missing: Prettier configuration');
    }

    // Check for pre-commit hooks
    if (fs.existsSync('.husky/pre-commit')) {
      score += 15;
    } else {
      issues.push('Missing: Pre-commit hooks');
    }

    this.details.codeQuality = { score, issues };
    console.log(`   Score: ${score}/100`);
    return score;
  }

  /**
   * Generate report
   */
  generateReport(totalScore) {
    const grade = this.getGrade(totalScore);
    const status = this.getStatus(totalScore);
    
    let report = `# Maintainability Report\n\n`;
    report += `**Generated:** ${new Date().toISOString()}\n\n`;
    report += `## Overall Score: ${totalScore}/100 (${grade})\n\n`;
    report += `**Status:** ${status}\n\n`;
    report += `---\n\n`;
    report += `## Dimension Scores\n\n`;
    report += `| Dimension | Score | Weight | Contribution |\n`;
    report += `|-----------|-------|--------|-------------|\n`;
    
    for (const [key, score] of Object.entries(this.scores)) {
      const weight = WEIGHTS[key];
      const contribution = (score * weight).toFixed(1);
      const name = key.replace(/([A-Z])/g, ' $1').trim();
      const emoji = score >= 70 ? '✅' : score >= 50 ? '⚠️' : '❌';
      report += `| ${emoji} ${name} | ${score}/100 | ${(weight * 100).toFixed(0)}% | ${contribution} |\n`;
    }
    
    report += `\n---\n\n`;
    report += `## Details\n\n`;
    
    for (const [key, detail] of Object.entries(this.details)) {
      const name = key.replace(/([A-Z])/g, ' $1').trim();
      report += `### ${name} (${detail.score}/100)\n\n`;
      
      if (detail.issues.length > 0) {
        report += `**Issues:**\n`;
        for (const issue of detail.issues) {
          report += `- ${issue}\n`;
        }
      } else {
        report += `✅ No issues found\n`;
      }
      report += `\n`;
    }
    
    report += `---\n\n`;
    report += `## Recommendations\n\n`;
    report += this.getRecommendations(totalScore);
    
    return report;
  }

  getGrade(score) {
    if (score >= THRESHOLDS.excellent) return 'A';
    if (score >= THRESHOLDS.good) return 'B';
    if (score >= THRESHOLDS.fair) return 'C';
    if (score >= THRESHOLDS.poor) return 'D';
    return 'F';
  }

  getStatus(score) {
    if (score >= THRESHOLDS.excellent) return '🎉 EXCELLENT';
    if (score >= THRESHOLDS.good) return '✅ GOOD';
    if (score >= THRESHOLDS.fair) return '⚠️ FAIR';
    if (score >= THRESHOLDS.poor) return '❌ NEEDS WORK';
    return '🔴 CRITICAL';
  }

  getRecommendations(score) {
    let recs = '';
    
    if (this.scores.deployment < 50) {
      recs += `🔴 **CRITICAL:** Add Docker and CI/CD (Deployment: ${this.scores.deployment}/100)\n`;
    }
    
    if (this.scores.documentation < 50) {
      recs += `🔴 **CRITICAL:** Improve documentation (Documentation: ${this.scores.documentation}/100)\n`;
    }
    
    if (this.scores.testing < 60) {
      recs += `🟡 **HIGH:** Increase test coverage (Testing: ${this.scores.testing}/100)\n`;
    }
    
    if (this.scores.codeQuality < 70) {
      recs += `🟡 **MEDIUM:** Add linting and formatting (Code Quality: ${this.scores.codeQuality}/100)\n`;
    }
    
    if (recs === '') {
      recs = '✅ All dimensions are in good shape! Keep up the good work.\n';
    }
    
    return recs;
  }
}

// Main execution
async function main() {
  const calculator = new MaintainabilityCalculator();
  const score = await calculator.calculate();
  
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Overall Maintainability Score: ${score}/100`);
  console.log(`Grade: ${calculator.getGrade(score)}`);
  console.log(`${'='.repeat(60)}\n`);
  
  // Generate report
  const report = calculator.generateReport(score);
  fs.writeFileSync('maintainability-report.md', report);
  fs.writeFileSync('maintainability-score.txt', score.toString());
  
  console.log('✅ Report saved to maintainability-report.md');
  
  // Exit with appropriate code
  process.exit(score >= THRESHOLDS.good ? 0 : 1);
}

main().catch(error => {
  console.error('❌ Error:', error.message);
  process.exit(1);
});

