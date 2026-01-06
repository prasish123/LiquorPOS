# 🚀 DEPLOYMENT SCENARIOS - COMPLETE GUIDE

## Overview

This POS system supports **3 deployment scenarios**:

1. **Single Store (All-in-One)** - Everything on one computer
2. **Multi-Terminal Store** - One server + multiple POS terminals
3. **Multi-Store Cloud** - Cloud server + terminals at multiple stores

---

## 📦 Scenario 1: SINGLE STORE (All-in-One)

**Use Case:** Small store with 1-2 POS terminals, everything on one computer

### Architecture:
```
┌─────────────────────────────┐
│   Store Computer            │
│  ┌─────────────────────┐   │
│  │ PostgreSQL Database │   │
│  │ Redis Cache         │   │
│  │ Backend API         │   │
│  │ Frontend (POS)      │   │
│  └─────────────────────┘   │
└─────────────────────────────┘
```

### Setup:
```powershell
# Run this ONE command on the store computer:
.\start-system.ps1 -Environment store -SetupEnv
```

### What It Does:
- ✅ Installs PostgreSQL locally
- ✅ Installs Redis locally
- ✅ Starts backend API on port 3000
- ✅ Starts frontend on port 5173
- ✅ Creates database and seeds with demo data
- ✅ Enables offline mode

### Access:
- Open browser: `http://localhost:5173`
- Login: `cashier / password123`

---

## 📦 Scenario 2: MULTI-TERMINAL STORE

**Use Case:** Store with multiple POS terminals (3-10 cashiers)

### Architecture:
```
┌─────────────────────────────┐
│   Store Server              │
│  ┌─────────────────────┐   │
│  │ PostgreSQL Database │   │
│  │ Redis Cache         │   │
│  │ Backend API         │   │
│  └─────────────────────┘   │
└──────────────┬──────────────┘
               │ Network
    ┌──────────┼──────────┬──────────┐
    │          │          │          │
┌───▼───┐  ┌──▼───┐  ┌──▼───┐  ┌──▼───┐
│ POS 1 │  │ POS 2│  │ POS 3│  │ POS 4│
│Frontend│  │Frontend│ │Frontend│ │Frontend│
└───────┘  └──────┘  └──────┘  └──────┘
```

### Setup:

#### Step 1: Setup Store Server (One-time)
```powershell
# On the MAIN SERVER computer:
.\start-store-server.ps1 -StoreName "My Liquor Store"
```

**Output:**
```
Store Server Ready!
Server IP: 192.168.1.100
Store ID: 550e8400-e29b-41d4-a716-446655440000

Next: Setup POS terminals using this Server IP
```

#### Step 2: Setup Each POS Terminal
```powershell
# On POS Terminal 1:
.\start-pos-terminal.ps1 -ServerIP 192.168.1.100 -StoreId 550e8400-e29b-41d4-a716-446655440000 -TerminalId terminal-01

# On POS Terminal 2:
.\start-pos-terminal.ps1 -ServerIP 192.168.1.100 -StoreId 550e8400-e29b-41d4-a716-446655440000 -TerminalId terminal-02

# On POS Terminal 3:
.\start-pos-terminal.ps1 -ServerIP 192.168.1.100 -StoreId 550e8400-e29b-41d4-a716-446655440000 -TerminalId terminal-03
```

### What It Does:
- ✅ Server runs database and backend API
- ✅ Each terminal connects to server
- ✅ All terminals share same database
- ✅ Real-time inventory sync
- ✅ Offline mode on terminals (local cache)

### Network Requirements:
- All computers on same network (LAN)
- Server IP must be accessible from terminals
- Firewall must allow port 3000

---

## 📦 Scenario 3: MULTI-STORE CLOUD

**Use Case:** Multiple stores (franchises, chains) with central management

### Architecture:
```
┌─────────────────────────────────┐
│   Cloud Server (AWS/Azure)      │
│  ┌─────────────────────────┐   │
│  │ PostgreSQL RDS          │   │
│  │ Redis ElastiCache       │   │
│  │ Backend API (Container) │   │
│  └─────────────────────────┘   │
└──────────────┬──────────────────┘
               │ Internet
    ┌──────────┼──────────┬──────────┐
    │          │          │          │
┌───▼────┐ ┌──▼────┐ ┌──▼────┐ ┌──▼────┐
│Store 1 │ │Store 2│ │Store 3│ │Store 4│
│3 POS   │ │2 POS  │ │4 POS  │ │2 POS  │
└────────┘ └───────┘ └───────┘ └───────┘
```

### Setup:

#### Step 1: Generate Cloud Configuration
```powershell
.\setup-cloud-deployment.ps1 `
  -CloudProvider AWS `
  -DatabaseHost your-db.rds.amazonaws.com `
  -RedisHost your-redis.cache.amazonaws.com `
  -ApiDomain api.yourliquorstore.com `
  -FrontendDomain pos.yourliquorstore.com
```

**Output:**
```
Cloud configuration created!
Files:
  - backend/.env.cloud
  - docker-compose.cloud.yml
  - CLOUD_DEPLOYMENT_INSTRUCTIONS.txt

Next: Deploy to AWS/Azure/GCP
```

#### Step 2: Deploy to Cloud
```bash
# On cloud server (AWS EC2, Azure VM, etc.)
docker-compose -f docker-compose.cloud.yml up -d
```

#### Step 3: Setup Store Terminals
```powershell
# At Store 1, Terminal 1:
.\start-pos-terminal.ps1 `
  -ServerIP api.yourliquorstore.com `
  -StoreId [STORE-1-UUID] `
  -TerminalId store1-terminal-01

# At Store 1, Terminal 2:
.\start-pos-terminal.ps1 `
  -ServerIP api.yourliquorstore.com `
  -StoreId [STORE-1-UUID] `
  -TerminalId store1-terminal-02

# At Store 2, Terminal 1:
.\start-pos-terminal.ps1 `
  -ServerIP api.yourliquorstore.com `
  -StoreId [STORE-2-UUID] `
  -TerminalId store2-terminal-01
```

### What It Does:
- ✅ Central database for all stores
- ✅ Real-time reporting across all locations
- ✅ Centralized inventory management
- ✅ Multi-store analytics
- ✅ Cloud backups
- ✅ Scalable to unlimited stores

### Cloud Providers:

#### AWS:
- RDS (PostgreSQL)
- ElastiCache (Redis)
- ECS/Fargate (Backend)
- S3 + CloudFront (Frontend)

#### Azure:
- Azure Database for PostgreSQL
- Azure Cache for Redis
- Azure Container Instances
- Azure CDN

#### Google Cloud:
- Cloud SQL
- Memorystore
- Cloud Run
- Cloud CDN

---

## 🔄 Comparison Table

| Feature | Single Store | Multi-Terminal | Multi-Store Cloud |
|---------|--------------|----------------|-------------------|
| **Setup Complexity** | ⭐ Easy | ⭐⭐ Medium | ⭐⭐⭐ Advanced |
| **Cost** | $ Low | $$ Medium | $$$ High |
| **Scalability** | 1-2 terminals | 3-10 terminals | Unlimited |
| **Internet Required** | ❌ No | ❌ No (LAN only) | ✅ Yes |
| **Central Reporting** | ❌ No | ⚠️ Store-level | ✅ Yes (All stores) |
| **Backup** | Manual | Local | Automatic (Cloud) |
| **Disaster Recovery** | ❌ Limited | ⚠️ Local | ✅ Full |
| **Multi-Location** | ❌ No | ❌ No | ✅ Yes |
| **Offline Mode** | ✅ Yes | ✅ Yes | ⚠️ Limited |

---

## 🛠️ Quick Reference

### Single Store:
```powershell
.\start-system.ps1 -Environment store -SetupEnv
```

### Multi-Terminal Store:
```powershell
# Server:
.\start-store-server.ps1 -StoreName "My Store"

# Terminals:
.\start-pos-terminal.ps1 -ServerIP [IP] -StoreId [UUID] -TerminalId terminal-01
```

### Multi-Store Cloud:
```powershell
# Generate config:
.\setup-cloud-deployment.ps1 -CloudProvider AWS

# Deploy to cloud (on cloud server):
docker-compose -f docker-compose.cloud.yml up -d

# Terminals:
.\start-pos-terminal.ps1 -ServerIP api.domain.com -StoreId [UUID] -TerminalId [ID]
```

---

## 📞 Support

Need help choosing? Consider:

- **Single Store:** < 3 terminals, one location
- **Multi-Terminal:** 3-10 terminals, one location, local network
- **Multi-Store Cloud:** Multiple locations, central management, internet available

---

**Generated:** January 5, 2026

