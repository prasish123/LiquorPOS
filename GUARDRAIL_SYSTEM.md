# Guardrail Maintenance System

## 🎯 Overview

The **Guardrail Maintenance System** is an automated code quality and maintainability framework that ensures your codebase stays healthy, compliant with PRD requirements, and continuously improving over time.

### Key Features

- **Automated Auditing**: Continuous evaluation of code quality, testing, deployment, documentation, and PRD compliance
- **Trend Tracking**: Historical analysis showing improvements and regressions over time
- **Agentic Fix Loop**: Automatic fixes for critical issues with safety checks
- **Documentation Sync**: Keeps documentation aligned with code changes
- **Weekly Reports**: Comprehensive team reports with actionable recommendations
- **Git Hooks**: Optional pre-commit quality gates

---

## 🏗️ Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                    Guardrail System                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │ Interpreter  │  │Maintainability│  │    Trend     │    │
│  │    Agent     │  │    Agent      │  │    Agent     │    │
│  └──────────────┘  └──────────────┘  └──────────────┘    │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │  Agentic     │  │Documentation │  │  Reporting   │    │
│  │  Fix Loop    │  │    Agent     │  │    Agent     │    │
│  └──────────────┘  └──────────────┘  └──────────────┘    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Agent Responsibilities

#### 1. **Interpreter Agent**
- Scans repository structure
- Maps features to PRD requirements
- Maintains baseline understanding
- Identifies PRD coverage gaps

#### 2. **Maintainability Agent**
- Evaluates code quality (linting, formatting, TypeScript)
- Measures test coverage
- Verifies deployment readiness
- Checks documentation completeness
- Scores PRD compliance

#### 3. **Trend Agent**
- Tracks score changes over time
- Identifies improvements and regressions
- Generates trend visualizations
- Maintains historical data (52 weeks)

#### 4. **Agentic Fix Loop**
- Automatically fixes critical issues
- Creates missing configuration files
- Runs auto-fix commands (lint --fix)
- Self-reviews for safety
- Generates verification steps

#### 5. **Documentation Agent**
- Updates .env.example with new variables
- Keeps README.md current
- Maintains deployment documentation
- Updates operational runbooks
- Creates quick start guides

#### 6. **Reporting Agent**
- Generates weekly team reports
- Provides actionable recommendations
- Highlights critical issues
- Tracks fixes and improvements
- Creates markdown reports

---

## 📊 Scoring System

### Dimensions (Weighted)

| Dimension | Weight | Description |
|-----------|--------|-------------|
| **Code Quality** | 25% | Linting, formatting, TypeScript strictness |
| **Testing** | 25% | Test coverage, passing tests, test quality |
| **Deployment** | 20% | Docker, CI/CD, scripts, environment config |
| **Documentation** | 15% | README, API docs, runbooks, inline comments |
| **PRD Compliance** | 15% | Feature implementation vs requirements |

### Score Levels

- 🟢 **Green (75-100)**: Excellent - Maintain current quality
- 🟡 **Yellow (50-74)**: Acceptable - Improvement recommended
- 🔴 **Red (0-49)**: Critical - Immediate attention required

---

## 🚀 Quick Start

### Installation

```bash
# No installation needed - pure Python system
# Ensure Python 3.8+ is installed

# Verify installation
python -m guardrail --help
```

### First Run

```bash
# 1. Update baseline understanding
python -m guardrail baseline --repo . --update-memory

# 2. Run first audit
python -m guardrail audit --repo . --full

# 3. Generate initial report
python -m guardrail report --repo . --weekly
```

---

## 📅 Weekly Maintenance Routine

### Automated Weekly Run

**Single Command:**

```bash
# Python script (cross-platform)
python guardrail-weekly.py

# PowerShell script (Windows)
.\guardrail-weekly.ps1

# With options
python guardrail-weekly.py --dry-run
python guardrail-weekly.py --skip-fixes
```

### Manual Step-by-Step

```bash
# Step 1: Update Baseline
python -m guardrail baseline --repo . --update-memory

# Step 2: Run Full Audit
python -m guardrail audit --repo . --full

# Step 3: Update Trends
python -m guardrail trend --repo . --update

# Step 4: Apply Critical Fixes
python -m guardrail fix --repo . --critical-only

# Step 5: Update Documentation
python -m guardrail docs --repo . --update

# Step 6: Generate Report
python -m guardrail report --repo . --weekly
```

### What Gets Done

1. ✅ **Baseline Update**: Scans repo, maps PRD, updates memory
2. ✅ **Full Audit**: Scores all dimensions, identifies issues
3. ✅ **Trend Tracking**: Compares with history, shows changes
4. ✅ **Critical Fixes**: Auto-fixes safe issues (config files, linting)
5. ✅ **Documentation**: Updates docs to match code
6. ✅ **Weekly Report**: Generates markdown report with recommendations

---

## 🔧 Individual Commands

### Baseline Management

```bash
# Scan repository and update memory
python -m guardrail baseline --repo . --update-memory

# Output as JSON
python -m guardrail baseline --repo . --json
```

### Auditing

```bash
# Full audit (all checks)
python -m guardrail audit --repo . --full

# Quick audit (essential checks only)
python -m guardrail audit --repo .

# JSON output
python -m guardrail audit --repo . --full --json
```

### Trend Tracking

```bash
# Update trends with latest audit
python -m guardrail trend --repo . --update

# View trend chart
python -m guardrail trend --repo . --chart
```

### Fixing Issues

```bash
# Fix critical issues only (safe)
python -m guardrail fix --repo . --critical-only

# Fix all issues (use with caution)
python -m guardrail fix --repo .
```

### Documentation Updates

```bash
# Update all documentation
python -m guardrail docs --repo . --update

# Check what would be updated (dry run)
python -m guardrail docs --repo . --dry-run
```

### Reporting

```bash
# Generate weekly report
python -m guardrail report --repo . --weekly

# Generate ad-hoc report
python -m guardrail report --repo .

# JSON output
python -m guardrail report --repo . --weekly --json
```

---

## 🪝 Git Hooks

### Enable Pre-Commit Quality Gate

```bash
# Enable Git hook
python -m guardrail git-hook --enable

# Configure minimum score (default: 70)
# Edit .guardrail/config.json:
{
  "git_hook": {
    "enabled": true,
    "min_score": 70,
    "block_on_fail": true
  }
}

# Disable Git hook
python -m guardrail git-hook --disable
```

### How It Works

When enabled, every commit will:

1. Run quick audit (fast checks)
2. Calculate overall score
3. Block commit if score < minimum
4. Show critical issues to fix
5. Allow commit if score ≥ minimum

**Example:**

```bash
$ git commit -m "Add new feature"
Running Guardrail quality check...
❌ Code quality check failed: 65.0 < 70
Critical issues:
  - [code_quality] Backend has 3 linting errors
  - [testing] Backend test coverage low: 45%
  - [documentation] API documentation missing

Fix these issues and try again.
```

---

## 📈 Trend Tracking

### Historical Data

Guardrail maintains up to **52 weeks** of historical data in `.guardrail/history.json`.

### Trend Indicators

- 🟢 **Improving**: Score increased by >5 points
- 🟡 **Stable**: Score changed by -5 to +5 points
- 🔴 **Worsening**: Score decreased by >5 points

### Viewing Trends

```bash
# Update and view trends
python -m guardrail trend --repo . --update

# View ASCII trend chart
python -m guardrail trend --repo . --chart

# View specific dimension
python -m guardrail trend --repo . --chart --dimension code_quality
```

---

## 📝 Reports

### Weekly Report Format

Generated as `GUARDRAIL_REPORT_WEEK_<N>.md`:

```markdown
# Guardrail Weekly Report - Week 45

## 📊 Overall Score
🟢 78.5 (green)

## 📈 Dimension Scores
| Dimension | Score | Level | Trend |
|-----------|-------|-------|-------|
| Code Quality | 85.0 | green | 🟢 +5.0 |
| Testing | 70.0 | yellow | 🟡 +0.5 |
| Deployment | 80.0 | green | 🟢 +3.0 |
| Documentation | 75.0 | green | 🟡 -2.0 |
| PRD Compliance | 78.0 | green | 🟢 +4.0 |

## 🔴 Critical Issues
- None

## 🟡 Warnings
- [testing] Backend test coverage low: 70%
- [documentation] API documentation incomplete

## ✅ Fixes Applied
- ✅ Created .prettierrc
- ✅ Fixed 3 backend linting errors

## 💡 Recommendations
- 🟡 testing: Score 70.0 - Increase test coverage to at least 80%
- 🟡 documentation: Score 75.0 - Complete API documentation

## 🎯 Next Actions
- [ ] Improve: testing
- [ ] Run weekly Guardrail maintenance next week
```

---

## ⚙️ Configuration

### Configuration File

Located at `.guardrail/config.json`:

```json
{
  "version": "1.0.0",
  "thresholds": {
    "green": 75,
    "yellow": 50,
    "red": 0
  },
  "scoring": {
    "code_quality": 25,
    "testing": 25,
    "deployment": 20,
    "documentation": 15,
    "prd_compliance": 15
  },
  "git_hook": {
    "enabled": false,
    "min_score": 70,
    "block_on_fail": true
  },
  "notifications": {
    "enabled": false,
    "webhook_url": null
  }
}
```

### Customization

#### Adjust Scoring Weights

```json
{
  "scoring": {
    "code_quality": 30,    // Increase code quality importance
    "testing": 30,         // Increase testing importance
    "deployment": 15,
    "documentation": 15,
    "prd_compliance": 10
  }
}
```

#### Change Thresholds

```json
{
  "thresholds": {
    "green": 80,   // Stricter green threshold
    "yellow": 60,  // Stricter yellow threshold
    "red": 0
  }
}
```

---

## 🗂️ File Structure

```
.guardrail/
├── config.json              # Configuration
├── memory.json              # System memory (baseline, PRD mapping)
├── history.json             # Historical audit data (52 weeks)
├── latest_audit.json        # Most recent audit result
├── latest_trend.json        # Most recent trend analysis
├── latest_fixes.json        # Most recent fixes applied
├── latest_docs.json         # Most recent doc updates
├── latest_report.json       # Most recent report
└── report_week_*.json       # Weekly reports archive

GUARDRAIL_REPORT_WEEK_*.md   # Human-readable weekly reports
```

---

## 🔍 What Gets Checked

### Code Quality
- ✅ ESLint configuration present
- ✅ TypeScript configuration present
- ✅ Prettier configuration present
- ✅ No linting errors
- ✅ Code is formatted

### Testing
- ✅ Test files exist
- ✅ Jest configuration present
- ✅ Tests pass
- ✅ Coverage ≥ 80%

### Deployment
- ✅ docker-compose.yml exists
- ✅ Dockerfiles exist
- ✅ .env.example exists
- ✅ Deployment scripts exist
- ✅ CI/CD configured

### Documentation
- ✅ README.md exists and complete
- ✅ DEPLOYMENT.md exists
- ✅ RUNBOOK.md exists
- ✅ Architecture docs exist
- ✅ API documentation exists
- ✅ Inline code documentation

### PRD Compliance
- ✅ PRD.md exists
- ✅ Requirements mapped to code
- ✅ All P0 requirements implemented
- ✅ All P1 requirements implemented

---

## 🛠️ Troubleshooting

### "No audit data available"

**Solution:**
```bash
python -m guardrail audit --repo . --full
```

### "PRD mapping not available"

**Solution:**
```bash
python -m guardrail baseline --repo . --update-memory
```

### Git hook not working

**Solution:**
```bash
# Re-enable hook
python -m guardrail git-hook --disable
python -m guardrail git-hook --enable

# Check hook file
cat .git/hooks/pre-commit
```

### Fixes not applying

**Reasons:**
- Issue not automatically fixable
- File already exists
- Command failed

**Check:**
```bash
# View fix results
cat .guardrail/latest_fixes.json
```

---

## 📊 Best Practices

### 1. Run Weekly

Schedule weekly maintenance every Monday morning:

```bash
# Add to cron (Linux/Mac)
0 9 * * 1 cd /path/to/repo && python guardrail-weekly.py

# Add to Task Scheduler (Windows)
# Run: powershell.exe -File "E:\path\to\guardrail-weekly.ps1"
```

### 2. Review Reports

- **Team lead**: Review weekly report in standup
- **Developers**: Address yellow/red dimensions
- **DevOps**: Monitor deployment readiness

### 3. Track Trends

- Celebrate improvements 🟢
- Investigate regressions 🔴
- Plan improvements for yellow areas 🟡

### 4. Enable Git Hooks (Optional)

For teams wanting strict quality gates:

```bash
python -m guardrail git-hook --enable
```

### 5. Integrate with CI/CD

```yaml
# .github/workflows/guardrail.yml
name: Guardrail Quality Check

on: [push, pull_request]

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-python@v2
        with:
          python-version: '3.8'
      - name: Run Guardrail Audit
        run: |
          python -m guardrail audit --repo . --full
          python -m guardrail git-check
```

---

## 🎓 Training

### For Developers

1. **Understand scoring**: Know what affects each dimension
2. **Read reports**: Review weekly reports for your areas
3. **Fix issues**: Address yellow/red items promptly
4. **Maintain quality**: Keep scores green

### For Team Leads

1. **Schedule weekly runs**: Automate maintenance
2. **Review trends**: Track team progress
3. **Prioritize fixes**: Focus on critical issues first
4. **Celebrate wins**: Recognize improvements

### For DevOps

1. **Monitor deployment**: Ensure deployment dimension stays green
2. **Update configs**: Keep Docker and CI/CD current
3. **Automate**: Integrate Guardrail into pipelines

---

## 📚 Additional Resources

- **[GUARDRAIL_PROMPTS.md](GUARDRAIL_PROMPTS.md)**: Agent prompts and behaviors
- **[GUARDRAIL_EXAMPLES.md](GUARDRAIL_EXAMPLES.md)**: Usage examples and scenarios
- **[GUARDRAIL_API.md](GUARDRAIL_API.md)**: Python API documentation

---

## 🤝 Support

For issues, questions, or contributions:

1. Check troubleshooting section above
2. Review generated reports for specific issues
3. Check `.guardrail/` directory for detailed logs
4. Review agent behaviors in code

---

## 📜 License

Part of the Liquor POS project. See main LICENSE file.

---

**Version:** 1.0.0  
**Last Updated:** January 5, 2026  
**Status:** ✅ Production Ready

