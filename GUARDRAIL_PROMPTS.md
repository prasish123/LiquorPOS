# Guardrail Agent Prompts

Complete reference of agent prompts and behaviors for the Guardrail system.

---

## 🤖 Agent Prompts

### 1. Interpreter Agent

**Purpose:** Scan repository, map features to PRD, maintain baseline understanding.

**Prompt:**

```
INTERPRETER AGENT
- Scan entire repo for current code, file structure, and PRD implementation.
- Map features to PRD requirements.
- Update internal memory to reflect current repo state.
- Identify any gaps in PRD coverage.
```

**Behavior:**
- Scans backend/, frontend/, docs/, scripts/ directories
- Counts files and lines of code
- Reads PRD.md and extracts requirements (REQ-001, REQ-002, etc.)
- Maps requirements to implementation files
- Identifies missing critical files
- Checks for test coverage
- Saves baseline to memory.json

**Output:**
```json
{
  "timestamp": "2026-01-05T10:00:00",
  "structure": {
    "backend": { "total_files": 45, "total_lines": 5234 },
    "frontend": { "total_files": 38, "total_lines": 4156 }
  },
  "prd_mapping": {
    "total_requirements": 15,
    "implemented": 12,
    "mapping": { ... }
  },
  "gaps": [
    { "type": "missing_file", "file": ".env.example" }
  ]
}
```

---

### 2. Maintainability Agent

**Purpose:** Evaluate code quality across all dimensions and provide scores.

**Prompt:**

```
MAINTAINABILITY AGENT
- Evaluate code quality, linting, formatting, TypeScript strictness.
- Measure test coverage and verify passing tests.
- Verify deployment readiness (Docker, CI/CD, scripts, env files).
- Evaluate documentation completeness and clarity.
- Score each dimension: Red (0-49), Yellow (50-74), Green (75-100).
- Provide actionable recommendations for dimensions scoring <75.
```

**Behavior:**
- **Code Quality (25%):**
  - Check for .eslintrc.js, tsconfig.json, .prettierrc
  - Run `npm run lint` and count errors
  - Deduct points for missing configs and errors

- **Testing (25%):**
  - Find test files (*.spec.ts, *.test.ts)
  - Check for jest.config.js
  - Run `npm run test:cov` and parse coverage
  - Deduct points for missing tests or low coverage

- **Deployment (20%):**
  - Check for docker-compose.yml, Dockerfiles
  - Check for .env.example, deploy scripts
  - Check for CI/CD configuration
  - Deduct points for missing files

- **Documentation (15%):**
  - Check for README.md, DEPLOYMENT.md, RUNBOOK.md
  - Check for docs/architecture.md, docs/PRD.md
  - Check for inline JSDoc comments
  - Deduct points for missing or incomplete docs

- **PRD Compliance (15%):**
  - Use PRD mapping from Interpreter Agent
  - Calculate implementation percentage
  - Score based on coverage

**Output:**
```json
{
  "overall_score": 78.5,
  "overall_level": "green",
  "dimensions": {
    "code_quality": {
      "score": 85.0,
      "level": "green",
      "issues": [],
      "recommendations": []
    },
    "testing": {
      "score": 70.0,
      "level": "yellow",
      "issues": ["Backend test coverage low: 70%"],
      "recommendations": ["Increase test coverage to at least 80%"]
    }
  },
  "critical_issues": [],
  "warnings": ["[testing] Backend test coverage low: 70%"]
}
```

---

### 3. Trend Agent

**Purpose:** Track score changes over time and identify trends.

**Prompt:**

```
TREND TRACKER AGENT
- Compare current audit scores with historical scores.
- Identify regressions or improvements in each dimension.
- Mark trends as:
   🔴 Red → worsening (change < -5)
   🟡 Yellow → stable (change -5 to +5)
   🟢 Green → improving (change > +5)
- Generate a weekly trend report.
```

**Behavior:**
- Load history.json (up to 52 weeks)
- Compare latest audit with previous week
- Calculate change for each dimension
- Classify trend direction
- Identify regressions and improvements
- Generate ASCII trend charts
- Save updated history

**Output:**
```json
{
  "timestamp": "2026-01-05T10:00:00",
  "overall_trend": "improving",
  "trends": {
    "code_quality": {
      "current_score": 85.0,
      "previous_score": 80.0,
      "change": +5.0,
      "direction": "improving"
    },
    "testing": {
      "current_score": 70.0,
      "previous_score": 75.0,
      "change": -5.0,
      "direction": "worsening"
    }
  },
  "regressions": ["testing: -5.0 points"],
  "improvements": ["code_quality: +5.0 points"]
}
```

---

### 4. Agentic Fix Loop

**Purpose:** Automatically fix critical issues safely.

**Prompt:**

```
AGENTIC FIX LOOP
- Only address Red-level critical issues identified by the audit.
- For each issue:
   1. List minimal files to change.
   2. Describe exact changes.
   3. Implement safely without breaking existing functionality.
   4. Self-review correctness, edge cases, and security.
   5. Generate verification steps including unit/integration tests.
- Update memory after fixes.
```

**Behavior:**

**Fixable Issues:**
1. **Missing ESLint config** → Create .eslintrc.js
2. **Missing Prettier config** → Create .prettierrc
3. **Missing .env.example** → Create with detected variables
4. **Missing README.md** → Create template
5. **Linting errors** → Run `npm run lint -- --fix`
6. **Formatting issues** → Run `npm run format`

**Safety Checks:**
- Only fix issues with known safe solutions
- Never modify business logic
- Never delete files
- Always generate verification steps
- Skip if file already exists

**Output:**
```json
{
  "status": "complete",
  "total_issues": 3,
  "fixes_applied": 2,
  "fixes_skipped": 1,
  "fixes": [
    {
      "issue": "Backend ESLint configuration missing",
      "status": "applied",
      "files_changed": ["backend/.eslintrc.js"],
      "description": "Created backend/.eslintrc.js",
      "verification_steps": [
        "Verify backend/.eslintrc.js exists",
        "Run npm run lint to test"
      ]
    }
  ]
}
```

---

### 5. Documentation Agent

**Purpose:** Keep documentation synchronized with code.

**Prompt:**

```
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
```

**Behavior:**

**Updates:**
1. **.env.example:**
   - Scan code for `process.env.VARIABLE_NAME`
   - Add missing variables to .env.example

2. **README.md:**
   - Check for essential sections
   - Add Quick Start if missing
   - Add Documentation links if missing

3. **DEPLOYMENT.md:**
   - Verify Docker instructions present
   - Check for deployment steps

4. **RUNBOOK.md:**
   - Verify operational sections exist
   - Check for monitoring, troubleshooting, backup sections

5. **QUICKSTART.md:**
   - Create if missing
   - Include 5-minute setup guide

**Output:**
```json
{
  "timestamp": "2026-01-05T10:00:00",
  "files_updated": [".env.example", "QUICKSTART.md"],
  "updates": [
    {
      "file": ".env.example",
      "action": "updated",
      "changes": "Added 3 missing variables"
    },
    {
      "file": "QUICKSTART.md",
      "action": "created",
      "changes": ["Created quick start guide"]
    }
  ]
}
```

---

### 6. Reporting Agent

**Purpose:** Generate comprehensive team reports.

**Prompt:**

```
REPORTING AGENT
- Summarize current scores per dimension.
- Include trend changes since last week.
- List critical/failing issues and fixes applied.
- Highlight Yellow-level areas for attention.
- Output actionable recommendations for next week.
```

**Behavior:**
- Load latest audit result
- Load latest trend report
- Load recent fixes
- Load recent doc updates
- Generate recommendations based on:
  - Critical issues (red level)
  - Yellow-level dimensions
  - Regressions
- Generate next actions
- Create markdown report
- Save JSON and markdown formats

**Output:**

**JSON:**
```json
{
  "timestamp": "2026-01-05T10:00:00",
  "week_number": 1,
  "audit_result": { ... },
  "trend_report": { ... },
  "fixes_applied": [ ... ],
  "docs_updated": [ ... ],
  "recommendations": [
    "🟡 testing: Score 70.0 - Increase test coverage to at least 80%"
  ],
  "next_actions": [
    "Improve: testing",
    "Run weekly Guardrail maintenance next week"
  ]
}
```

**Markdown:**
See `GUARDRAIL_REPORT_WEEK_*.md` for full format.

---

## 🔄 Weekly Maintenance Flow

```
┌─────────────────────────────────────────────────────────────┐
│                  Weekly Maintenance Flow                    │
└─────────────────────────────────────────────────────────────┘

Step 1: Update Baseline
├─ Interpreter Agent scans repository
├─ Maps PRD requirements
├─ Updates memory.json
└─ Identifies gaps

Step 2: Run Full Audit
├─ Maintainability Agent evaluates all dimensions
├─ Calculates scores
├─ Identifies critical issues
└─ Saves latest_audit.json

Step 3: Update Trends
├─ Trend Agent compares with history
├─ Calculates changes
├─ Identifies regressions/improvements
└─ Saves latest_trend.json

Step 4: Apply Fixes
├─ Agentic Fix Loop identifies fixable issues
├─ Applies safe fixes
├─ Generates verification steps
└─ Saves latest_fixes.json

Step 5: Update Documentation
├─ Documentation Agent checks for updates needed
├─ Updates .env.example, README, etc.
├─ Creates missing docs
└─ Saves latest_docs.json

Step 6: Generate Report
├─ Reporting Agent compiles all data
├─ Generates recommendations
├─ Creates next actions
├─ Saves report (JSON + Markdown)
└─ Outputs GUARDRAIL_REPORT_WEEK_*.md
```

---

## 🎯 Prompt Customization

### Adjusting Agent Behavior

Edit agent files in `guardrail/agents/` to customize behavior:

**Example: Stricter Code Quality**

```python
# guardrail/agents/maintainability.py

def _evaluate_code_quality(self):
    # ... existing code ...
    
    # Add stricter check
    if lint_results["backend"]["warnings"] > 10:
        issues.append(f"Too many linting warnings: {lint_results['backend']['warnings']}")
        score -= 5
        recommendations.append("Reduce linting warnings to under 10")
```

**Example: Custom Fix**

```python
# guardrail/agents/fix_loop.py

def _map_issue_to_fix(self, issue: str):
    # ... existing code ...
    
    # Add custom fix
    if "custom issue" in issue_lower:
        return {
            "type": "create_file",
            "description": issue,
            "file": "path/to/file",
            "content": "custom content",
        }
```

---

## 📊 Scoring Formulas

### Overall Score

```
Overall Score = Σ(Dimension Score × Weight)

Where:
  Code Quality Weight = 25%
  Testing Weight = 25%
  Deployment Weight = 20%
  Documentation Weight = 15%
  PRD Compliance Weight = 15%
```

### Dimension Scores

**Code Quality:**
```
Base Score = 100
- Missing ESLint config: -15
- Missing TypeScript config: -10
- Missing Prettier config: -5
- Linting errors: -min(20, errors × 2)
```

**Testing:**
```
Base Score = 100
- No backend tests: -30
- No frontend tests: -20
- Missing Jest config: -10
- Failing tests: -20
- Coverage < 80%: -10
```

**Deployment:**
```
Base Score = 100
- Missing docker-compose.yml: -20
- Missing docker-compose.dev.yml: -10
- Missing backend Dockerfile: -15
- Missing frontend Dockerfile: -15
- Missing .env.example: -10
- Missing deploy script: -10
- Missing CI/CD: -10
```

**Documentation:**
```
Base Score = 100
- Missing README.md: -20
- Missing DEPLOYMENT.md: -15
- Missing RUNBOOK.md: -15
- Missing architecture.md: -10
- Missing PRD.md: -10
- Incomplete docs: -50% of weight
- Low inline documentation: -10
```

**PRD Compliance:**
```
Score = (Implemented Requirements / Total Requirements) × 100
```

---

## 🔧 Advanced Customization

### Custom Agents

Create new agents by extending base structure:

```python
# guardrail/agents/custom_agent.py

class CustomAgent:
    """
    CUSTOM AGENT
    - Your custom prompt here
    - Define specific behaviors
    - Specify outputs
    """
    
    def __init__(self, system):
        self.system = system
        self.repo_path = system.repo_path
    
    def custom_action(self):
        """Implement custom behavior."""
        # Your logic here
        pass
```

Register in `guardrail/agents/__init__.py`:

```python
from .custom_agent import CustomAgent

__all__ = [
    # ... existing agents ...
    "CustomAgent",
]
```

Use in core system:

```python
# guardrail/core.py

def __init__(self, repo_path: str = "."):
    # ... existing code ...
    self.custom = CustomAgent(self)
```

---

## 📚 References

- **[GUARDRAIL_SYSTEM.md](GUARDRAIL_SYSTEM.md)**: Complete system documentation
- **[GUARDRAIL_EXAMPLES.md](GUARDRAIL_EXAMPLES.md)**: Usage examples
- **Source Code**: `guardrail/agents/` directory

---

**Version:** 1.0.0  
**Last Updated:** January 5, 2026

