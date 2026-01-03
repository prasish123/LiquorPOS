# Deployment Guide

## Production Deployment

### Prerequisites

- Node.js 18+ installed on production server
- PostgreSQL 14+ database
- Domain name with SSL certificate
- Stripe account (for card payments)
- 4-8 hours for initial deployment

---

## Quick Deploy Checklist

- [ ] Generate encryption key
- [ ] Generate JWT secret
- [ ] Backup both keys in 2+ secure locations
- [ ] Get Stripe live API key
- [ ] Configure production environment
- [ ] Setup PostgreSQL database
- [ ] Run migrations
- [ ] Test in staging environment
- [ ] Deploy to production
- [ ] Verify all features work
- [ ] Setup monitoring and backups

---

## Step-by-Step Deployment

### 1. Generate Secrets (30 minutes)

```bash
# Generate encryption key
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
# Save output as AUDIT_LOG_ENCRYPTION_KEY

# Generate JWT secret
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
# Save output as JWT_SECRET
```

**⚠️ CRITICAL:** Backup both keys in:
- Password manager (1Password, LastPass)
- Cloud secrets manager (AWS Secrets Manager, Azure Key Vault)
- Encrypted offline backup

---

### 2. Get Stripe API Key (15 minutes)

1. Sign up at https://stripe.com
2. Complete account verification
3. Get live API key from https://dashboard.stripe.com/apikeys
4. Key starts with `sk_live_`

**Note:** Test with `sk_test_` keys in staging first

---

### 3. Setup Production Database (30 minutes)

```bash
# Create database
createdb liquor_pos_production

# Or use cloud provider (recommended):
# - AWS RDS
# - Google Cloud SQL
# - Azure Database for PostgreSQL
# - DigitalOcean Managed Databases
```

**Security Settings:**
- Enable SSL/TLS
- Use strong password (16+ characters)
- Restrict network access (firewall rules)
- Enable automated backups
- Enable point-in-time recovery

---

### 4. Configure Environment (30 minutes)

Create production environment file:

```bash
# On production server
cd /var/www/liquor-pos/backend
nano .env.production
```

Add configuration:

```bash
# Environment
NODE_ENV=production
PORT=3000

# Security
AUDIT_LOG_ENCRYPTION_KEY=<your-generated-key>
JWT_SECRET=<your-generated-secret>
ALLOWED_ORIGINS=https://yourdomain.com

# Database
DATABASE_URL=postgresql://user:pass@host:5432/liquor_pos_production?sslmode=require

# Payment
STRIPE_SECRET_KEY=sk_live_<your-key>

# Performance (recommended)
REDIS_URL=redis://prod-redis:6379

# Monitoring (recommended)
SENTRY_DSN=https://your-sentry-dsn
LOG_LEVEL=warn
```

Secure the file:
```bash
chmod 600 .env.production
chown www-data:www-data .env.production
```

---

### 5. Deploy Application (1 hour)

#### Option A: Direct Deployment

```bash
# Clone repository
cd /var/www
git clone <repository-url> liquor-pos
cd liquor-pos/backend

# Install dependencies
npm ci --production

# Run migrations
npm run migrate:deploy

# Generate Prisma client
npx prisma generate

# Seed database (optional)
npm run seed

# Build application
npm run build

# Start server
NODE_ENV=production npm run start:prod
```

#### Option B: PM2 (Recommended)

```bash
# Install PM2 globally
npm install -g pm2

# Start application
pm2 start npm --name liquor-pos -- run start:prod

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
```

#### Option C: Docker

```bash
# Build image
docker build -t liquor-pos:latest .

# Run container
docker run -d \
  --name liquor-pos \
  --env-file .env.production \
  -p 3000:3000 \
  --restart unless-stopped \
  liquor-pos:latest
```

---

### 6. Setup Reverse Proxy (30 minutes)

#### Nginx Configuration

```nginx
# /etc/nginx/sites-available/liquor-pos
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # Backend API
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Frontend (if serving from same domain)
    location / {
        root /var/www/liquor-pos/frontend/dist;
        try_files $uri $uri/ /index.html;
    }
}
```

Enable site:
```bash
ln -s /etc/nginx/sites-available/liquor-pos /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
```

---

### 7. Setup SSL Certificate (15 minutes)

Using Let's Encrypt (free):

```bash
# Install certbot
apt-get install certbot python3-certbot-nginx

# Get certificate
certbot --nginx -d yourdomain.com

# Auto-renewal is configured automatically
# Test renewal:
certbot renew --dry-run
```

---

### 8. Verify Deployment (30 minutes)

#### Health Check

```bash
curl https://yourdomain.com/health
```

Expected response:
```json
{
  "status": "ok",
  "info": {
    "database": { "status": "up" },
    "redis": { "status": "up" }
  }
}
```

#### Test Authentication

```bash
curl -X POST https://yourdomain.com/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password123"}'
```

#### Test Payment (Staging Only)

Use Stripe test card: 4242 4242 4242 4242

#### Verify Features

- [ ] Login works
- [ ] Product search works
- [ ] Can add items to cart
- [ ] Cash payment works
- [ ] Card payment works
- [ ] Age verification works
- [ ] Inventory updates correctly
- [ ] Audit logs are created
- [ ] Reports generate correctly

---

## Post-Deployment

### Setup Monitoring

#### Application Monitoring (Sentry)

1. Create account at https://sentry.io
2. Create new project
3. Add DSN to `.env.production`:
   ```bash
   SENTRY_DSN=https://your-dsn
   ```
4. Restart application

#### Server Monitoring

```bash
# Install monitoring tools
apt-get install htop iotop nethogs

# Setup log monitoring
tail -f /var/log/nginx/access.log
pm2 logs liquor-pos
```

---

### Setup Automated Backups

#### Database Backups

```bash
# Create backup script
cat > /usr/local/bin/backup-db.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/var/backups/liquor-pos"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

pg_dump $DATABASE_URL | gzip > $BACKUP_DIR/backup_$TIMESTAMP.sql.gz

# Keep only last 30 days
find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +30 -delete
EOF

chmod +x /usr/local/bin/backup-db.sh

# Add to crontab (daily at 2 AM)
crontab -e
# Add line:
0 2 * * * /usr/local/bin/backup-db.sh
```

#### Application Backups

```bash
# Backup encryption keys
cp backend/.env.production /secure/backup/location/

# Backup uploaded files (if any)
rsync -av /var/www/liquor-pos/backend/uploads/ /backup/uploads/
```

---

### Setup Alerts

#### Uptime Monitoring

Use services like:
- UptimeRobot (free)
- Pingdom
- StatusCake

Configure to check `https://yourdomain.com/health` every 5 minutes

#### Error Alerts

Sentry automatically sends email alerts for errors. Configure:
1. Go to Sentry project settings
2. Configure alert rules
3. Add notification channels (email, Slack, PagerDuty)

---

## Scaling

### Horizontal Scaling

```bash
# Run multiple instances behind load balancer
pm2 start npm --name liquor-pos-1 -i 4 -- run start:prod

# Or use Docker Swarm/Kubernetes
```

### Database Scaling

1. **Read Replicas:** For read-heavy workloads
2. **Connection Pooling:** Already configured (PgBouncer recommended)
3. **Caching:** Enable Redis for better performance

### CDN Setup

For static assets:
- Cloudflare
- AWS CloudFront
- Fastly

---

## Maintenance

### Update Application

```bash
# Backup first
npm run backup:create

# Pull latest code
git pull origin main

# Install dependencies
npm ci --production

# Run migrations
npm run migrate:deploy

# Rebuild
npm run build

# Restart
pm2 restart liquor-pos
```

### Database Maintenance

```bash
# Vacuum database (monthly)
psql $DATABASE_URL -c "VACUUM ANALYZE;"

# Check database size
psql $DATABASE_URL -c "SELECT pg_size_pretty(pg_database_size('liquor_pos_production'));"

# Check table sizes
psql $DATABASE_URL -c "SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) FROM pg_tables ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC LIMIT 10;"
```

### Log Rotation

```bash
# Configure logrotate
cat > /etc/logrotate.d/liquor-pos << 'EOF'
/var/log/liquor-pos/*.log {
    daily
    rotate 30
    compress
    delaycompress
    notifempty
    create 0640 www-data www-data
    sharedscripts
    postrotate
        pm2 reloadLogs
    endscript
}
EOF
```

---

## Rollback Procedure

If deployment fails:

```bash
# Stop current version
pm2 stop liquor-pos

# Checkout previous version
git checkout <previous-commit>

# Reinstall dependencies
npm ci --production

# Rollback migrations (if needed)
npm run migrate:rollback

# Rebuild
npm run build

# Restart
pm2 restart liquor-pos
```

---

## Security Checklist

- [ ] All secrets in environment variables (not committed)
- [ ] SSL/TLS enabled
- [ ] Database uses SSL
- [ ] Strong passwords (16+ characters)
- [ ] Firewall configured (only necessary ports open)
- [ ] Regular security updates
- [ ] Automated backups enabled
- [ ] Monitoring and alerts configured
- [ ] CORS properly configured (no wildcards)
- [ ] Rate limiting enabled
- [ ] Audit logging enabled

---

## Troubleshooting

### Application Won't Start

```bash
# Check logs
pm2 logs liquor-pos

# Check environment variables
pm2 env 0

# Verify database connection
psql $DATABASE_URL -c "SELECT 1"
```

### High Memory Usage

```bash
# Check memory usage
pm2 monit

# Restart application
pm2 restart liquor-pos

# If persistent, increase server memory or optimize queries
```

### Slow Performance

1. **Enable Redis caching**
2. **Check database indexes:** `npm run db:analyze`
3. **Enable CDN for static assets**
4. **Scale horizontally** (multiple instances)

### Payment Failures

1. **Check Stripe dashboard:** https://dashboard.stripe.com/payments
2. **Verify API key is live key:** `sk_live_`
3. **Check Stripe webhook logs**
4. **Verify SSL certificate is valid**

---

## Support Resources

- **Health Endpoint:** `https://yourdomain.com/health`
- **API Documentation:** `https://yourdomain.com/api/docs`
- **Monitoring Dashboard:** Sentry project page
- **Stripe Dashboard:** https://dashboard.stripe.com
- **Server Logs:** `pm2 logs liquor-pos`

---

## Next Steps

- **Configuration:** See [Configuration Guide](configuration.md)
- **Architecture:** See [Architecture Overview](architecture.md)
- **Known Limitations:** See [Known Limitations](known-limitations.md)

