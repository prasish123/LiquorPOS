# Maintainability Tracking Guide

## Quick Answer to Your Questions

### 1. Did I rate it against your PRD?

**NO** - Yesterday I only reviewed feature requirements (REQ-001, REQ-002, REQ-003).  
**YES** - Today I've done a full PRD compliance check.

**Result:** Your maintainability score (46/100) accurately reflects PRD compliance (60%).

See `PRD_COMPLIANCE_CHECK.md` for full analysis.

---

### 2. How do I check the score on every git commit?

**Three ways:**

#### Option 1: Automatic (GitHub Actions) ✅ RECOMMENDED

Every time you push code, GitHub automatically:
1. Runs tests
2. Calculates maintainability score
3. Comments on your PR with the score
4. Fails if score < 70/100

**Setup:**
```bash
# Already created for you:
.github/workflows/maintainability-check.yml
.github/scripts/calculate-maintainability.js

# Just push to GitHub - it runs automatically!
git push
```

#### Option 2: Manual Check (Before Commit)

Run locally before committing:

**On Windows:**
```powershell
.\scripts\check-maintainability.ps1
```

**On Mac/Linux:**
```bash
./scripts/check-maintainability.sh
```

#### Option 3: Git Hook (Automatic on Commit)

Make it run automatically on every commit:

```bash
# Install Husky
npm install -D husky

# Set up pre-commit hook
npx husky install
npx husky add .husky/pre-commit "node .github/scripts/calculate-maintainability.js"

# Now it runs automatically on every commit!
git commit -m "Your message"
# → Maintainability check runs automatically
```

---

## What Gets Checked?

### 6 Dimensions (Weighted)

| Dimension | Weight | What It Checks |
|-----------|--------|----------------|
| **Code Organization** | 20% | Folder structure, file sizes, separation of concerns |
| **Documentation** | 25% | README, guides, API docs, troubleshooting |
| **Testing** | 20% | Test coverage, number of tests, test quality |
| **Error Handling** | 15% | Logger, exception filters, Sentry setup |
| **Deployment** | 15% | Docker, CI/CD, environment config |
| **Code Quality** | 5% | ESLint, Prettier, pre-commit hooks |

### Scoring

```
85-100: A (Excellent) ✅
70-84:  B (Good) ✅
55-69:  C (Fair) ⚠️
40-54:  D (Needs Work) ❌
0-39:   F (Critical) 🔴
```

---

## Current Status

### Your Scores

```
Overall:           46/100 (D) ❌
├─ Code Org:       50/100 ⚠️
├─ Documentation:  40/100 ❌
├─ Testing:        70/100 ✅
├─ Error Handling: 66/100 ⚠️
├─ Deployment:      0/100 🔴
└─ Code Quality:   40/100 ❌
```

### PRD Compliance

```
Functional Requirements:     72% ✅
Non-Functional Requirements: 56% ❌
Success Criteria:            27% ❌
Overall:                     60% ❌
```

---

## How to Improve Your Score

### Quick Wins (Get to 70/100 in 1 week)

#### Day 1: Docker Setup (+15 points)
```bash
# Create backend/Dockerfile
# Create docker-compose.yml
# Test: docker-compose up

# Impact: Deployment 0 → 60
```

#### Day 2: CI/CD (+10 points)
```bash
# Already created: .github/workflows/maintainability-check.yml
# Just push to GitHub

# Impact: Deployment 60 → 80
```

#### Day 3: Code Quality (+15 points)
```bash
cd backend
npm install -D eslint prettier husky
# Configure .eslintrc.js and .prettierrc
npm run lint -- --fix

# Impact: Code Quality 40 → 70
```

#### Day 4-5: Documentation (+20 points)
```bash
# Create:
docs/QUICK_START.md
docs/DEPLOYMENT.md
docs/TROUBLESHOOTING.md

# Impact: Documentation 40 → 70
```

**Result:** 46 → 75/100 (Grade C+ → B)

---

## Tracking Progress

### View Your Score

**After every commit:**
```bash
# Check locally
.\scripts\check-maintainability.ps1

# Or check on GitHub
# Go to Actions tab → See latest run
```

**On Pull Requests:**
- Score automatically commented
- PR fails if score < 70
- See detailed report in artifacts

### Track Over Time

Create a tracking file:

```bash
# Add to git
git add maintainability-report.md
git commit -m "Track maintainability score"

# View history
git log --oneline -- maintainability-report.md
```

---

## Integration with Your Workflow

### Recommended Workflow

```bash
# 1. Make changes
git add .

# 2. Check score (automatic if using git hook)
.\scripts\check-maintainability.ps1

# 3. If score < 70, fix issues
# ... make improvements ...

# 4. Commit
git commit -m "Your message"

# 5. Push (triggers GitHub Actions)
git push

# 6. Check PR for automated score
```

### What Happens on GitHub

```
Push to GitHub
    ↓
GitHub Actions runs
    ↓
1. Runs tests
2. Calculates coverage
3. Checks for Docker, docs, etc.
4. Calculates maintainability score
    ↓
Comments on PR with score
    ↓
✅ Pass (score >= 70) or ❌ Fail (score < 70)
```

---

## Example Output

### Terminal Output

```
🔍 Calculating maintainability score...

📁 Checking code organization...
   Score: 50/100
📚 Checking documentation...
   Score: 40/100
🧪 Checking testing...
   Score: 70/100
🚨 Checking error handling...
   Score: 66/100
🚀 Checking deployment...
   Score: 0/100
✨ Checking code quality...
   Score: 40/100

============================================================
Overall Maintainability Score: 46/100
Grade: D
============================================================

📊 Full report:

# Maintainability Report

**Generated:** 2026-01-04T...

## Overall Score: 46/100 (D)

**Status:** ❌ NEEDS WORK

---

## Dimension Scores

| Dimension | Score | Weight | Contribution |
|-----------|-------|--------|-------------|
| ⚠️ Code Organization | 50/100 | 20% | 10.0 |
| ❌ Documentation | 40/100 | 25% | 10.0 |
| ✅ Testing | 70/100 | 20% | 14.0 |
| ⚠️ Error Handling | 66/100 | 15% | 9.9 |
| ❌ Deployment | 0/100 | 15% | 0.0 |
| ❌ Code Quality | 40/100 | 5% | 2.0 |

---

## Recommendations

🔴 **CRITICAL:** Add Docker and CI/CD (Deployment: 0/100)
🔴 **CRITICAL:** Improve documentation (Documentation: 40/100)
🟡 **MEDIUM:** Add linting and formatting (Code Quality: 40/100)
```

### GitHub PR Comment

```markdown
## 🔍 Maintainability Check

**Score:** 46/100 (Grade D) ❌

### Dimension Scores
- ⚠️ Code Organization: 50/100
- ❌ Documentation: 40/100
- ✅ Testing: 70/100
- ⚠️ Error Handling: 66/100
- ❌ Deployment: 0/100
- ❌ Code Quality: 40/100

### Critical Issues
🔴 Add Docker and CI/CD
🔴 Improve documentation

[View full report](link to artifact)
```

---

## FAQ

### Q: Why does my score go down after adding code?

**A:** The calculator checks:
- Test coverage % (might decrease with new code)
- Large files (>500 lines)
- Missing docs for new features

**Fix:** Add tests and docs for new code.

### Q: Can I customize the weights?

**A:** Yes! Edit `.github/scripts/calculate-maintainability.js`:

```javascript
const WEIGHTS = {
  codeOrganization: 0.20,  // Change these
  documentation: 0.25,
  testing: 0.20,
  // ...
};
```

### Q: Can I change the threshold?

**A:** Yes! Edit `.github/workflows/maintainability-check.yml`:

```yaml
if [ "$SCORE" -lt 70 ]; then  # Change 70 to your threshold
```

### Q: How do I exclude files from checks?

**A:** Add to `.gitignore` or modify the calculator script to skip certain directories.

---

## Next Steps

1. **Set up automated checks:**
   ```bash
   git push  # Triggers GitHub Actions
   ```

2. **Run locally before commits:**
   ```bash
   .\scripts\check-maintainability.ps1
   ```

3. **Track your progress:**
   - Target: 70/100 by end of week
   - Target: 85/100 by end of month

4. **Follow the action plan:**
   - See `HONEST_MAINTAINABILITY_ASSESSMENT.md`
   - See `PRD_COMPLIANCE_CHECK.md`

---

## Summary

✅ **Automated scoring on every commit** (GitHub Actions)  
✅ **Manual checks before commit** (PowerShell/Bash scripts)  
✅ **PRD compliance tracking** (60% → 85% goal)  
✅ **Clear action plan** (46 → 85 in 4-8 weeks)

**Your question answered:**
- ✅ PRD compliance check created
- ✅ Automated scoring on every commit
- ✅ Clear path to improvement

---

*Start tracking your maintainability score today!*

