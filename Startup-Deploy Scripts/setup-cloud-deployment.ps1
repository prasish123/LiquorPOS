# ============================================
# CLOUD DEPLOYMENT SETUP
# ============================================
# Use this to prepare configuration for cloud deployment
# (AWS, Azure, Google Cloud, etc.)
# This generates .env files for cloud environment
# ============================================

param(
    [Parameter(Mandatory=$true)]
    [string]$CloudProvider,
    
    [Parameter(Mandatory=$false)]
    [string]$DatabaseHost = "",
    
    [Parameter(Mandatory=$false)]
    [string]$RedisHost = "",
    
    [Parameter(Mandatory=$false)]
    [string]$ApiDomain = "",
    
    [Parameter(Mandatory=$false)]
    [string]$FrontendDomain = ""
)

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  CLOUD DEPLOYMENT SETUP" -ForegroundColor Cyan
Write-Host "  Provider: $CloudProvider" -ForegroundColor Yellow
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Generate secrets
function Generate-Secret {
    param([int]$Length = 64)
    $bytes = New-Object byte[] $Length
    [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
    return [Convert]::ToBase64String($bytes)
}

$jwtSecret = Generate-Secret -Length 64
$auditKey = Generate-Secret -Length 32
$redisPassword = Generate-Secret -Length 32
$dbPassword = Generate-Secret -Length 32

Write-Host "Step 1: Generating secure secrets..." -ForegroundColor Yellow
Write-Host "✓ JWT Secret generated" -ForegroundColor Green
Write-Host "✓ Audit Key generated" -ForegroundColor Green
Write-Host "✓ Redis Password generated" -ForegroundColor Green
Write-Host "✓ Database Password generated" -ForegroundColor Green

Write-Host ""
Write-Host "Step 2: Creating cloud configuration..." -ForegroundColor Yellow

# Create backend .env for cloud
$backendEnv = @"
# ============================================
# CLOUD BACKEND CONFIGURATION
# Provider: $CloudProvider
# Generated: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
# ============================================

NODE_ENV=production
PORT=3000

# Database (Cloud RDS/Managed PostgreSQL)
# Replace with your actual database credentials
DATABASE_URL=postgresql://postgres:${dbPassword}@${DatabaseHost}:5432/liquor_pos
DATABASE_POOL_MIN=10
DATABASE_POOL_MAX=50

# Redis (Cloud ElastiCache/Managed Redis)
# Replace with your actual Redis credentials
REDIS_HOST=${RedisHost}
REDIS_PORT=6379
REDIS_PASSWORD=$redisPassword
REDIS_URL=redis://:${redisPassword}@${RedisHost}:6379

# Security
JWT_SECRET=$jwtSecret
AUDIT_LOG_ENCRYPTION_KEY=$auditKey

# CORS - Allow all store terminals
ALLOWED_ORIGINS=https://${FrontendDomain},https://*.${FrontendDomain}

# Features
LOG_LEVEL=warn
ENABLE_OFFLINE_MODE=false
ENABLE_AI_FEATURES=true

# Cloud-specific
CLOUD_PROVIDER=$CloudProvider
ENABLE_CLOUD_BACKUP=true
ENABLE_MONITORING=true

# Email/Notifications (configure as needed)
# SMTP_HOST=smtp.sendgrid.net
# SMTP_PORT=587
# SMTP_USER=apikey
# SMTP_PASSWORD=your-sendgrid-api-key

# Payment Gateway (configure as needed)
# STRIPE_SECRET_KEY=sk_live_...
# STRIPE_WEBHOOK_SECRET=whsec_...
"@

Set-Content -Path "backend/.env.cloud" -Value $backendEnv -Encoding UTF8
Write-Host "✓ Backend cloud configuration created: backend/.env.cloud" -ForegroundColor Green

# Create Docker Compose for cloud
$dockerComposeCloud = @"
version: '3.8'

services:
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=\${DATABASE_URL}
      - REDIS_URL=\${REDIS_URL}
      - JWT_SECRET=\${JWT_SECRET}
      - AUDIT_LOG_ENCRYPTION_KEY=\${AUDIT_LOG_ENCRYPTION_KEY}
    restart: always
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "80:80"
    environment:
      - VITE_API_URL=https://${ApiDomain}
    restart: always
    depends_on:
      - backend
"@

Set-Content -Path "docker-compose.cloud.yml" -Value $dockerComposeCloud -Encoding UTF8
Write-Host "✓ Docker Compose for cloud created: docker-compose.cloud.yml" -ForegroundColor Green

# Create deployment instructions
$deploymentInstructions = @"
# ============================================
# CLOUD DEPLOYMENT INSTRUCTIONS
# Provider: $CloudProvider
# ============================================

## SECRETS (KEEP SECURE!)
JWT_SECRET=$jwtSecret
AUDIT_LOG_ENCRYPTION_KEY=$auditKey
REDIS_PASSWORD=$redisPassword
DATABASE_PASSWORD=$dbPassword

## ENVIRONMENT VARIABLES TO SET IN CLOUD:

### Database
DATABASE_URL=postgresql://postgres:${dbPassword}@${DatabaseHost}:5432/liquor_pos

### Redis
REDIS_URL=redis://:${redisPassword}@${RedisHost}:6379

### Security
JWT_SECRET=$jwtSecret
AUDIT_LOG_ENCRYPTION_KEY=$auditKey

### Domains
API_DOMAIN=$ApiDomain
FRONTEND_DOMAIN=$FrontendDomain

## DEPLOYMENT STEPS:

### 1. Setup Database (PostgreSQL)
- Create managed PostgreSQL instance
- Note the connection string
- Run migrations: npx prisma migrate deploy

### 2. Setup Redis
- Create managed Redis instance
- Note the connection string
- Set password: $redisPassword

### 3. Setup Backend API
- Deploy backend container
- Set environment variables above
- Expose port 3000
- Setup SSL/HTTPS certificate
- Point domain $ApiDomain to backend

### 4. Setup Frontend
- Build frontend: npm run build
- Deploy to CDN or static hosting
- Point domain $FrontendDomain to frontend

### 5. Configure Store Terminals
On each store's POS terminals, create frontend/.env:

VITE_API_URL=https://${ApiDomain}
VITE_LOCATION_ID=[UNIQUE-STORE-UUID]
VITE_TERMINAL_ID=[UNIQUE-TERMINAL-ID]
VITE_ENABLE_OFFLINE_MODE=true

## PROVIDER-SPECIFIC INSTRUCTIONS:

### AWS:
- RDS for PostgreSQL
- ElastiCache for Redis
- ECS/Fargate for containers
- CloudFront for frontend
- Route53 for DNS
- Certificate Manager for SSL

### Azure:
- Azure Database for PostgreSQL
- Azure Cache for Redis
- Azure Container Instances
- Azure CDN for frontend
- Azure DNS
- App Service Certificate

### Google Cloud:
- Cloud SQL for PostgreSQL
- Memorystore for Redis
- Cloud Run for containers
- Cloud CDN for frontend
- Cloud DNS
- Managed SSL certificates

## MONITORING:
- Setup CloudWatch/Azure Monitor/Stackdriver
- Configure alerts for errors
- Monitor database connections
- Track API response times

## BACKUP:
- Enable automated database backups
- Configure Redis persistence
- Setup disaster recovery plan

## SECURITY:
- Enable firewall rules
- Use VPC/private networks
- Enable DDoS protection
- Setup WAF rules
- Regular security audits

## SCALING:
- Configure auto-scaling for backend
- Use read replicas for database
- Enable Redis clustering if needed
- Setup load balancer

## NEXT STEPS:
1. Review and customize backend/.env.cloud
2. Setup cloud resources (database, Redis, etc.)
3. Deploy using docker-compose.cloud.yml or cloud-native tools
4. Test thoroughly before going live
5. Configure monitoring and alerts
6. Setup backup and disaster recovery
7. Train staff on new system

Generated: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
"@

Set-Content -Path "CLOUD_DEPLOYMENT_INSTRUCTIONS.txt" -Value $deploymentInstructions -Encoding UTF8
Write-Host "✓ Deployment instructions created: CLOUD_DEPLOYMENT_INSTRUCTIONS.txt" -ForegroundColor Green

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  ✓ CLOUD CONFIGURATION READY!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Files Created:" -ForegroundColor Yellow
Write-Host "  1. backend/.env.cloud - Backend configuration" -ForegroundColor White
Write-Host "  2. docker-compose.cloud.yml - Docker setup" -ForegroundColor White
Write-Host "  3. CLOUD_DEPLOYMENT_INSTRUCTIONS.txt - Full guide" -ForegroundColor White
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "  1. Review CLOUD_DEPLOYMENT_INSTRUCTIONS.txt" -ForegroundColor White
Write-Host "  2. Setup cloud resources (database, Redis)" -ForegroundColor White
Write-Host "  3. Update backend/.env.cloud with actual values" -ForegroundColor White
Write-Host "  4. Deploy using your cloud provider's tools" -ForegroundColor White
Write-Host ""
Write-Host "IMPORTANT: Keep secrets secure!" -ForegroundColor Red
Write-Host ""

