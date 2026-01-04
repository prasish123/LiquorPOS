# Observability Implementation Checklist

**Priority:** CRITICAL - Production Blocker  
**Estimated Total Time:** 14 hours (Priority 1)  
**Target Completion:** Before production launch

---

## Priority 1: Pre-Launch (MUST HAVE) ✅

### Task 1: Enable Sentry Error Tracking (2 hours)

**Status:** 🔴 Not Started

#### Backend Setup

- [ ] Sign up for Sentry account (https://sentry.io)
  - [ ] Create organization: "Liquor POS"
  - [ ] Create project: "liquor-pos-backend"
  - [ ] Copy DSN

- [ ] Configure backend environment
  ```bash
  # backend/.env
  SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
  SENTRY_ENVIRONMENT=production
  SENTRY_TRACES_SAMPLE_RATE=1.0
  SENTRY_PROFILES_SAMPLE_RATE=1.0
  SENTRY_RELEASE=1.0.0
  ```

- [ ] Verify Sentry initialization
  - [ ] Check `backend/src/monitoring/sentry.service.ts`
  - [ ] Confirm initialization logs appear
  - [ ] Test with sample error

#### Frontend Setup

- [ ] Create Sentry project: "liquor-pos-frontend"
- [ ] Copy frontend DSN

- [ ] Install Sentry SDK
  ```bash
  cd frontend
  npm install @sentry/react @sentry/tracing
  ```

- [ ] Initialize Sentry in frontend
  ```typescript
  // frontend/src/main.tsx
  import * as Sentry from '@sentry/react';
  
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.VITE_SENTRY_ENVIRONMENT,
    release: import.meta.env.VITE_APP_VERSION,
    integrations: [
      new Sentry.BrowserTracing(),
      new Sentry.Replay(),
    ],
    tracesSampleRate: 1.0,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
  });
  ```

- [ ] Update LoggerService to use Sentry
  ```typescript
  // frontend/src/infrastructure/services/LoggerService.ts
  error(message: string, error?: Error, context?: LogContext) {
    console.error(`[ERROR] ${message}`, error, context);
    
    // Send to Sentry
    Sentry.captureException(error || new Error(message), {
      extra: context,
    });
  }
  ```

- [ ] Configure source maps for production
  ```typescript
  // frontend/vite.config.ts
  export default defineConfig({
    build: {
      sourcemap: true,
    },
  });
  ```

- [ ] Configure frontend environment
  ```bash
  # frontend/.env.production
  VITE_SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
  VITE_SENTRY_ENVIRONMENT=production
  VITE_APP_VERSION=1.0.0
  ```

#### Testing

- [ ] Trigger test error in backend
  ```bash
  curl -X POST http://localhost:3000/api/test/error
  ```

- [ ] Verify error appears in Sentry dashboard
- [ ] Trigger test error in frontend
- [ ] Verify frontend error appears in Sentry
- [ ] Verify stack traces are readable (source maps working)

---

### Task 2: Add Rich Error Context (4 hours)

**Status:** 🔴 Not Started

#### Create Error Context Types

- [ ] Create error context interface
  ```typescript
  // backend/src/common/types/error-context.ts
  export interface ErrorContext {
    // Store/Terminal Info
    storeId?: string;
    storeName?: string;
    terminalId?: string;
    
    // Transaction Info
    transactionId?: string;
    orderId?: string;
    amount?: number;
    paymentMethod?: string;
    
    // User Info
    userId?: string;
    userRole?: string;
    userName?: string;
    
    // System Info
    serverVersion: string;
    clientVersion?: string;
    platform?: string;
    networkStatus?: 'online' | 'offline';
    
    // Request Info
    correlationId?: string;
    timestamp: number;
    attemptNumber?: number;
    lastError?: string;
    
    // Additional context
    [key: string]: any;
  }
  ```

#### Update Logger Service

- [ ] Update backend logger
  ```typescript
  // backend/src/common/logger.service.ts
  error(message: string, error?: Error, context?: ErrorContext) {
    const enrichedContext = {
      ...context,
      serverVersion: process.env.npm_package_version,
      environment: process.env.NODE_ENV,
      timestamp: Date.now(),
    };
    
    console.error(`[ERROR] ${message}`, error, enrichedContext);
    
    // Send to Sentry with context
    if (this.sentryService.isInitialized()) {
      this.sentryService.captureException(error || new Error(message), {
        extra: enrichedContext,
      });
    }
  }
  ```

- [ ] Update frontend logger similarly

#### Add Context to Critical Paths

- [ ] Order processing errors
  ```typescript
  // backend/src/orders/order-orchestrator.ts
  catch (error) {
    this.logger.error('Order processing failed', error, {
      storeId: dto.locationId,
      terminalId: dto.terminalId,
      orderId: context.order?.id,
      amount: context.pricing?.total,
      paymentMethod: dto.paymentMethod,
      userId: dto.employeeId,
      transactionId: context.transactionId,
      step: 'payment_authorization',
    });
    throw error;
  }
  ```

- [ ] Payment errors
  ```typescript
  // backend/src/orders/agents/payment.agent.ts
  catch (error) {
    this.logger.error('Payment authorization failed', error, {
      amount,
      paymentMethod: method,
      processorId: paymentIntent?.id,
      declineCode: error.decline_code,
      attemptNumber: context.attemptNumber,
    });
    throw error;
  }
  ```

- [ ] Inventory errors
  ```typescript
  // backend/src/orders/agents/inventory.agent.ts
  catch (error) {
    this.logger.error('Inventory reservation failed', error, {
      storeId: locationId,
      items: items.map(i => ({ sku: i.sku, quantity: i.quantity })),
      availableQuantity: inventory?.quantity,
      reservedQuantity: inventory?.reserved,
    });
    throw error;
  }
  ```

- [ ] Sync errors (frontend)
  ```typescript
  // frontend/src/infrastructure/services/SyncService.ts
  catch (error) {
    Logger.error('Order sync failed', error, {
      orderId: order.id,
      storeId: order.locationId,
      terminalId: order.terminalId,
      amount: order.total,
      attemptNumber: failureRecord?.attemptCount || 1,
      lastError: error.message,
      networkStatus: navigator.onLine ? 'online' : 'offline',
    });
  }
  ```

#### Add Correlation IDs

- [ ] Add correlation ID middleware
  ```typescript
  // backend/src/common/middleware/correlation-id.middleware.ts
  import { v4 as uuidv4 } from 'uuid';
  
  export function correlationIdMiddleware(req, res, next) {
    req.correlationId = req.headers['x-correlation-id'] || uuidv4();
    res.setHeader('x-correlation-id', req.correlationId);
    next();
  }
  ```

- [ ] Register middleware in main.ts
- [ ] Add correlation ID to all log statements
- [ ] Pass correlation ID in API responses

#### Testing

- [ ] Trigger error in order processing
- [ ] Verify error in Sentry includes all context fields
- [ ] Verify can filter by storeId in Sentry
- [ ] Verify can filter by terminalId in Sentry
- [ ] Verify correlation ID links frontend/backend errors

---

### Task 3: Set Up Log Aggregation (8 hours)

**Status:** 🔴 Not Started

#### Sign Up for Better Stack (Logtail)

- [ ] Go to https://betterstack.com/logs
- [ ] Sign up for account
- [ ] Create source: "liquor-pos-backend"
- [ ] Copy source token
- [ ] Create source: "liquor-pos-frontend"
- [ ] Copy frontend source token

#### Backend Integration

- [ ] Install Logtail SDK
  ```bash
  cd backend
  npm install @logtail/node
  ```

- [ ] Create Logtail service
  ```typescript
  // backend/src/logging/logtail.service.ts
  import { Logtail } from '@logtail/node';
  import { Injectable, OnModuleInit } from '@nestjs/common';
  import { ConfigService } from '@nestjs/config';
  
  @Injectable()
  export class LogtailService implements OnModuleInit {
    private logtail: Logtail;
    private enabled: boolean;
    
    constructor(private config: ConfigService) {
      const token = this.config.get('LOGTAIL_TOKEN');
      this.enabled = !!token;
      
      if (this.enabled) {
        this.logtail = new Logtail(token);
      }
    }
    
    async onModuleInit() {
      if (this.enabled) {
        console.log('✅ Logtail initialized');
      }
    }
    
    log(level: string, message: string, context?: any) {
      if (!this.enabled) return;
      
      const enrichedContext = {
        ...context,
        service: 'backend',
        version: process.env.npm_package_version,
        environment: process.env.NODE_ENV,
      };
      
      switch (level) {
        case 'error':
          this.logtail.error(message, enrichedContext);
          break;
        case 'warn':
          this.logtail.warn(message, enrichedContext);
          break;
        case 'info':
          this.logtail.info(message, enrichedContext);
          break;
        case 'debug':
          this.logtail.debug(message, enrichedContext);
          break;
      }
    }
    
    async flush() {
      if (this.enabled) {
        await this.logtail.flush();
      }
    }
  }
  ```

- [ ] Update logger service to use Logtail
  ```typescript
  // backend/src/common/logger.service.ts
  constructor(
    private logtailService: LogtailService,
  ) {}
  
  error(message: string, error?: Error, context?: ErrorContext) {
    // Console log
    console.error(`[ERROR] ${message}`, error, context);
    
    // Send to Logtail
    this.logtailService.log('error', message, {
      error: error?.stack,
      ...context,
    });
    
    // Send to Sentry
    this.sentryService.captureException(error, { extra: context });
  }
  ```

- [ ] Configure environment
  ```bash
  # backend/.env
  LOGTAIL_TOKEN=your_backend_token_here
  ```

#### Frontend Integration

- [ ] Install Logtail SDK
  ```bash
  cd frontend
  npm install @logtail/browser
  ```

- [ ] Create Logtail service
  ```typescript
  // frontend/src/infrastructure/services/LogtailService.ts
  import { Logtail } from '@logtail/browser';
  
  class LogtailService {
    private logtail: Logtail | null = null;
    private enabled: boolean = false;
    
    constructor() {
      const token = import.meta.env.VITE_LOGTAIL_TOKEN;
      this.enabled = !!token;
      
      if (this.enabled) {
        this.logtail = new Logtail(token);
      }
    }
    
    log(level: string, message: string, context?: any) {
      if (!this.enabled || !this.logtail) return;
      
      const enrichedContext = {
        ...context,
        service: 'frontend',
        version: import.meta.env.VITE_APP_VERSION,
        environment: import.meta.env.VITE_ENVIRONMENT,
        userAgent: navigator.userAgent,
      };
      
      switch (level) {
        case 'error':
          this.logtail.error(message, enrichedContext);
          break;
        case 'warn':
          this.logtail.warn(message, enrichedContext);
          break;
        case 'info':
          this.logtail.info(message, enrichedContext);
          break;
        case 'debug':
          this.logtail.debug(message, enrichedContext);
          break;
      }
    }
  }
  
  export const logtailService = new LogtailService();
  ```

- [ ] Update LoggerService to use Logtail
  ```typescript
  // frontend/src/infrastructure/services/LoggerService.ts
  import { logtailService } from './LogtailService';
  
  error(message: string, error?: Error, context?: LogContext) {
    console.error(`[ERROR] ${message}`, error, context);
    
    // Send to Logtail
    logtailService.log('error', message, {
      error: error?.stack,
      ...context,
    });
    
    // Send to Sentry
    Sentry.captureException(error, { extra: context });
  }
  ```

- [ ] Configure environment
  ```bash
  # frontend/.env.production
  VITE_LOGTAIL_TOKEN=your_frontend_token_here
  ```

#### Configure Log Retention

- [ ] In Better Stack dashboard:
  - [ ] Set retention: 30 days
  - [ ] Set up log archiving (optional)
  - [ ] Configure sampling if needed (100% for now)

#### Create Saved Searches

- [ ] Create saved search: "All Errors"
  ```
  level:error
  ```

- [ ] Create saved search: "Payment Errors"
  ```
  level:error AND (message:payment OR message:stripe)
  ```

- [ ] Create saved search: "Store 47 Errors"
  ```
  level:error AND store_id:STORE_047
  ```

- [ ] Create saved search: "Sync Failures"
  ```
  level:error AND message:sync
  ```

- [ ] Create saved search: "Inventory Errors"
  ```
  level:error AND message:inventory
  ```

#### Testing

- [ ] Generate logs from backend
  ```bash
  curl http://localhost:3000/api/products
  ```

- [ ] Verify logs appear in Logtail dashboard
- [ ] Generate error from backend
- [ ] Verify error appears with full context
- [ ] Generate logs from frontend
- [ ] Verify frontend logs appear in Logtail
- [ ] Test saved searches
- [ ] Test filtering by storeId, terminalId
- [ ] Test time-based filtering

---

## Priority 2: Launch Week (SHOULD HAVE) 🟡

### Task 4: Set Up Alerting (4 hours)

**Status:** 🔴 Not Started

#### Sentry Alerts

- [ ] Configure Sentry alert rules
  - [ ] Alert: "Critical Errors" (any error with severity=critical)
  - [ ] Alert: "Payment Failures" (any error with message containing "payment")
  - [ ] Alert: "High Error Rate" (>10 errors/minute)
  - [ ] Alert: "New Error Type" (first occurrence of new error)

- [ ] Configure Sentry integrations
  - [ ] Add Slack integration
  - [ ] Configure #pos-alerts channel
  - [ ] Test alert delivery

#### Better Stack Alerts

- [ ] Configure Better Stack alert rules
  - [ ] Alert: "Error Spike" (>20 errors in 5 minutes)
  - [ ] Alert: "Store Offline" (no logs from store in 10 minutes)
  - [ ] Alert: "Sync Failures" (>5 sync failures in 1 hour)

- [ ] Configure Better Stack integrations
  - [ ] Add Slack integration
  - [ ] Test alert delivery

#### Uptime Robot

- [ ] Sign up for Uptime Robot (https://uptimerobot.com)
- [ ] Create monitors:
  - [ ] Monitor: Backend API (https://api.yourdomain.com/health)
  - [ ] Monitor: Frontend (https://pos.yourdomain.com)
  - [ ] Monitor: Admin (https://admin.yourdomain.com)
  - [ ] Interval: 5 minutes
  - [ ] Alert contacts: Email + Slack

- [ ] Test monitors
  - [ ] Verify monitors are up
  - [ ] Simulate downtime
  - [ ] Verify alert received

#### Custom Alerting Service

- [ ] Create alerting service (optional, for custom alerts)
  ```typescript
  // backend/src/monitoring/alerting.service.ts
  // See full implementation in main document
  ```

- [ ] Test custom alerts

#### Testing

- [ ] Trigger critical error → Verify Slack alert
- [ ] Trigger payment error → Verify Slack alert
- [ ] Simulate error spike → Verify alert
- [ ] Stop backend → Verify Uptime Robot alert
- [ ] Test escalation policies

---

### Task 5: Implement Remote Diagnostics API (6 hours)

**Status:** 🔴 Not Started

#### Create Diagnostics Module

- [ ] Generate module
  ```bash
  cd backend
  nest g module diagnostics
  nest g controller diagnostics
  nest g service diagnostics
  ```

#### Implement Diagnostics Endpoints

- [ ] System info endpoint
  ```typescript
  // backend/src/diagnostics/diagnostics.controller.ts
  @Get(':storeId/system-info')
  async getSystemInfo(@Param('storeId') storeId: string) {
    // See full implementation in main document
  }
  ```

- [ ] Docker status endpoint
  ```typescript
  @Get(':storeId/docker-status')
  async getDockerStatus(@Param('storeId') storeId: string) {
    // See full implementation in main document
  }
  ```

- [ ] Restart service endpoint
  ```typescript
  @Post(':storeId/restart-service')
  async restartService(
    @Param('storeId') storeId: string,
    @Body() dto: { service: string }
  ) {
    // See full implementation in main document
  }
  ```

- [ ] View logs endpoint
  ```typescript
  @Get(':storeId/logs')
  async getLogs(
    @Param('storeId') storeId: string,
    @Query('service') service: string,
    @Query('lines') lines: number = 100
  ) {
    // See full implementation in main document
  }
  ```

#### Add Security

- [ ] Add authentication guard
  ```typescript
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'support')
  ```

- [ ] Add rate limiting
  ```typescript
  @UseGuards(ThrottlerGuard)
  @Throttle(10, 60) // 10 requests per minute
  ```

- [ ] Add audit logging
  ```typescript
  await this.auditService.log({
    action: 'diagnostics.restart_service',
    userId: req.user.id,
    storeId,
    service: dto.service,
  });
  ```

#### Create Admin UI

- [ ] Create diagnostics page in admin dashboard
  ```typescript
  // frontend/src/pages/admin/Diagnostics.tsx
  // Simple UI to call diagnostics endpoints
  ```

- [ ] Add to admin navigation

#### Testing

- [ ] Test system info endpoint
- [ ] Test Docker status endpoint
- [ ] Test restart service endpoint (in dev)
- [ ] Test logs endpoint
- [ ] Test authentication/authorization
- [ ] Test rate limiting
- [ ] Test audit logging

---

## Priority 3: Post-Launch (NICE TO HAVE) 🟢

### Task 6: Add Session Replay (8 hours)

**Status:** 🔴 Not Started

- [ ] Enable Sentry Session Replay
  ```typescript
  // frontend/src/main.tsx
  Sentry.init({
    integrations: [
      new Sentry.Replay({
        maskAllText: false,
        blockAllMedia: false,
      }),
    ],
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
  });
  ```

- [ ] Configure privacy settings
- [ ] Test session replay
- [ ] Train support team on using replays

---

### Task 7: Set Up Remote Access (12 hours)

**Status:** 🔴 Not Started

#### Tailscale VPN

- [ ] Sign up for Tailscale (https://tailscale.com)
- [ ] Create organization
- [ ] Generate auth key

- [ ] Install on each NUC
  ```bash
  curl -fsSL https://tailscale.com/install.sh | sh
  tailscale up --authkey=<key> --hostname=store-<id>-nuc
  ```

- [ ] Install on support team laptops
- [ ] Test SSH access
- [ ] Document access procedures

#### SSH Configuration

- [ ] Configure SSH on NUCs
  ```bash
  # /etc/ssh/sshd_config
  PasswordAuthentication no
  PubkeyAuthentication yes
  ```

- [ ] Add support team SSH keys
- [ ] Test SSH access via Tailscale

---

### Task 8: Enhance Performance Monitoring (4 hours)

**Status:** 🔴 Not Started

- [ ] Configure Sentry performance monitoring
- [ ] Add custom performance metrics
- [ ] Create performance dashboard
- [ ] Set up performance alerts

---

## Verification Checklist

### Before Launch

- [ ] Sentry receiving errors from backend
- [ ] Sentry receiving errors from frontend
- [ ] Errors include full context (storeId, terminalId, etc.)
- [ ] Logtail receiving logs from backend
- [ ] Logtail receiving logs from frontend
- [ ] Can search logs by storeId
- [ ] Can search logs by terminalId
- [ ] Can search logs by error type
- [ ] Slack alerts configured and tested
- [ ] Uptime Robot monitoring all endpoints
- [ ] Health check endpoints working
- [ ] Documentation updated

### After Launch (Week 1)

- [ ] Monitor error rates daily
- [ ] Review Sentry dashboard daily
- [ ] Review Logtail dashboard daily
- [ ] Test remote diagnostics on real stores
- [ ] Gather feedback from support team
- [ ] Optimize alert thresholds
- [ ] Create runbooks for common issues

---

## Success Metrics

### Week 1 Targets

- [ ] <10 support incidents requiring on-site visits
- [ ] >90% of incidents resolved remotely
- [ ] <30 minute average resolution time
- [ ] Zero critical errors undetected
- [ ] 100% of stores reporting to monitoring

### Month 1 Targets

- [ ] <5 support incidents requiring on-site visits
- [ ] >95% of incidents resolved remotely
- [ ] <15 minute average resolution time
- [ ] Proactive detection of 80% of issues
- [ ] Support team satisfaction >8/10

---

## Resources

### Documentation

- Sentry Docs: https://docs.sentry.io
- Better Stack Docs: https://betterstack.com/docs
- Uptime Robot Docs: https://uptimerobot.com/docs
- Tailscale Docs: https://tailscale.com/kb

### Support Contacts

- Sentry Support: support@sentry.io
- Better Stack Support: support@betterstack.com
- Internal: #pos-support Slack channel

---

**Last Updated:** January 3, 2026  
**Next Review:** After Priority 1 completion  
**Owner:** Development Team

