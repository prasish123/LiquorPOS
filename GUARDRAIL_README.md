# 🛡️ Guardrail - Automated Code Quality System

> **Automated maintainability, PRD compliance, and continuous quality improvement for your codebase.**

[![Python 3.8+](https://img.shields.io/badge/python-3.8+-blue.svg)](https://www.python.org/downloads/)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Status](https://img.shields.io/badge/status-production--ready-brightgreen.svg)]()

---

## 🎯 What is Guardrail?

**Guardrail** is an intelligent code quality system that automatically:

- ✅ **Audits** your codebase across 5 dimensions
- 📈 **Tracks trends** to show improvements and regressions
- 🔧 **Fixes issues** automatically and safely
- 📝 **Updates documentation** to stay in sync with code
- 📊 **Generates reports** with actionable recommendations
- 🪝 **Blocks commits** below quality thresholds (optional)

**Think of it as:** A weekly health checkup for your codebase that tells you exactly what needs attention and can fix many issues automatically.

---

## 🚀 Quick Start

### 1. Run Your First Audit (2 minutes)

```bash
# Scan repository and run audit
python -m guardrail baseline --repo . --update-memory
python -m guardrail audit --repo . --full

# Generate report
python -m guardrail report --repo . --weekly
```

### 2. Weekly Maintenance (1 command)

```bash
# Complete weekly maintenance routine
python guardrail-weekly.py
```

**That's it!** You now have:
- ✅ Quality scores for all dimensions
- ✅ Trend tracking over time
- ✅ Automatic fixes applied
- ✅ Documentation updated
- ✅ Weekly report generated

---

## 📊 What Gets Measured

### 5 Quality Dimensions

| Dimension | Weight | What It Checks |
|-----------|--------|----------------|
| 🔧 **Code Quality** | 25% | Linting, formatting, TypeScript strictness |
| 🧪 **Testing** | 25% | Test coverage, passing tests, test files |
| 🚀 **Deployment** | 20% | Docker, CI/CD, scripts, environment config |
| 📚 **Documentation** | 15% | README, API docs, runbooks, inline comments |
| 📋 **PRD Compliance** | 15% | Feature implementation vs requirements |

### Score Levels

- 🟢 **Green (75-100)**: Excellent - Maintain current quality
- 🟡 **Yellow (50-74)**: Acceptable - Improvement recommended
- 🔴 **Red (0-49)**: Critical - Immediate attention required

---

## 🎨 Features

### 1. Automated Auditing

```bash
python -m guardrail audit --repo . --full
```

**Checks:**
- ✅ ESLint, Prettier, TypeScript configs
- ✅ Test files and coverage
- ✅ Docker and CI/CD setup
- ✅ Documentation completeness
- ✅ PRD requirement implementation

**Output:**
```
✅ Audit complete: Overall score 78.5 (green)

Dimensions:
  🟢 Code Quality: 85.0
  🟡 Testing: 70.0
  🟢 Deployment: 80.0
  🟢 Documentation: 75.0
  🟢 PRD Compliance: 78.0
```

---

### 2. Trend Tracking

```bash
python -m guardrail trend --repo . --update
```

**Tracks:**
- 📈 Score changes week-over-week
- 🟢 Improvements (score +5 or more)
- 🔴 Regressions (score -5 or more)
- 📊 Historical data (52 weeks)

**Output:**
```
Trends:
  🟢 Code Quality: +5.0 (improving)
  🔴 Testing: -5.0 (worsening)
  🟡 Deployment: +2.0 (stable)
```

---

### 3. Agentic Fix Loop

```bash
python -m guardrail fix --repo . --critical-only
```

**Auto-fixes:**
- ✅ Missing config files (.eslintrc.js, .prettierrc)
- ✅ Missing .env.example
- ✅ Linting errors (via --fix)
- ✅ Missing documentation templates

**Safety:**
- ❌ Never modifies business logic
- ❌ Never deletes files
- ✅ Only applies known-safe fixes
- ✅ Generates verification steps

---

### 4. Documentation Sync

```bash
python -m guardrail docs --repo . --update
```

**Updates:**
- 📝 .env.example with new variables
- 📝 README.md sections
- 📝 DEPLOYMENT.md
- 📝 RUNBOOK.md
- 📝 QUICKSTART.md

---

### 5. Weekly Reports

```bash
python -m guardrail report --repo . --weekly
```

**Generates:**
- 📊 Current scores per dimension
- 📈 Trend changes since last week
- 🔴 Critical issues list
- 🟡 Warnings and recommendations
- ✅ Fixes applied
- 🎯 Next actions

**Output:** `GUARDRAIL_REPORT_WEEK_N.md`

---

### 6. Git Hooks (Optional)

```bash
python -m guardrail git-hook --enable
```

**Blocks commits if:**
- ❌ Overall score < 70 (configurable)
- ❌ Critical issues present
- ❌ Tests failing

**Allows commits if:**
- ✅ Score ≥ 70
- ✅ No critical issues

---

## 📅 Weekly Maintenance Routine

### Automated (Recommended)

**Single command runs everything:**

```bash
python guardrail-weekly.py
```

**Or on Windows:**

```powershell
.\guardrail-weekly.ps1
```

**What it does:**

1. ✅ **Updates baseline** - Scans repo, maps PRD
2. ✅ **Runs full audit** - Scores all dimensions
3. ✅ **Updates trends** - Compares with history
4. ✅ **Applies fixes** - Auto-fixes critical issues
5. ✅ **Updates docs** - Syncs documentation
6. ✅ **Generates report** - Creates weekly report

**Time:** 2-3 minutes  
**Frequency:** Once per week (e.g., every Monday)

---

### Manual (Step-by-Step)

```bash
# Step 1: Update baseline
python -m guardrail baseline --repo . --update-memory

# Step 2: Run audit
python -m guardrail audit --repo . --full

# Step 3: Update trends
python -m guardrail trend --repo . --update

# Step 4: Apply fixes
python -m guardrail fix --repo . --critical-only

# Step 5: Update docs
python -m guardrail docs --repo . --update

# Step 6: Generate report
python -m guardrail report --repo . --weekly
```

---

## 🏗️ Architecture

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

### Agents

1. **Interpreter Agent** - Scans repo, maps PRD requirements
2. **Maintainability Agent** - Evaluates and scores all dimensions
3. **Trend Agent** - Tracks changes over time
4. **Agentic Fix Loop** - Automatically fixes issues
5. **Documentation Agent** - Keeps docs synchronized
6. **Reporting Agent** - Generates comprehensive reports

---

## 📁 File Structure

```
.guardrail/
├── config.json              # Configuration
├── memory.json              # System memory (baseline, PRD mapping)
├── history.json             # Historical audit data (52 weeks)
├── latest_audit.json        # Most recent audit result
├── latest_trend.json        # Most recent trend analysis
├── latest_fixes.json        # Most recent fixes applied
├── latest_docs.json         # Most recent doc updates
└── latest_report.json       # Most recent report

GUARDRAIL_REPORT_WEEK_*.md   # Human-readable weekly reports
```

---

## ⚙️ Configuration

### Default Configuration

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
  }
}
```

### Customization

**Adjust dimension weights:**

```json
{
  "scoring": {
    "code_quality": 30,    // More emphasis on code quality
    "testing": 30,         // More emphasis on testing
    "deployment": 15,
    "documentation": 15,
    "prd_compliance": 10
  }
}
```

**Change thresholds:**

```json
{
  "thresholds": {
    "green": 80,   // Stricter requirements
    "yellow": 60,
    "red": 0
  }
}
```

---

## 🎓 Usage Examples

### Example 1: First-Time Setup

```bash
# 1. Run initial baseline
python -m guardrail baseline --repo . --update-memory

# 2. Run first audit
python -m guardrail audit --repo . --full

# 3. Apply automatic fixes
python -m guardrail fix --repo . --critical-only

# 4. Generate report
python -m guardrail report --repo . --weekly
```

---

### Example 2: Weekly Maintenance

```bash
# Single command
python guardrail-weekly.py

# Review report
cat GUARDRAIL_REPORT_WEEK_*.md
```

---

### Example 3: Pre-Deployment Check

```bash
# Run quick audit
python -m guardrail audit --repo .

# Check if ready for deployment
python -m guardrail git-check
```

---

### Example 4: CI/CD Integration

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

## 📚 Documentation

### Quick Links

- **[GUARDRAIL_QUICKSTART.md](GUARDRAIL_QUICKSTART.md)** - 5-minute quick start guide
- **[GUARDRAIL_SYSTEM.md](GUARDRAIL_SYSTEM.md)** - Complete system documentation
- **[GUARDRAIL_PROMPTS.md](GUARDRAIL_PROMPTS.md)** - Agent prompts and behaviors
- **[requirements-guardrail.txt](requirements-guardrail.txt)** - Python requirements

### Full Documentation

| Document | Description |
|----------|-------------|
| GUARDRAIL_QUICKSTART.md | Get started in 5 minutes |
| GUARDRAIL_SYSTEM.md | Complete system guide |
| GUARDRAIL_PROMPTS.md | Agent behaviors and prompts |
| requirements-guardrail.txt | Python dependencies |

---

## 🛠️ Requirements

### System Requirements

- **Python:** 3.8 or higher
- **OS:** Windows, macOS, Linux
- **Dependencies:** None (uses Python standard library only)

### Optional Dependencies

```bash
# For enhanced output (optional)
pip install rich

# For notifications (optional)
pip install requests
```

---

## 🤝 Best Practices

### 1. Run Weekly

Schedule maintenance every Monday:

```bash
# Add to cron (Linux/Mac)
0 9 * * 1 cd /path/to/repo && python guardrail-weekly.py

# Or Windows Task Scheduler
# Run: powershell.exe -File "E:\path\to\guardrail-weekly.ps1"
```

### 2. Review Reports

- **Team lead**: Review in standup meetings
- **Developers**: Address yellow/red dimensions
- **DevOps**: Monitor deployment readiness

### 3. Track Trends

- Celebrate improvements 🟢
- Investigate regressions 🔴
- Plan improvements for yellow areas 🟡

### 4. Enable Git Hooks (Optional)

For strict quality gates:

```bash
python -m guardrail git-hook --enable
```

---

## 🔍 Troubleshooting

### "No audit data available"

```bash
python -m guardrail audit --repo . --full
```

### "PRD mapping not available"

```bash
python -m guardrail baseline --repo . --update-memory
```

### Git hook not working

```bash
python -m guardrail git-hook --disable
python -m guardrail git-hook --enable
```

### Low scores on first run

**This is normal!** Guardrail shows what needs improvement. Start with critical issues and improve gradually.

---

## 📊 Example Report

```markdown
# Guardrail Weekly Report - Week 1

## 📊 Overall Score
🟢 78.5 (green)

## 📈 Dimension Scores
| Dimension | Score | Level | Trend |
|-----------|-------|-------|-------|
| Code Quality | 85.0 | green | 🟢 +5.0 |
| Testing | 70.0 | yellow | 🔴 -5.0 |
| Deployment | 80.0 | green | 🟡 +2.0 |
| Documentation | 75.0 | green | 🟡 +1.0 |
| PRD Compliance | 78.0 | green | 🟢 +4.0 |

## 🟡 Warnings
- [testing] Backend test coverage low: 70%

## ✅ Fixes Applied
- ✅ Created .prettierrc
- ✅ Fixed 3 backend linting errors

## 💡 Recommendations
- 🟡 testing: Increase test coverage to at least 80%

## 🎯 Next Actions
- [ ] Improve: testing
- [ ] Run weekly Guardrail maintenance next week
```

---

## 🎉 Benefits

### For Developers

- ✅ **Automated quality checks** - No manual audits
- ✅ **Automatic fixes** - Many issues fixed automatically
- ✅ **Clear guidance** - Know exactly what to improve
- ✅ **Trend tracking** - See your progress over time

### For Team Leads

- ✅ **Visibility** - See code quality at a glance
- ✅ **Accountability** - Track team progress
- ✅ **Prioritization** - Focus on critical issues first
- ✅ **Reporting** - Weekly reports for stakeholders

### For Organizations

- ✅ **Quality assurance** - Maintain high code quality
- ✅ **Risk reduction** - Catch issues early
- ✅ **Compliance** - Track PRD implementation
- ✅ **Continuous improvement** - Quality improves over time

---

## 📜 License

Part of the Liquor POS project. See [LICENSE](LICENSE) file.

---

## 🙏 Acknowledgments

Built with ❤️ for the Liquor POS project to ensure continuous code quality and maintainability.

---

## 📞 Support

For issues, questions, or contributions:

1. Check [GUARDRAIL_SYSTEM.md](GUARDRAIL_SYSTEM.md) for detailed documentation
2. Review [GUARDRAIL_QUICKSTART.md](GUARDRAIL_QUICKSTART.md) for common issues
3. Check `.guardrail/` directory for detailed logs

---

**Version:** 1.0.0  
**Status:** ✅ Production Ready  
**Last Updated:** January 5, 2026

---

## 🚀 Get Started Now

```bash
# 1. Run your first audit
python -m guardrail baseline --repo . --update-memory
python -m guardrail audit --repo . --full

# 2. Generate report
python -m guardrail report --repo . --weekly

# 3. Schedule weekly maintenance
python guardrail-weekly.py
```

**That's it!** You now have automated code quality monitoring. 🎉

