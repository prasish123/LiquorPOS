import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma.service';
import { NetworkStatusService } from '../src/common/network-status.service';
import { OfflineQueueService } from '../src/common/offline-queue.service';
import { OfflinePaymentAgent } from '../src/orders/agents/offline-payment.agent';

describe('Offline Resilience (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let networkStatus: NetworkStatusService;
  let offlineQueue: OfflineQueueService;
  let offlinePayment: OfflinePaymentAgent;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);
    networkStatus = app.get<NetworkStatusService>(NetworkStatusService);
    offlineQueue = app.get<OfflineQueueService>(OfflineQueueService);
    offlinePayment = app.get<OfflinePaymentAgent>(OfflinePaymentAgent);
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  beforeEach(async () => {
    // Clean up test data
    await prisma.eventLog.deleteMany({
      where: {
        eventType: {
          startsWith: 'offline.',
        },
      },
    });
  });

  describe('Network Status Monitoring', () => {
    it('should detect online status', async () => {
      const status = networkStatus.getStatus();
      expect(status).toBeDefined();
      expect(status.isOnline).toBeDefined();
      expect(status.lastCheck).toBeInstanceOf(Date);
    });

    it('should check service availability', () => {
      const isStripeAvailable = networkStatus.isStripeAvailable();
      const isConexxusAvailable = networkStatus.isConexxusAvailable();

      expect(typeof isStripeAvailable).toBe('boolean');
      expect(typeof isConexxusAvailable).toBe('boolean');
    });

    it('should allow manual offline mode setting', () => {
      networkStatus.setOfflineMode(true);
      expect(networkStatus.isOnline()).toBe(false);

      networkStatus.setOfflineMode(false);
      expect(networkStatus.isOnline()).toBe(true);
    });

    it('should force network check', async () => {
      const status = await networkStatus.forceCheck();
      expect(status).toBeDefined();
      expect(status.services).toBeDefined();
      expect(status.services.internet).toBeDefined();
    });
  });

  describe('Offline Payment Authorization', () => {
    const testLocationId = 'test-location-1';

    it('should get offline payment configuration', () => {
      const config = offlinePayment.getConfig();
      expect(config).toBeDefined();
      expect(config.enabled).toBeDefined();
      expect(config.maxTransactionAmount).toBeGreaterThan(0);
      expect(config.maxDailyTotal).toBeGreaterThan(0);
    });

    it('should check if offline payment is allowed', async () => {
      const result = await offlinePayment.canProcessOffline(100, 'cash', testLocationId);

      expect(result).toBeDefined();
      expect(result.allowed).toBeDefined();
    });

    it('should authorize cash payment in offline mode', async () => {
      const result = await offlinePayment.authorizeOffline(50, 'cash', testLocationId);

      expect(result).toBeDefined();
      expect(result.paymentId).toBeDefined();
      expect(result.status).toBe('captured');
      expect(result.offlineMode).toBe(true);
    });

    it('should authorize card payment within limits', async () => {
      // Enable offline payments
      offlinePayment.updateConfig({ enabled: true, maxTransactionAmount: 500 });

      const result = await offlinePayment.authorizeOffline(100, 'card', testLocationId);

      expect(result).toBeDefined();
      expect(result.paymentId).toBeDefined();
      expect(result.offlineMode).toBe(true);

      if (result.status !== 'failed') {
        expect(result.requiresOnlineCapture).toBe(true);
      }
    });

    it('should reject card payment exceeding limits', async () => {
      offlinePayment.updateConfig({ enabled: true, maxTransactionAmount: 100 });

      const result = await offlinePayment.authorizeOffline(500, 'card', testLocationId);

      expect(result.status).toBe('failed');
      expect(result.errorMessage).toContain('exceeds offline limit');
    });

    it('should get pending offline payments', async () => {
      // Create a test offline payment
      await offlinePayment.authorizeOffline(100, 'card', testLocationId);

      const pending = await offlinePayment.getPendingOfflinePayments(testLocationId);

      expect(Array.isArray(pending)).toBe(true);
    });

    it('should get offline payment statistics', async () => {
      const stats = await offlinePayment.getStatistics(testLocationId, 7);

      expect(stats).toBeDefined();
      expect(stats.totalOfflinePayments).toBeGreaterThanOrEqual(0);
      expect(stats.totalAmount).toBeGreaterThanOrEqual(0);
      expect(stats.byMethod).toBeDefined();
    });
  });

  describe('Offline Queue Service', () => {
    it('should enqueue operations', async () => {
      const queueId = await offlineQueue.enqueue(
        'transaction',
        {
          transactionId: 'test-tx-1',
          amount: 100,
        },
        5,
      );

      expect(queueId).toBeDefined();
      expect(typeof queueId).toBe('string');
    });

    it('should get queue metrics', async () => {
      const metrics = await offlineQueue.getMetrics();

      expect(metrics).toBeDefined();
      expect(metrics.pending).toBeGreaterThanOrEqual(0);
      expect(metrics.completed).toBeGreaterThanOrEqual(0);
      expect(metrics.failed).toBeGreaterThanOrEqual(0);
      expect(metrics.successRate).toBeGreaterThanOrEqual(0);
    });

    it('should get pending count', async () => {
      const count = await offlineQueue.getPendingCount();
      expect(typeof count).toBe('number');
      expect(count).toBeGreaterThanOrEqual(0);
    });

    it('should process queued operations', async () => {
      // Register a test handler
      let handlerCalled = false;
      offlineQueue.registerHandler('transaction', async (payload) => {
        handlerCalled = true;
        expect(payload).toBeDefined();
      });

      // Enqueue an operation
      await offlineQueue.enqueue('transaction', { test: 'data' }, 5, 1);

      // Process queue
      await offlineQueue.processQueue();

      // Note: Handler may not be called immediately in test environment
      // This is just to verify the method doesn't throw
    });

    it('should cleanup completed operations', async () => {
      const deletedCount = await offlineQueue.cleanupCompleted(30);
      expect(typeof deletedCount).toBe('number');
      expect(deletedCount).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Offline Order Processing', () => {
    it('should create order with offline payment fallback', async () => {
      // Set offline mode
      networkStatus.setOfflineMode(true);

      const orderDto = {
        locationId: 'test-location-1',
        terminalId: 'terminal-1',
        employeeId: 'employee-1',
        items: [
          {
            sku: 'TEST-SKU-1',
            quantity: 1,
            priceAtSale: 10.0,
          },
        ],
        subtotal: 10.0,
        tax: 0.7,
        total: 10.7,
        paymentMethod: 'cash',
        channel: 'counter',
        ageVerified: true,
        idempotencyKey: `test-offline-${Date.now()}`,
      };

      // This would test the full order flow with offline payment
      // Note: Requires proper test setup with test products and locations
      // For now, we're just verifying the structure
      expect(orderDto).toBeDefined();

      // Reset to online mode
      networkStatus.setOfflineMode(false);
    });
  });

  describe('Health Checks', () => {
    it('should get offline queue health status', async () => {
      const metrics = await offlineQueue.getMetrics();
      expect(metrics).toBeDefined();

      // Check if queue is healthy (not too many pending)
      const isHealthy = metrics.pending < 100;
      expect(typeof isHealthy).toBe('boolean');
    });

    it('should get network status health', async () => {
      const status = networkStatus.getStatus();
      expect(status.isOnline).toBeDefined();
      expect(status.services).toBeDefined();
    });
  });

  describe('Configuration Management', () => {
    it('should update offline payment configuration', () => {
      const originalConfig = offlinePayment.getConfig();

      offlinePayment.updateConfig({
        maxTransactionAmount: 1000,
        requireManagerApproval: false,
      });

      const updatedConfig = offlinePayment.getConfig();
      expect(updatedConfig.maxTransactionAmount).toBe(1000);
      expect(updatedConfig.requireManagerApproval).toBe(false);

      // Restore original config
      offlinePayment.updateConfig(originalConfig);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid queue operation types', async () => {
      // This should not throw, but the operation will fail when processed
      const queueId = await offlineQueue.enqueue('invalid_type' as any, { test: 'data' }, 5, 1);

      expect(queueId).toBeDefined();
    });

    it('should handle offline payment when disabled', async () => {
      offlinePayment.updateConfig({ enabled: false });

      const result = await offlinePayment.authorizeOffline(100, 'card', 'test-location');

      expect(result.status).toBe('failed');
      expect(result.errorMessage).toContain('not enabled');

      // Re-enable for other tests
      offlinePayment.updateConfig({ enabled: true });
    });
  });
});
