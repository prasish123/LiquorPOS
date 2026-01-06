# Developer Onboarding Guide

**Welcome to the Liquor POS project!** This guide will get you up and running in 10 minutes.

---

## ⚡ Quick Setup

### 1. Prerequisites (2 minutes)

Install these tools:
- **Docker Desktop** - [Download](https://www.docker.com/products/docker-desktop/)
- **Node.js 22+** - [Download](https://nodejs.org/)
- **Git** - [Download](https://git-scm.com/)
- **VS Code** (recommended) - [Download](https://code.visualstudio.com/)

### 2. Clone & Configure (3 minutes)

```bash
# Clone repository
git clone <your-repo-url>
cd liquor-pos

# Copy environment file
cp .env.example .env

# Generate secrets
node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(64).toString('hex'))"
node -e "console.log('AUDIT_LOG_ENCRYPTION_KEY=' + require('crypto').randomBytes(32).toString('base64'))"

# Edit .env and paste the generated values
# Also set DB_PASSWORD and REDIS_PASSWORD
```

### 3. Start Development Environment (5 minutes)

```bash
# Start all services with hot reload
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d

# Wait for services to start (~30 seconds)
# Check status
docker-compose ps
```

**Access:**
- Frontend: http://localhost:5173 (dev mode with hot reload)
- Backend: http://localhost:3000
- API Docs: http://localhost:3000/api

**Default Login:** `admin` / `password123`

---

## 🏗️ Project Structure

```
liquor-pos/
├── backend/                 # NestJS API
│   ├── src/
│   │   ├── auth/           # Authentication
│   │   ├── products/       # Product management
│   │   ├── sales/          # Sales & checkout
│   │   ├── payments/       # Payment processing
│   │   └── ...
│   ├── prisma/             # Database schema & migrations
│   ├── Dockerfile          # Backend container
│   └── package.json
├── frontend/               # React UI
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── stores/         # State management (Zustand)
│   │   └── ...
│   ├── Dockerfile          # Frontend container
│   └── package.json
├── docs/                   # Documentation
├── docker-compose.yml      # Production setup
├── docker-compose.dev.yml  # Development overrides
└── .env.example            # Environment template
```

---

## 🔧 Development Workflow

### Running Tests

```bash
# Backend tests
cd backend
npm run test              # Unit tests
npm run test:cov          # With coverage
npm run test:e2e          # E2E tests

# Frontend tests
cd frontend
npm run test              # Unit tests
npx playwright test       # E2E tests
```

### Linting & Formatting

```bash
# Backend
cd backend
npm run lint              # Check linting
npm run lint:fix          # Auto-fix issues
npm run format            # Format with Prettier

# Frontend
cd frontend
npm run lint              # Check linting
npm run lint:fix          # Auto-fix issues
```

### Database Migrations

```bash
# Create new migration
cd backend
npm run migrate:dev -- --name add_new_feature

# Apply migrations
npm run migrate:deploy

# Reset database (dev only!)
npm run migrate:reset
```

### Viewing Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend

# Last 50 lines
docker-compose logs --tail=50 backend
```

---

## 🎯 Common Tasks

### Adding a New API Endpoint

1. **Create controller method** in `backend/src/<module>/<module>.controller.ts`
2. **Add service logic** in `backend/src/<module>/<module>.service.ts`
3. **Write tests** in `backend/src/<module>/<module>.service.spec.ts`
4. **Run tests:** `npm run test`
5. **Test manually:** http://localhost:3000/api

### Adding a New UI Component

1. **Create component** in `frontend/src/components/<ComponentName>.tsx`
2. **Add styles** (inline or CSS module)
3. **Import in parent** component
4. **Test in browser:** http://localhost:5173

### Updating Database Schema

1. **Edit** `backend/prisma/schema.prisma`
2. **Create migration:** `npm run migrate:dev -- --name your_change`
3. **Review migration** in `prisma/migrations/`
4. **Apply:** `npm run migrate:deploy`
5. **Update code** to use new schema

---

## 🐛 Debugging

### Backend Debugging (VS Code)

Add to `.vscode/launch.json`:

```json
{
  "type": "node",
  "request": "attach",
  "name": "Docker: Attach to Backend",
  "remoteRoot": "/app",
  "localRoot": "${workspaceFolder}/backend",
  "port": 9229
}
```

Start backend with debug flag:
```bash
docker-compose exec backend npm run start:debug
```

### Frontend Debugging

Use React DevTools browser extension:
- [Chrome](https://chrome.google.com/webstore/detail/react-developer-tools/fmkadmapgofadopljbjfkapdkoienihi)
- [Firefox](https://addons.mozilla.org/en-US/firefox/addon/react-devtools/)

---

## 📝 Code Style Guide

### TypeScript

- Use **strict mode** (enabled by default)
- Prefer **interfaces** over types for object shapes
- Use **async/await** over promises
- Add **JSDoc comments** for public APIs

### React

- Use **functional components** with hooks
- Use **TypeScript** for all components
- Keep components **small and focused**
- Extract **reusable logic** into custom hooks

### Naming Conventions

- **Files:** `kebab-case.ts`, `PascalCase.tsx` (components)
- **Variables:** `camelCase`
- **Constants:** `UPPER_SNAKE_CASE`
- **Classes/Interfaces:** `PascalCase`
- **Database tables:** `snake_case`

---

## 🚀 Deployment

### Development → Staging

```bash
# Push to develop branch
git push origin develop

# GitHub Actions will:
# 1. Run tests
# 2. Run linting
# 3. Build Docker images
# 4. Deploy to staging (if configured)
```

### Staging → Production

```bash
# Create release tag
git tag -a v1.0.0 -m "Release v1.0.0"
git push origin v1.0.0

# GitHub Actions will:
# 1. Run full test suite
# 2. Build production images
# 3. Deploy to production (if configured)
```

See [DEPLOYMENT.md](docs/DEPLOYMENT.md) for detailed deployment guide.

---

## 📚 Essential Documentation

| Document | Purpose |
|----------|---------|
| [QUICK_START.md](docs/QUICK_START.md) | 5-minute setup guide |
| [DEPLOYMENT.md](docs/DEPLOYMENT.md) | Production deployment |
| [ENVIRONMENT_VARIABLES.md](docs/ENVIRONMENT_VARIABLES.md) | Config reference |
| [TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) | Common issues |
| [PRD.md](docs/PRD.md) | Product requirements |
| [architecture.md](docs/architecture.md) | System design |

---

## 🆘 Getting Help

### Common Issues

**Docker not starting?**
- Ensure Docker Desktop is running
- Check `docker-compose logs` for errors

**Database connection errors?**
- Verify `DATABASE_URL` in `.env`
- Check `docker-compose logs postgres`

**Frontend not loading?**
- Check `docker-compose logs frontend`
- Verify `VITE_API_URL` in `.env`

**Tests failing?**
- Run `npm install` in backend/frontend
- Check test logs for specific errors

### Resources

- **Documentation:** `docs/` folder
- **API Docs:** http://localhost:3000/api (when running)
- **GitHub Issues:** Report bugs and feature requests
- **Team Chat:** [Your team chat link]

---

## ✅ Onboarding Checklist

- [ ] Clone repository
- [ ] Install prerequisites (Docker, Node.js, Git)
- [ ] Configure `.env` file
- [ ] Start development environment
- [ ] Access frontend and backend
- [ ] Run backend tests
- [ ] Run frontend tests
- [ ] Make a small code change
- [ ] Commit with pre-commit hooks
- [ ] Read essential documentation
- [ ] Set up VS Code debugging (optional)

---

**Welcome aboard! Happy coding! 🎉**

**Questions?** Ask your team lead or check the documentation.

**Last Updated:** January 5, 2026

