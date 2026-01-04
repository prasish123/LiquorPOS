# Liquor POS System

Modern point-of-sale system for Florida liquor stores with offline-first architecture, integrated payments, and compliance features.

## Quick Start

```bash
# Backend
cd backend
npm install && npm run migrate:deploy && npm run start:dev

# Frontend (new terminal)
cd frontend
npm install && npm run dev
```

**Login:** admin / password123  
**Docs:** [Setup Guide](docs/setup.md)

## Features

- 🛒 Sales & Checkout
- 📦 Inventory Management
- 💳 Card & Cash Payments (Stripe)
- 🔒 Age Verification (21+)
- 📊 Reporting & Analytics
- 🌐 Offline Mode
- 🔐 Audit Logging

## Documentation

### Getting Started
- [Setup Guide](docs/setup.md) - Installation and configuration
- [Configuration](docs/configuration.md) - Environment variables
- [Deployment](docs/deployment.md) - Production deployment

### Architecture & Design
- [Architecture](docs/architecture.md) - System design overview
- [Visual Diagrams](docs/DIAGRAMS_SUMMARY.md) - **70+ Mermaid diagrams** 🎨
  - [Architecture Diagrams](docs/VISUAL_ARCHITECTURE_DIAGRAMS.md) - System architecture, sequences, patterns
  - [UI Configuration](docs/UI_CONFIGURATION_GUIDE.md) - UI customization, business rules
  - [Deployment & Integration](docs/DEPLOYMENT_INTEGRATION_DIAGRAMS.md) - CI/CD, monitoring, scaling
  - [Complete Index](docs/DIAGRAMS_INDEX.md) - Quick reference for all diagrams

### Reference
- [Product Requirements](docs/PRD.md) - Product specifications
- [Known Limitations](docs/known-limitations.md) - Missing features

## Requirements

- Node.js 18+
- PostgreSQL 14+
- Stripe account (for card payments)

## License

See [LICENSE](LICENSE) file.

