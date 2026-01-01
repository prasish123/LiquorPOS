# Liquor POS Backend

Modern NestJS backend for Florida liquor store POS system.

## Tech Stack

- **Framework:** NestJS + TypeScript
- **Database:** libSQL (embedded) + PostgreSQL (cloud)
- **Cache/Events:** Redis
- **ORM:** Prisma
- **AI:** OpenAI (embeddings + vector search)

## Setup

1. Install dependencies:
```bash
npm install
```

2. Copy environment variables:
```bash
cp .env.example .env
```

3. Initialize Prisma:
```bash
npx prisma init
npx prisma generate
```

4. Run development server:
```bash
npm run start:dev
```

## Project Structure

```
backend/
├── src/
│   ├── modules/
│   │   ├── products/      # Product catalog management
│   │   ├── orders/        # Order processing
│   │   ├── inventory/     # Inventory tracking
│   │   ├── customers/     # Customer management
│   │   ├── payments/      # Payment processing
│   │   └── compliance/    # Age verification, tax
│   ├── integrations/
│   │   ├── conexxus/      # Conexxus API adapter
│   │   ├── ubereats/      # Uber Eats adapter
│   │   ├── doordash/      # DoorDash adapter
│   │   └── backoffice/    # Back-office adapter
│   ├── common/
│   │   ├── events/        # Event bus (Redis Pub/Sub)
│   │   ├── database/      # libSQL + Prisma clients
│   │   └── guards/        # Auth guards
│   └── main.ts
├── prisma/
│   └── schema.prisma      # Database schema
└── test/
```

## API Endpoints

### Products
- `GET /api/products` - List products
- `GET /api/products/search?q=wine` - Search products (vector search)
- `POST /api/products` - Create product
- `PUT /api/products/:id` - Update product
- `DELETE /api/products/:id` - Delete product

### Orders
- `POST /api/orders` - Create order
- `GET /api/orders/:id` - Get order
- `POST /api/orders/:id/refund` - Refund order

### Inventory
- `GET /api/inventory` - Get inventory levels
- `POST /api/inventory/adjust` - Adjust inventory
- `GET /api/inventory/low-stock` - Get low stock items

## Development

```bash
# Development mode
npm run start:dev

# Production build
npm run build
npm run start:prod

# Tests
npm run test
npm run test:e2e
npm run test:cov
```

## Environment Variables

See `.env.example` for all required environment variables.
