/**
 * E2E Tests for REQ-001: Audit Log Immutability
 *
 * Tests that PostgreSQL triggers prevent modification and deletion of audit logs
 * while still allowing creation of new audit logs.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { PrismaService } from '../src/prisma.service';
import { AppModule } from '../src/app.module';

describe('REQ-001: Audit Log Immutability (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let testAuditLogId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Audit Log Creation', () => {
    it('should allow creating new audit logs', async () => {
      const auditLog = await prisma.auditLog.create({
        data: {
          eventType: 'TEST_EVENT',
          action: 'test_action',
          result: 'success',
          userId: 'test-user-id',
          resourceId: 'test-resource-id',
        },
      });

      expect(auditLog).toBeDefined();
      expect(auditLog.id).toBeTruthy();
      expect(auditLog.eventType).toBe('TEST_EVENT');
      expect(auditLog.action).toBe('test_action');

      // Save ID for later tests
      testAuditLogId = auditLog.id;
    });

    it('should allow creating audit logs with all fields', async () => {
      const auditLog = await prisma.auditLog.create({
        data: {
          eventType: 'PAYMENT_PROCESSING',
          userId: 'user-123',
          action: 'process_payment_card',
          resourceId: 'transaction-456',
          result: 'success',
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          details: JSON.stringify({ amount: 100.0, method: 'card' }),
        },
      });

      expect(auditLog).toBeDefined();
      expect(auditLog.eventType).toBe('PAYMENT_PROCESSING');
      expect(auditLog.ipAddress).toBe('192.168.1.1');
    });
  });

  describe('Audit Log Immutability - UPDATE Prevention', () => {
    it('should throw error when attempting to update audit log', async () => {
      await expect(
        prisma.auditLog.update({
          where: { id: testAuditLogId },
          data: { result: 'failure' },
        }),
      ).rejects.toThrow(/Audit logs are immutable/i);
    });

    it('should throw error with correct error message', async () => {
      try {
        await prisma.auditLog.update({
          where: { id: testAuditLogId },
          data: { action: 'modified_action' },
        });
        fail('Expected error to be thrown');
      } catch (error) {
        expect(error.message).toContain('Audit logs are immutable');
        expect(error.message).toContain('UPDATE');
      }
    });

    it('should throw error when attempting to update multiple fields', async () => {
      await expect(
        prisma.auditLog.update({
          where: { id: testAuditLogId },
          data: {
            result: 'failure',
            action: 'modified',
            details: 'tampered',
          },
        }),
      ).rejects.toThrow(/Audit logs are immutable/i);
    });
  });

  describe('Audit Log Immutability - DELETE Prevention', () => {
    it('should throw error when attempting to delete audit log', async () => {
      await expect(
        prisma.auditLog.delete({
          where: { id: testAuditLogId },
        }),
      ).rejects.toThrow(/Audit logs are immutable/i);
    });

    it('should throw error with correct error message for delete', async () => {
      try {
        await prisma.auditLog.delete({
          where: { id: testAuditLogId },
        });
        fail('Expected error to be thrown');
      } catch (error) {
        expect(error.message).toContain('Audit logs are immutable');
        expect(error.message).toContain('DELETE');
      }
    });

    it('should throw error when attempting deleteMany', async () => {
      await expect(
        prisma.auditLog.deleteMany({
          where: { eventType: 'TEST_EVENT' },
        }),
      ).rejects.toThrow(/Audit logs are immutable/i);
    });
  });

  describe('Audit Log Immutability - Verification', () => {
    it('should verify audit log still exists and unchanged', async () => {
      const auditLog = await prisma.auditLog.findUnique({
        where: { id: testAuditLogId },
      });

      expect(auditLog).toBeDefined();
      expect(auditLog!.eventType).toBe('TEST_EVENT');
      expect(auditLog!.action).toBe('test_action');
      expect(auditLog!.result).toBe('success');
    });

    it('should allow reading audit logs', async () => {
      const auditLogs = await prisma.auditLog.findMany({
        where: { eventType: 'TEST_EVENT' },
      });

      expect(auditLogs.length).toBeGreaterThan(0);
    });
  });

  describe('Existing Audit Log Creation Paths', () => {
    it('should allow ORDER_CREATION audit logs', async () => {
      const auditLog = await prisma.auditLog.create({
        data: {
          eventType: 'ORDER_CREATION',
          userId: 'cashier-123',
          action: 'create_order',
          resourceId: 'order-789',
          result: 'success',
        },
      });

      expect(auditLog).toBeDefined();
      expect(auditLog.eventType).toBe('ORDER_CREATION');
    });

    it('should allow PAYMENT_PROCESSING audit logs', async () => {
      const auditLog = await prisma.auditLog.create({
        data: {
          eventType: 'PAYMENT_PROCESSING',
          userId: 'cashier-123',
          action: 'process_payment_cash',
          resourceId: 'transaction-101',
          result: 'success',
        },
      });

      expect(auditLog).toBeDefined();
      expect(auditLog.eventType).toBe('PAYMENT_PROCESSING');
    });

    it('should allow AGE_VERIFICATION audit logs', async () => {
      const auditLog = await prisma.auditLog.create({
        data: {
          eventType: 'AGE_VERIFICATION',
          userId: 'cashier-123',
          action: 'verify_age',
          resourceId: 'transaction-102',
          result: 'success',
        },
      });

      expect(auditLog).toBeDefined();
      expect(auditLog.eventType).toBe('AGE_VERIFICATION');
    });

    it('should allow IDEMPOTENCY_CHECK audit logs', async () => {
      const auditLog = await prisma.auditLog.create({
        data: {
          eventType: 'IDEMPOTENCY_CHECK',
          userId: 'system',
          action: 'new_request_processed',
          resourceId: 'transaction-103',
          result: 'success',
        },
      });

      expect(auditLog).toBeDefined();
      expect(auditLog.eventType).toBe('IDEMPOTENCY_CHECK');
    });
  });

  describe('Acceptance Criteria', () => {
    it('✅ prisma.auditLog.update() throws error', async () => {
      const auditLog = await prisma.auditLog.create({
        data: {
          eventType: 'ACCEPTANCE_TEST',
          action: 'test',
          result: 'success',
        },
      });

      await expect(
        prisma.auditLog.update({
          where: { id: auditLog.id },
          data: { result: 'failure' },
        }),
      ).rejects.toThrow();
    });

    it('✅ prisma.auditLog.delete() throws error', async () => {
      const auditLog = await prisma.auditLog.create({
        data: {
          eventType: 'ACCEPTANCE_TEST',
          action: 'test',
          result: 'success',
        },
      });

      await expect(
        prisma.auditLog.delete({
          where: { id: auditLog.id },
        }),
      ).rejects.toThrow();
    });

    it('✅ All existing audit log creation still works', async () => {
      // Test all event types
      const eventTypes = [
        'ORDER_CREATION',
        'PAYMENT_PROCESSING',
        'AGE_VERIFICATION',
        'IDEMPOTENCY_CHECK',
      ];

      for (const eventType of eventTypes) {
        const auditLog = await prisma.auditLog.create({
          data: {
            eventType,
            action: 'test_action',
            result: 'success',
          },
        });

        expect(auditLog).toBeDefined();
        expect(auditLog.eventType).toBe(eventType);
      }
    });
  });
});
