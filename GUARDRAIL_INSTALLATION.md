# Guardrail Installation Guide

## 🎯 Overview

Guardrail can run in two modes:

1. **Direct Mode** (Recommended) - No installation needed
2. **Installed Mode** (Optional) - Install as Python package

---

## ✅ Method 1: Direct Mode (Recommended)

**No installation needed!** Just run from the repository.

### Requirements

- Python 3.8+
- Repository cloned locally

### Usage

```bash
# Navigate to repository
cd /path/to/liquor-pos

# Run directly
python -m guardrail --help
python -m guardrail audit --repo . --full

# Weekly maintenance
python guardrail-weekly.py
```

**Advantages:**
- ✅ No installation needed
- ✅ Works immediately
- ✅ Easy to update (just git pull)
- ✅ No system modifications

---

## 📦 Method 2: Installed Mode (Optional)

Install Guardrail as a Python package for system-wide access.

### Installation

```bash
# Navigate to repository
cd /path/to/liquor-pos

# Install in development mode (editable)
pip install -e .

# Or install normally
python setup-guardrail.py install
```

### Usage After Installation

```bash
# Can run from anywhere
guardrail --help
guardrail audit --repo /path/to/repo --full

# Or still use python -m
python -m guardrail --help
```

**Advantages:**
- ✅ Run from anywhere
- ✅ Shorter command (`guardrail` vs `python -m guardrail`)
- ✅ System-wide availability

**Disadvantages:**
- ❌ Requires installation step
- ❌ Updates require reinstall

---

## 🚀 Quick Start (Direct Mode)

### Step 1: Verify Python

```bash
python --version
# Should show Python 3.8+
```

### Step 2: Navigate to Repository

```bash
cd /path/to/liquor-pos
```

### Step 3: Run Guardrail

```bash
# Test it works
python -m guardrail --help

# Run first audit
python -m guardrail baseline --repo . --update-memory
python -m guardrail audit --repo . --full

# Generate report
python -m guardrail report --repo . --weekly
```

### Step 4: Weekly Maintenance

```bash
# Single command
python guardrail-weekly.py
```

---

## 🔧 Troubleshooting

### Issue: "No module named guardrail"

**If using Direct Mode:**

Make sure you're in the repository root:
```bash
cd /path/to/liquor-pos
python -m guardrail --help
```

**If using Installed Mode:**

Reinstall:
```bash
pip uninstall guardrail
pip install -e .
```

---

### Issue: "Python not found"

**Windows:**
```powershell
# Check if Python is in PATH
python --version

# If not, add to PATH or use full path
C:\Python38\python.exe -m guardrail --help
```

**Mac/Linux:**
```bash
# Check if Python is installed
python3 --version

# Use python3 instead of python
python3 -m guardrail --help
```

---

### Issue: "Permission denied"

**Mac/Linux:**
```bash
# Make scripts executable
chmod +x guardrail-weekly.py
chmod +x guardrail-weekly.ps1

# Or run with python
python guardrail-weekly.py
```

---

## 📋 Verification

### Test Installation

```bash
# Test CLI
python -m guardrail --help

# Test baseline
python -m guardrail baseline --repo . --update-memory

# Test audit
python -m guardrail audit --repo . --full

# Test weekly script
python guardrail-weekly.py --dry-run
```

**Expected output:**
```
usage: guardrail [-h] {baseline,audit,trend,fix,docs,report,weekly,git-hook,git-check} ...

Guardrail - Automated Code Quality & Maintainability System
```

---

## 🌍 Platform-Specific Notes

### Windows

```powershell
# Use PowerShell for weekly maintenance
.\guardrail-weekly.ps1

# Or Python script
python guardrail-weekly.py
```

### Mac/Linux

```bash
# Use Python script
python guardrail-weekly.py

# Make executable (optional)
chmod +x guardrail-weekly.py
./guardrail-weekly.py
```

---

## 🔄 Updating

### Direct Mode

```bash
# Just pull latest changes
git pull origin main

# No reinstallation needed
python -m guardrail --help
```

### Installed Mode

```bash
# Pull latest changes
git pull origin main

# Reinstall
pip install -e . --upgrade
```

---

## 🗑️ Uninstallation

### Direct Mode

No uninstallation needed - just delete the files.

### Installed Mode

```bash
pip uninstall guardrail
```

---

## 📦 Dependencies

**None!** Guardrail uses only Python standard library:

- `json` - JSON handling
- `pathlib` - Path operations
- `subprocess` - Running commands
- `argparse` - CLI parsing
- `logging` - Logging
- `datetime` - Timestamps
- `dataclasses` - Data structures
- `enum` - Enumerations
- `typing` - Type hints

**Optional dependencies** (for enhanced features):

```bash
# Better JSON (optional)
pip install orjson

# Better CLI output (optional)
pip install rich

# Notifications (optional)
pip install requests
```

---

## ✅ Recommended Setup

**For most users:**

1. Use **Direct Mode** (no installation)
2. Run from repository root
3. Use `python -m guardrail` commands
4. Use `python guardrail-weekly.py` for weekly maintenance

**For power users:**

1. Install in development mode: `pip install -e .`
2. Run from anywhere: `guardrail` command
3. Set up weekly automation (cron/Task Scheduler)

---

## 🎓 Next Steps

After installation:

1. Read [GUARDRAIL_QUICKSTART.md](GUARDRAIL_QUICKSTART.md)
2. Run first audit
3. Set up weekly maintenance
4. Review [GUARDRAIL_SYSTEM.md](GUARDRAIL_SYSTEM.md) for full documentation

---

## 📞 Support

**Need help?**

1. Check this guide
2. Review [GUARDRAIL_QUICKSTART.md](GUARDRAIL_QUICKSTART.md)
3. Check [GUARDRAIL_SYSTEM.md](GUARDRAIL_SYSTEM.md) - Troubleshooting section

---

**Version:** 1.0.0  
**Last Updated:** January 5, 2026  
**Recommended:** Direct Mode (no installation)

