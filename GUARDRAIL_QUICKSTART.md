# Guardrail Quick Start

Get the Guardrail system running in **5 minutes**.

---

## ✅ Prerequisites

- Python 3.8+ installed
- Your repository cloned locally

**Check Python version:**

```bash
python --version
# Should show Python 3.8 or higher
```

---

## 🚀 Quick Start (5 Minutes)

### Step 1: Verify Installation (30 seconds)

```bash
# Navigate to your repository
cd /path/to/liquor-pos

# Check Guardrail is available
python -m guardrail --help
```

**Expected output:**
```
usage: guardrail [-h] {baseline,audit,trend,fix,docs,report,weekly,git-hook,git-check} ...
```

✅ If you see this, Guardrail is ready!

---

### Step 2: First Audit (2 minutes)

```bash
# Run initial baseline scan
python -m guardrail baseline --repo . --update-memory

# Run first full audit
python -m guardrail audit --repo . --full
```

**What happens:**
- ✅ Scans your repository structure
- ✅ Maps PRD requirements
- ✅ Evaluates code quality, testing, deployment, docs, PRD compliance
- ✅ Generates scores for each dimension

**Expected output:**
```
Guardrail initialized for repo: /path/to/liquor-pos
Running maintainability audit...
  Evaluating code quality...
  Evaluating testing...
  Evaluating deployment...
  Evaluating documentation...
  Evaluating PRD compliance...
✅ Audit complete: Overall score 78.5 (green)
```

---

### Step 3: View First Report (1 minute)

```bash
# Generate your first weekly report
python -m guardrail report --repo . --weekly
```

**What happens:**
- ✅ Compiles audit results
- ✅ Generates recommendations
- ✅ Creates markdown report

**Output file:**
```
GUARDRAIL_REPORT_WEEK_1.md
```

**Open and review:**
```bash
# Windows
notepad GUARDRAIL_REPORT_WEEK_1.md

# Mac/Linux
cat GUARDRAIL_REPORT_WEEK_1.md
```

---

### Step 4: Apply Fixes (Optional, 1 minute)

```bash
# Automatically fix critical issues
python -m guardrail fix --repo . --critical-only
```

**What gets fixed:**
- ✅ Missing configuration files (.eslintrc.js, .prettierrc)
- ✅ Missing .env.example
- ✅ Linting errors (via --fix)
- ✅ Missing documentation templates

---

## 🎯 You're Done!

**In 5 minutes you:**
1. ✅ Ran your first audit
2. ✅ Got quality scores for all dimensions
3. ✅ Generated your first report
4. ✅ (Optional) Applied automatic fixes

---

## 📅 Weekly Maintenance (1 Command)

From now on, run this **once per week**:

```bash
# Single command for complete maintenance
python guardrail-weekly.py
```

**Or on Windows:**
```powershell
.\guardrail-weekly.ps1
```

**This automatically:**
1. Updates baseline understanding
2. Runs full audit
3. Tracks trends
4. Applies critical fixes
5. Updates documentation
6. Generates weekly report

**Takes:** 2-3 minutes  
**Frequency:** Once per week (e.g., every Monday)

---

## 📊 Understanding Your Scores

### Score Levels

- 🟢 **Green (75-100)**: Excellent - Keep it up!
- 🟡 **Yellow (50-74)**: Acceptable - Improvement recommended
- 🔴 **Red (0-49)**: Critical - Needs immediate attention

### Dimensions

| Dimension | What It Measures | Weight |
|-----------|------------------|--------|
| **Code Quality** | Linting, formatting, TypeScript | 25% |
| **Testing** | Test coverage, passing tests | 25% |
| **Deployment** | Docker, CI/CD, scripts | 20% |
| **Documentation** | README, docs, comments | 15% |
| **PRD Compliance** | Feature implementation | 15% |

---

## 🔧 Common First-Time Issues

### Issue: "No audit data available"

**Solution:**
```bash
python -m guardrail audit --repo . --full
```

---

### Issue: "PRD mapping not available"

**Solution:**
```bash
python -m guardrail baseline --repo . --update-memory
```

---

### Issue: Low scores on first run

**This is normal!** Guardrail is showing you what needs improvement.

**Action:**
1. Read the recommendations in your report
2. Fix critical (red) issues first
3. Gradually improve yellow areas
4. Track progress weekly

---

## 📈 Next Steps

### 1. Review Your Report

Open `GUARDRAIL_REPORT_WEEK_1.md` and review:
- Overall score
- Dimension scores
- Critical issues
- Recommendations

### 2. Address Critical Issues

Focus on any **red-level** dimensions first:

```bash
# See what can be auto-fixed
python -m guardrail fix --repo . --critical-only
```

### 3. Set Up Weekly Automation

**Option A: Manual Reminder**
- Set a calendar reminder for every Monday
- Run `python guardrail-weekly.py`

**Option B: Automated (Cron/Task Scheduler)**

**Linux/Mac:**
```bash
# Add to crontab
0 9 * * 1 cd /path/to/repo && python guardrail-weekly.py
```

**Windows:**
```powershell
# Create scheduled task
$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-File E:\path\to\guardrail-weekly.ps1"
$trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Monday -At 9am
Register-ScheduledTask -Action $action -Trigger $trigger -TaskName "Guardrail Weekly"
```

### 4. Enable Git Hooks (Optional)

For pre-commit quality checks:

```bash
python -m guardrail git-hook --enable
```

Now every commit will be checked for quality!

---

## 🎓 Learn More

- **[GUARDRAIL_SYSTEM.md](GUARDRAIL_SYSTEM.md)**: Complete documentation
- **[GUARDRAIL_PROMPTS.md](GUARDRAIL_PROMPTS.md)**: Agent behaviors
- **[GUARDRAIL_EXAMPLES.md](GUARDRAIL_EXAMPLES.md)**: Usage examples

---

## 💡 Tips

### Tip 1: Start Small
Don't try to fix everything at once. Focus on:
1. Critical issues first (red)
2. Then yellow areas
3. Maintain green areas

### Tip 2: Track Progress
Run weekly and watch your scores improve over time!

### Tip 3: Team Collaboration
Share weekly reports in team meetings to:
- Celebrate improvements
- Discuss regressions
- Plan quality initiatives

### Tip 4: Customize
Edit `.guardrail/config.json` to adjust:
- Score thresholds
- Dimension weights
- Git hook settings

---

## ❓ Questions?

**Q: How long does a weekly run take?**  
A: 2-3 minutes for complete maintenance.

**Q: Will it modify my code?**  
A: Only safe changes like:
- Creating missing config files
- Running lint --fix
- Updating documentation

**Q: Can I undo changes?**  
A: Yes, all changes are Git-trackable. Review and commit/revert as needed.

**Q: What if I don't have a PRD?**  
A: PRD compliance will score 0, but other dimensions still work. Create a PRD.md to improve this score.

**Q: Can I run this in CI/CD?**  
A: Yes! See GUARDRAIL_SYSTEM.md for GitHub Actions example.

---

## 🎉 Congratulations!

You've successfully set up Guardrail and run your first audit!

**Next:** Schedule your first weekly maintenance for next Monday.

---

**Version:** 1.0.0  
**Last Updated:** January 5, 2026  
**Time to Complete:** ⏱️ 5 minutes

