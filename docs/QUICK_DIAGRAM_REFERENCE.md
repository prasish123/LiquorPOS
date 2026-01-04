# Quick Diagram Reference Card

> **Fast access** to the most commonly used diagrams

---

## 🚀 Most Used Diagrams

### For Daily Development

| What You Need | Diagram | Link |
|---------------|---------|------|
| **System Overview** | High-Level Architecture | [View →](VISUAL_ARCHITECTURE_DIAGRAMS.md#11-high-level-system-architecture) |
| **Checkout Flow** | Counter Checkout Sequence | [View →](VISUAL_ARCHITECTURE_DIAGRAMS.md#21-counter-checkout-flow-happy-path) |
| **Database Schema** | Entity Relationship Diagram | [View →](VISUAL_ARCHITECTURE_DIAGRAMS.md#51-entity-relationship-diagram) |
| **API Structure** | Backend Module Architecture | [View →](VISUAL_ARCHITECTURE_DIAGRAMS.md#12-module-architecture-backend) |
| **Frontend Structure** | Frontend Architecture | [View →](VISUAL_ARCHITECTURE_DIAGRAMS.md#13-frontend-architecture) |

### For Configuration

| What You Need | Diagram | Link |
|---------------|---------|------|
| **Add Tax Rate** | Tax Configuration Flow | [View →](VISUAL_ARCHITECTURE_DIAGRAMS.md#61-tax-configuration-flow) |
| **Set Pricing** | Multi-Tier Pricing | [View →](UI_CONFIGURATION_GUIDE.md#31-multi-tier-pricing-structure) |
| **Add Product** | Product Configuration | [View →](VISUAL_ARCHITECTURE_DIAGRAMS.md#63-adding-new-product-configuration) |
| **Add Button** | Button Configuration | [View →](UI_CONFIGURATION_GUIDE.md#11-adding-a-new-button-to-pos) |
| **User Roles** | RBAC Configuration | [View →](UI_CONFIGURATION_GUIDE.md#51-role-based-access-control-rbac) |

### For Deployment

| What You Need | Diagram | Link |
|---------------|---------|------|
| **Deploy App** | Production Infrastructure | [View →](DEPLOYMENT_INTEGRATION_DIAGRAMS.md#11-production-infrastructure) |
| **CI/CD Setup** | Deployment Pipelines | [View →](DEPLOYMENT_INTEGRATION_DIAGRAMS.md#2-cicd-pipelines) |
| **Monitoring** | Monitoring Stack | [View →](DEPLOYMENT_INTEGRATION_DIAGRAMS.md#41-monitoring-stack) |
| **Backups** | Backup Strategy | [View →](DEPLOYMENT_INTEGRATION_DIAGRAMS.md#51-backup-strategy) |
| **Scaling** | Auto-Scaling Config | [View →](DEPLOYMENT_INTEGRATION_DIAGRAMS.md#64-auto-scaling-configuration) |

---

## 📱 By Feature

### Checkout & Payments
- [Checkout Flow](VISUAL_ARCHITECTURE_DIAGRAMS.md#21-counter-checkout-flow-happy-path) - Complete checkout process
- [Payment Integration](DEPLOYMENT_INTEGRATION_DIAGRAMS.md#31-stripe-payment-integration-flow) - Stripe integration
- [Offline Checkout](VISUAL_ARCHITECTURE_DIAGRAMS.md#22-offline-order-processing) - Offline mode handling

### Inventory Management
- [Inventory Adjustment](VISUAL_ARCHITECTURE_DIAGRAMS.md#25-inventory-adjustment-flow) - Update stock
- [Reorder Rules](UI_CONFIGURATION_GUIDE.md#23-inventory-reorder-rules) - Auto-reorder alerts
- [Real-Time Sync](DEPLOYMENT_INTEGRATION_DIAGRAMS.md#33-real-time-inventory-sync) - Multi-store sync

### Product Management
- [Add Product](VISUAL_ARCHITECTURE_DIAGRAMS.md#63-adding-new-product-configuration) - Product setup
- [Product Search](VISUAL_ARCHITECTURE_DIAGRAMS.md#24-product-search-with-ai) - AI-powered search
- [Product Attributes](UI_CONFIGURATION_GUIDE.md#42-product-attribute-configuration) - Configure attributes

### User Management
- [Authentication](VISUAL_ARCHITECTURE_DIAGRAMS.md#23-authentication-flow) - Login flow
- [Add User](UI_CONFIGURATION_GUIDE.md#52-adding-a-new-user) - User creation
- [PIN Login](UI_CONFIGURATION_GUIDE.md#53-user-authentication-flow-with-pin) - Quick cashier login

### Business Rules
- [Age Verification](UI_CONFIGURATION_GUIDE.md#21-age-verification-rules) - Compliance rules
- [Discounts](UI_CONFIGURATION_GUIDE.md#22-discount-rules-engine) - Discount configuration
- [Tax Calculation](UI_CONFIGURATION_GUIDE.md#32-tax-calculation-flow) - Tax setup

---

## 🎯 By Task

### "I need to..."

#### ...understand the system
1. [System Architecture](VISUAL_ARCHITECTURE_DIAGRAMS.md#11-high-level-system-architecture)
2. [Backend Modules](VISUAL_ARCHITECTURE_DIAGRAMS.md#12-module-architecture-backend)
3. [Database Schema](VISUAL_ARCHITECTURE_DIAGRAMS.md#51-entity-relationship-diagram)

#### ...add a new feature
1. [Design Patterns](VISUAL_ARCHITECTURE_DIAGRAMS.md#4-design-patterns)
2. [Component Architecture](VISUAL_ARCHITECTURE_DIAGRAMS.md#7-ui-component-architecture)
3. [State Management](VISUAL_ARCHITECTURE_DIAGRAMS.md#8-state-management)

#### ...configure pricing/taxes
1. [Tax Configuration](VISUAL_ARCHITECTURE_DIAGRAMS.md#61-tax-configuration-flow)
2. [Pricing Tiers](UI_CONFIGURATION_GUIDE.md#31-multi-tier-pricing-structure)
3. [Dynamic Pricing](UI_CONFIGURATION_GUIDE.md#33-dynamic-pricing-rules)

#### ...customize the UI
1. [Theme System](UI_CONFIGURATION_GUIDE.md#15-theme-customization)
2. [Add Button](UI_CONFIGURATION_GUIDE.md#11-adding-a-new-button-to-pos)
3. [Cart Display](UI_CONFIGURATION_GUIDE.md#12-customizing-cart-display)

#### ...deploy to production
1. [Infrastructure](DEPLOYMENT_INTEGRATION_DIAGRAMS.md#11-production-infrastructure)
2. [CI/CD Pipeline](DEPLOYMENT_INTEGRATION_DIAGRAMS.md#21-frontend-deployment-pipeline)
3. [Monitoring](DEPLOYMENT_INTEGRATION_DIAGRAMS.md#41-monitoring-stack)

#### ...integrate external services
1. [Integration Patterns](DEPLOYMENT_INTEGRATION_DIAGRAMS.md#3-integration-patterns)
2. [Stripe Integration](DEPLOYMENT_INTEGRATION_DIAGRAMS.md#31-stripe-payment-integration-flow)
3. [Webhook Pattern](DEPLOYMENT_INTEGRATION_DIAGRAMS.md#34-webhook-integration-pattern)

#### ...troubleshoot issues
1. [Monitoring Dashboard](DEPLOYMENT_INTEGRATION_DIAGRAMS.md#42-key-metrics-dashboard)
2. [Error Handling](UI_CONFIGURATION_GUIDE.md#63-error-handling-configuration)
3. [Disaster Recovery](DEPLOYMENT_INTEGRATION_DIAGRAMS.md#52-disaster-recovery-runbook)

---

## 🔥 Top 10 Most Important Diagrams

### 1. System Architecture
**Why:** Understand the entire system at a glance  
**Link:** [View →](VISUAL_ARCHITECTURE_DIAGRAMS.md#11-high-level-system-architecture)

### 2. Checkout Flow
**Why:** Core business process - most used feature  
**Link:** [View →](VISUAL_ARCHITECTURE_DIAGRAMS.md#21-counter-checkout-flow-happy-path)

### 3. Database Schema
**Why:** Foundation of all data operations  
**Link:** [View →](VISUAL_ARCHITECTURE_DIAGRAMS.md#51-entity-relationship-diagram)

### 4. Backend Modules
**Why:** Navigate the backend codebase  
**Link:** [View →](VISUAL_ARCHITECTURE_DIAGRAMS.md#12-module-architecture-backend)

### 5. Authentication Flow
**Why:** Security and user management  
**Link:** [View →](VISUAL_ARCHITECTURE_DIAGRAMS.md#23-authentication-flow)

### 6. SAGA Pattern
**Why:** Understand order processing logic  
**Link:** [View →](VISUAL_ARCHITECTURE_DIAGRAMS.md#41-saga-pattern-order-orchestration)

### 7. Production Infrastructure
**Why:** Deploy and maintain the system  
**Link:** [View →](DEPLOYMENT_INTEGRATION_DIAGRAMS.md#11-production-infrastructure)

### 8. Tax Configuration
**Why:** Critical for compliance  
**Link:** [View →](VISUAL_ARCHITECTURE_DIAGRAMS.md#61-tax-configuration-flow)

### 9. Monitoring Stack
**Why:** Keep system healthy  
**Link:** [View →](DEPLOYMENT_INTEGRATION_DIAGRAMS.md#41-monitoring-stack)

### 10. RBAC
**Why:** User permissions and security  
**Link:** [View →](UI_CONFIGURATION_GUIDE.md#51-role-based-access-control-rbac)

---

## 📚 Complete Documentation

For the full set of 70+ diagrams, see:

- **[Visual Diagrams Summary](DIAGRAMS_SUMMARY.md)** - Overview of all diagrams
- **[Complete Index](DIAGRAMS_INDEX.md)** - Searchable index with use cases
- **[Visual Architecture](VISUAL_ARCHITECTURE_DIAGRAMS.md)** - 25+ architecture diagrams
- **[UI Configuration](UI_CONFIGURATION_GUIDE.md)** - 20+ configuration diagrams
- **[Deployment](DEPLOYMENT_INTEGRATION_DIAGRAMS.md)** - 25+ deployment diagrams

---

## 🎨 Diagram Legend

### Colors

| Color | Meaning | Hex |
|-------|---------|-----|
| 🟢 Green | Success, Primary Actions | #4CAF50 |
| 🔵 Blue | Info, Secondary Actions | #2196F3 |
| 🟠 Orange | Warnings, Intermediate | #FF9800 |
| 🔴 Red | Errors, Danger Actions | #F44336 |
| 🟣 Purple | Special, External | #9C27B0 |

### Technologies

| Technology | Color | Hex |
|------------|-------|-----|
| PostgreSQL | Blue | #336791 |
| Redis | Red | #DC382D |
| Cloudflare | Orange | #F38020 |
| NestJS | Red | #E0234E |
| React | Cyan | #61DAFB |
| Stripe | Purple | #635BFF |

---

## 💡 Tips

### Viewing Diagrams

**In GitHub:** Just open the file - diagrams render automatically

**In VS Code:**
1. Install "Markdown Preview Mermaid Support"
2. Press `Ctrl+Shift+V` (or `Cmd+Shift+V` on Mac)

**Online:** Copy code to https://mermaid.live

### Finding Diagrams

1. **Know what you need?** Use this quick reference
2. **Browsing?** Check the [Summary](DIAGRAMS_SUMMARY.md)
3. **Searching?** Use the [Complete Index](DIAGRAMS_INDEX.md)
4. **Learning?** Start with [System Architecture](VISUAL_ARCHITECTURE_DIAGRAMS.md)

### Using Diagrams

- **Reference during development** - Keep relevant diagrams open
- **Copy code examples** - Most diagrams include code snippets
- **Follow sequences** - Step-by-step implementation guides
- **Customize for your needs** - Diagrams are templates

---

## 🔗 Quick Links

### Main Documents
- 📘 [Visual Architecture](VISUAL_ARCHITECTURE_DIAGRAMS.md)
- 🎨 [UI Configuration](UI_CONFIGURATION_GUIDE.md)
- 🚀 [Deployment](DEPLOYMENT_INTEGRATION_DIAGRAMS.md)
- 📑 [Complete Index](DIAGRAMS_INDEX.md)
- 📊 [Summary](DIAGRAMS_SUMMARY.md)

### Other Documentation
- 📖 [Architecture](architecture.md)
- ⚙️ [Configuration](configuration.md)
- 🛠️ [Setup](setup.md)
- 📋 [PRD](PRD.md)

---

**Last Updated:** January 3, 2026  
**Quick Access:** Bookmark this page for fast diagram lookup!

