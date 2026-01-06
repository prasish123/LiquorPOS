# Liquor POS System

Modern point-of-sale system for Florida liquor stores with offline-first architecture, integrated payments, and compliance features.

## 🚀 Quick Start (5 minutes)

### Prerequisites
- Docker Desktop ([Download](https://www.docker.com/products/docker-desktop/))
- Node.js 22+ (for secret generation)

### Setup

```bash
# 1. Clone repository
git clone <your-repo-url>
cd liquor-pos

# 2. Configure environment
cp .env.example .env

# 3. Generate secrets (copy output to .env)
node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(64).toString('hex'))"
node -e "console.log('AUDIT_LOG_ENCRYPTION_KEY=' + require('crypto').randomBytes(32).toString('base64'))"

# 4. Edit .env and set:
#    - JWT_SECRET (from step 3)
#    - AUDIT_LOG_ENCRYPTION_KEY (from step 3)
#    - DB_PASSWORD (strong password)
#    - REDIS_PASSWORD (strong password)
#    - STRIPE_SECRET_KEY (from Stripe dashboard)

# 5. Start system
docker-compose up -d

# Done! 🎉
```

**Access:**
- Frontend: http://localhost
- Backend API: http://localhost:3000
- API Docs: http://localhost:3000/api

**Default Login:** `admin` / `password123`

**Full Guide:** [Quick Start Guide](docs/QUICK_START.md)

## Features

- 🛒 Sales & Checkout
- 📦 Inventory Management
- 💳 Card & Cash Payments (Stripe)
- 🔒 Age Verification (21+)
- 📊 Reporting & Analytics
- 🌐 Offline Mode
- 🔐 Audit Logging

## 📚 Documentation

### Essential Docs
- **[Quick Start](docs/QUICK_START.md)** - Get running in 5 minutes
- **[Deployment Guide](docs/DEPLOYMENT.md)** - Production deployment
- **[Environment Variables](docs/ENVIRONMENT_VARIABLES.md)** - Complete configuration reference
- **[Troubleshooting](docs/TROUBLESHOOTING.md)** - Common issues & solutions

### Developer Docs
- [Setup Guide](docs/setup.md) - Development environment setup
- [Architecture](docs/architecture.md) - System design overview
- [Product Requirements](docs/PRD.md) - Product specifications

### Visual Documentation
- [Visual Diagrams](docs/DIAGRAMS_SUMMARY.md) - 70+ Mermaid diagrams
- [Architecture Diagrams](docs/VISUAL_ARCHITECTURE_DIAGRAMS.md) - System architecture
- [UI Configuration](docs/UI_CONFIGURATION_GUIDE.md) - UI customization

## 🛠️ Tech Stack

- **Backend:** Node.js 22, NestJS, TypeScript, Prisma
- **Frontend:** React, Vite, TypeScript
- **Database:** PostgreSQL 16
- **Cache:** Redis 7
- **Payments:** Stripe
- **Deployment:** Docker, Docker Compose
- **CI/CD:** GitHub Actions

## 📋 Requirements

- Docker Desktop (recommended) OR
- Node.js 22+ and PostgreSQL 16+ (manual setup)
- Stripe account (for card payments)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

See [DEVELOPER_ONBOARDING.md](DEVELOPER_ONBOARDING.md) for development setup.

## 📄 License

See [LICENSE](LICENSE) file.

---

**Built with ❤️ for Florida liquor stores**

