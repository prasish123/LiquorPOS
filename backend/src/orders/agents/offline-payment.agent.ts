import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { NetworkStatusService } from '../../common/network-status.service';
import * as crypto from 'crypto';

export interface OfflinePaymentConfig {
  enabled: boolean;
  maxTransactionAmount: number;
  maxDailyTotal: number;
  requireManagerApproval: boolean;
  allowedPaymentMethods: ('cash' | 'card')[];
}

export interface OfflinePaymentResult {
  paymentId: string;
  method: 'cash' | 'card' | 'split';
  amount: number;
  status: 'authorized' | 'captured' | 'failed' | 'offline_pending';
  offlineMode: boolean;
  requiresOnlineCapture: boolean;
  processorId?: string;
  errorMessage?: string;
  metadata?: {
    dailyOfflineTotal?: number;
    managerApprovalRequired?: boolean;
    offlineReason?: string;
  };
}

/**
 * Offline Payment Agent
 * Handles payment authorization when offline or when Stripe is unavailable
 * Implements configurable limits and fallback strategies
 */
@Injectable()
export class OfflinePaymentAgent {
  private readonly logger = new Logger(OfflinePaymentAgent.name);

  private config: OfflinePaymentConfig = {
    enabled: process.env.OFFLINE_PAYMENTS_ENABLED === 'true',
    maxTransactionAmount: parseFloat(process.env.OFFLINE_MAX_TRANSACTION_AMOUNT || '500'),
    maxDailyTotal: parseFloat(process.env.OFFLINE_MAX_DAILY_TOTAL || '5000'),
    requireManagerApproval: process.env.OFFLINE_REQUIRE_MANAGER_APPROVAL === 'true',
    allowedPaymentMethods: (process.env.OFFLINE_ALLOWED_PAYMENT_METHODS || 'cash,card').split(
      ',',
    ) as ('cash' | 'card')[],
  };

  constructor(
    private readonly prisma: PrismaService,
    private readonly networkStatus: NetworkStatusService,
  ) {
    this.validateConfig();
    this.logger.log('Offline Payment Agent initialized', this.config);
  }

  /**
   * Validate configuration on startup
   */
  private validateConfig(): void {
    const errors: string[] = [];

    if (this.config.maxTransactionAmount <= 0) {
      errors.push('OFFLINE_MAX_TRANSACTION_AMOUNT must be greater than 0');
    }

    if (this.config.maxTransactionAmount > 10000) {
      this.logger.warn(
        `OFFLINE_MAX_TRANSACTION_AMOUNT is very high ($${this.config.maxTransactionAmount}). Consider reducing for security.`,
      );
    }

    if (this.config.maxDailyTotal <= 0) {
      errors.push('OFFLINE_MAX_DAILY_TOTAL must be greater than 0');
    }

    if (this.config.maxDailyTotal < this.config.maxTransactionAmount) {
      errors.push(
        'OFFLINE_MAX_DAILY_TOTAL must be greater than or equal to OFFLINE_MAX_TRANSACTION_AMOUNT',
      );
    }

    if (this.config.allowedPaymentMethods.length === 0) {
      errors.push('OFFLINE_ALLOWED_PAYMENT_METHODS must include at least one method');
    }

    const validMethods = ['cash', 'card'];
    const invalidMethods = this.config.allowedPaymentMethods.filter(
      (m) => !validMethods.includes(m),
    );
    if (invalidMethods.length > 0) {
      errors.push(
        `Invalid payment methods in OFFLINE_ALLOWED_PAYMENT_METHODS: ${invalidMethods.join(', ')}`,
      );
    }

    if (errors.length > 0) {
      const errorMessage = `Offline Payment Agent configuration errors:\n${errors.map((e) => `  - ${e}`).join('\n')}`;
      this.logger.error(errorMessage);
      throw new Error(errorMessage);
    }

    this.logger.log('Offline Payment Agent configuration validated successfully');
  }

  /**
   * Check if offline payments are enabled and allowed for this transaction
   */
  async canProcessOffline(
    amount: number,
    method: 'cash' | 'card',
    locationId: string,
  ): Promise<{
    allowed: boolean;
    reason?: string;
    requiresApproval?: boolean;
  }> {
    // Check if offline payments are enabled
    if (!this.config.enabled) {
      return {
        allowed: false,
        reason: 'Offline payments are not enabled',
      };
    }

    // Check if payment method is allowed
    if (!this.config.allowedPaymentMethods.includes(method)) {
      return {
        allowed: false,
        reason: `Payment method ${method} is not allowed in offline mode`,
      };
    }

    // Cash is always allowed in offline mode
    if (method === 'cash') {
      return { allowed: true };
    }

    // For card payments, check limits
    if (amount > this.config.maxTransactionAmount) {
      return {
        allowed: false,
        reason: `Transaction amount $${amount} exceeds offline limit of $${this.config.maxTransactionAmount}`,
      };
    }

    // Check daily total
    const dailyTotal = await this.getDailyOfflineTotal(locationId);
    if (dailyTotal + amount > this.config.maxDailyTotal) {
      return {
        allowed: false,
        reason: `Daily offline total would exceed limit of $${this.config.maxDailyTotal} (current: $${dailyTotal})`,
      };
    }

    return {
      allowed: true,
      requiresApproval: this.config.requireManagerApproval,
    };
  }

  /**
   * Authorize payment in offline mode
   */
  async authorizeOffline(
    amount: number,
    method: 'cash' | 'card',
    locationId: string,
    metadata?: {
      employeeId?: string;
      managerId?: string;
      terminalId?: string;
    },
  ): Promise<OfflinePaymentResult> {
    const paymentId = crypto.randomUUID();

    // Check if offline payment is allowed
    const canProcess = await this.canProcessOffline(amount, method, locationId);

    if (!canProcess.allowed) {
      this.logger.error(`Offline payment rejected: ${canProcess.reason}`, undefined, {
        amount,
        method,
        locationId,
      });

      return {
        paymentId,
        method,
        amount,
        status: 'failed',
        offlineMode: true,
        requiresOnlineCapture: false,
        errorMessage: canProcess.reason,
      };
    }

    // Get daily offline total for metadata
    const dailyTotal = await this.getDailyOfflineTotal(locationId);

    // For cash, immediately mark as captured
    if (method === 'cash') {
      this.logger.log(`Offline cash payment authorized: ${paymentId} for $${amount}`);

      return {
        paymentId,
        method,
        amount,
        status: 'captured',
        offlineMode: true,
        requiresOnlineCapture: false,
        metadata: {
          dailyOfflineTotal: dailyTotal + amount,
          offlineReason: 'Network unavailable',
        },
      };
    }

    // For card payments, authorize offline but require online capture later
    this.logger.warn(
      `Offline card payment authorized (requires online capture): ${paymentId} for $${amount}`,
      {
        dailyTotal: dailyTotal + amount,
        requiresApproval: canProcess.requiresApproval,
      },
    );

    // Log offline payment for audit
    await this.logOfflinePayment(paymentId, amount, method, locationId, metadata);

    return {
      paymentId,
      method,
      amount,
      status: 'offline_pending',
      offlineMode: true,
      requiresOnlineCapture: true,
      processorId: `offline-${paymentId}`,
      metadata: {
        dailyOfflineTotal: dailyTotal + amount,
        managerApprovalRequired: canProcess.requiresApproval,
        offlineReason: this.networkStatus.isStripeAvailable()
          ? 'Stripe unavailable'
          : 'Network unavailable',
      },
    };
  }

  /**
   * Get daily offline payment total for a location
   */
  private async getDailyOfflineTotal(locationId: string): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Count offline payments from EventLog
    const offlinePayments = await this.prisma.eventLog.findMany({
      where: {
        eventType: 'payment.offline',
        locationId,
        timestamp: {
          gte: today,
          lt: tomorrow,
        },
      },
    });

    const total = offlinePayments.reduce((sum, payment) => {
      const data = JSON.parse(payment.payload);
      return sum + (data.amount || 0);
    }, 0);

    return total;
  }

  /**
   * Log offline payment for audit trail
   */
  private async logOfflinePayment(
    paymentId: string,
    amount: number,
    method: string,
    locationId: string,
    metadata?: any,
  ): Promise<void> {
    try {
      await this.prisma.eventLog.create({
        data: {
          eventType: 'payment.offline',
          aggregateId: paymentId,
          locationId,
          payload: JSON.stringify({
            paymentId,
            amount,
            method,
            timestamp: new Date().toISOString(),
            networkStatus: this.networkStatus.getStatus(),
            ...metadata,
          }),
          metadata: JSON.stringify({
            offlineMode: true,
            config: this.config,
          }),
          processed: false,
        },
      });

      this.logger.log(`Logged offline payment: ${paymentId}`);
    } catch (error) {
      this.logger.error(
        'Failed to log offline payment',
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  /**
   * Capture offline payment when back online
   */
  async captureOfflinePayment(
    paymentId: string,
    processorId: string,
  ): Promise<{ success: boolean; error?: string }> {
    this.logger.log(`Attempting to capture offline payment: ${paymentId} (${processorId})`);

    // Check if we're back online
    if (!this.networkStatus.isStripeAvailable()) {
      return {
        success: false,
        error: 'Stripe is still unavailable',
      };
    }

    try {
      // This would integrate with the actual PaymentAgent to capture via Stripe
      // For now, we'll just mark it as captured in the audit log
      await this.prisma.eventLog.updateMany({
        where: {
          eventType: 'payment.offline',
          aggregateId: paymentId,
        },
        data: {
          processed: true,
          processedAt: new Date(),
        },
      });

      this.logger.log(`Successfully captured offline payment: ${paymentId}`);
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to capture offline payment: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
      );

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Get offline payment configuration
   */
  getConfig(): OfflinePaymentConfig {
    return { ...this.config };
  }

  /**
   * Update offline payment configuration
   */
  updateConfig(config: Partial<OfflinePaymentConfig>): void {
    this.config = {
      ...this.config,
      ...config,
    };
    this.logger.log('Offline payment configuration updated', this.config);
  }

  /**
   * Get pending offline payments that need to be captured
   */
  async getPendingOfflinePayments(locationId?: string): Promise<
    Array<{
      paymentId: string;
      amount: number;
      method: string;
      timestamp: Date;
      locationId: string;
    }>
  > {
    const where: any = {
      eventType: 'payment.offline',
      processed: false,
    };

    if (locationId) {
      where.locationId = locationId;
    }

    const pending = await this.prisma.eventLog.findMany({
      where,
      orderBy: {
        timestamp: 'asc',
      },
    });

    return pending.map((p) => {
      const data = JSON.parse(p.payload);
      return {
        paymentId: data.paymentId,
        amount: data.amount,
        method: data.method,
        timestamp: p.timestamp,
        locationId: p.locationId || '',
      };
    });
  }

  /**
   * Get offline payment statistics
   */
  async getStatistics(
    locationId?: string,
    days: number = 7,
  ): Promise<{
    totalOfflinePayments: number;
    totalAmount: number;
    pendingCaptures: number;
    averageAmount: number;
    byMethod: Record<string, { count: number; amount: number }>;
  }> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const where: any = {
      eventType: 'payment.offline',
      timestamp: {
        gte: cutoffDate,
      },
    };

    if (locationId) {
      where.locationId = locationId;
    }

    const payments = await this.prisma.eventLog.findMany({
      where,
    });

    const stats = {
      totalOfflinePayments: payments.length,
      totalAmount: 0,
      pendingCaptures: 0,
      averageAmount: 0,
      byMethod: {} as Record<string, { count: number; amount: number }>,
    };

    payments.forEach((p) => {
      const data = JSON.parse(p.payload);
      const amount = data.amount || 0;
      const method = data.method || 'unknown';

      stats.totalAmount += amount;

      if (!p.processed) {
        stats.pendingCaptures++;
      }

      if (!stats.byMethod[method]) {
        stats.byMethod[method] = { count: 0, amount: 0 };
      }
      stats.byMethod[method].count++;
      stats.byMethod[method].amount += amount;
    });

    stats.averageAmount =
      stats.totalOfflinePayments > 0 ? stats.totalAmount / stats.totalOfflinePayments : 0;

    return stats;
  }
}
