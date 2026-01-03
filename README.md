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

- [Setup Guide](docs/setup.md) - Installation and configuration
- [Configuration](docs/configuration.md) - Environment variables
- [Deployment](docs/deployment.md) - Production deployment
- [Architecture](docs/architecture.md) - System design
- [Known Limitations](docs/known-limitations.md) - Missing features

## Requirements

- Node.js 18+
- PostgreSQL 14+
- Stripe account (for card payments)

## License

See [LICENSE](LICENSE) file.

