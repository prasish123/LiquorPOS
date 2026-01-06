# Command Reference - Quick Guide

## Linting Commands

### Frontend
```powershell
cd frontend
npm run lint           # Check for issues
npm run lint:fix       # Auto-fix issues
npm run format         # Format with Prettier
npm run type-check     # TypeScript type checking
```

### Backend
```powershell
cd backend
npm run lint           # Check for issues
```

---

## Guardrail Commands

### From Project Root
```powershell
# Update baseline
python -m guardrail baseline --repo . --update-memory

# Run full audit
python -m guardrail audit --repo . --full

# Generate weekly report
python -m guardrail report --repo . --weekly

# Apply fixes
python -m guardrail fix --repo . --critical-only

# Update documentation
python -m guardrail docs --repo . --update

# Track trends
python -m guardrail trend --repo . --update
```

### Weekly Maintenance (All-in-One)
```powershell
.\guardrail-weekly.ps1
```

---

## Development Commands

### Frontend
```powershell
cd frontend
npm run dev            # Start dev server
npm run build          # Build for production
npm run preview        # Preview production build
```

### Backend
```powershell
cd backend
npm run start:dev      # Start dev server
npm run build          # Build for production
npm run start:prod     # Start production server
npm test               # Run tests
npm run test:cov       # Run tests with coverage
```

---

## Docker Commands

```powershell
# Start all services
docker-compose up -d

# Start with observability
docker-compose -f docker-compose.yml -f docker-compose.observability.yml up -d

# Stop all services
docker-compose down

# View logs
docker-compose logs -f

# Rebuild services
docker-compose up -d --build
```

---

## Quick Status Check

```powershell
# Check frontend linting
cd frontend ; npm run lint ; cd ..

# Check backend linting
cd backend ; npm run lint ; cd ..

# Check Guardrail status
python -m guardrail audit --repo . --full
```

---

## File Locations

### Configuration Files
- `frontend/eslint.config.js` - Frontend ESLint config
- `frontend/.prettierrc` - Frontend Prettier config
- `backend/.prettierrc` - Backend Prettier config
- `backend/.eslintrc.js` - Backend ESLint config

### Guardrail Files
- `.guardrail/memory.json` - Guardrail baseline memory
- `.guardrail/history.json` - Audit history
- `.guardrail/config.json` - Guardrail configuration
- `GUARDRAIL_REPORT_WEEK_*.md` - Weekly reports

### Documentation
- `ALL_ISSUES_FIXED.md` - Fix summary
- `LINTING_FIXES_COMPLETE.md` - Detailed fixes
- `QUICK_FIX_SUMMARY.md` - Quick reference
- `GUARDRAIL_START_HERE.md` - Guardrail guide

---

## Troubleshooting

### If linting fails:
```powershell
# Reinstall dependencies
cd frontend
npm install --legacy-peer-deps

cd ../backend
npm install
```

### If Guardrail fails:
```powershell
# Check Python installation
python --version

# Reinstall Guardrail dependencies
pip install -r requirements-guardrail.txt
```

### If Docker fails:
```powershell
# Check Docker is running
docker ps

# Restart Docker Desktop
# Then try again
docker-compose up -d
```

---

## Daily Workflow

1. **Start development:**
   ```powershell
   docker-compose up -d
   cd frontend
   npm run dev
   ```

2. **Before committing:**
   ```powershell
   npm run lint
   npm run type-check
   ```

3. **Weekly (Monday):**
   ```powershell
   .\guardrail-weekly.ps1
   ```

---

## Emergency Commands

### Reset everything:
```powershell
# Stop all Docker containers
docker-compose down

# Clean node_modules
Remove-Item -Recurse -Force frontend\node_modules, backend\node_modules

# Reinstall
cd frontend ; npm install --legacy-peer-deps ; cd ..
cd backend ; npm install ; cd ..
```

### Fresh Guardrail baseline:
```powershell
Remove-Item -Recurse -Force .guardrail
python -m guardrail baseline --repo . --update-memory
```

---

**Keep this file handy for quick reference!**

