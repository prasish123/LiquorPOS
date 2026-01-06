import { Injectable, Logger } from '@nestjs/common';
import { MetricsService } from './metrics.service';
import { MonitoringService } from './monitoring.service';
import { ALERT_RULES } from './alert-rules';

/**
 * Business Metrics Service
 *
 * Tracks business-critical metrics that directly impact revenue and operations.
 * These metrics are essential for monitoring business health and detecting issues
 * before they impact customers.
 */
@Injectable()
export class BusinessMetricsService {
  private readonly logger = new Logger(BusinessMetricsService.name);

  // Track last revenue timestamp for zero-revenue alerts
  private lastRevenueTimestamp: Date = new Date();

  // Track order and payment counts for failure rate calculation
  private orderAttempts = 0;
  private orderFailures = 0;
  private paymentAttempts = 0;
  private paymentFailures = 0;

  constructor(
    private readonly metrics: MetricsService,
    private readonly monitoring: MonitoringService,
  ) {
    // Reset counters every hour
    setInterval(() => this.resetCounters(), 60 * 60 * 1000);

    // Check for zero revenue every 15 minutes
    setInterval(() => this.checkZeroRevenue(), 15 * 60 * 1000);
  }

  /**
   * Track order completion
   */
  trackOrderCompleted(order: {
    id: string;
    locationId: string;
    channel: string;
    total: number;
    itemCount: number;
    paymentMethod: string;
  }): void {
    this.orderAttempts++;

    // Track order count
    this.metrics.incrementCounter('orders_completed_total', 1, {
      location: order.locationId,
      channel: order.channel,
      payment_method: order.paymentMethod,
    });

    // Track revenue
    this.metrics.recordHistogram('order_value_dollars', order.total, {
      location: order.locationId,
      channel: order.channel,
    });

    // Track items sold
    this.metrics.incrementCounter('items_sold_total', order.itemCount, {
      location: order.locationId,
    });

    // Update last revenue timestamp
    this.lastRevenueTimestamp = new Date();

    this.logger.debug(`Order completed: ${order.id}, Total: $${order.total}`);
  }

  /**
   * Track order failure
   */
  trackOrderFailed(order: {
    locationId: string;
    channel: string;
    reason: string;
    total: number;
  }): void {
    this.orderAttempts++;
    this.orderFailures++;

    // Track failure
    this.metrics.incrementCounter('orders_failed_total', 1, {
      location: order.locationId,
      channel: order.channel,
      reason: order.reason,
    });

    // Check failure rate
    const failureRate = this.orderFailures / this.orderAttempts;
    if (failureRate > ALERT_RULES.business.orderFailureRate.threshold) {
      this.monitoring.sendAlert({
        severity: ALERT_RULES.business.orderFailureRate.severity,
        type: 'business.order_failure_rate',
        message: `Order failure rate is ${(failureRate * 100).toFixed(2)}%`,
        details: {
          failureRate,
          failures: this.orderFailures,
          attempts: this.orderAttempts,
          location: order.locationId,
        },
        timestamp: new Date(),
      });
    }

    this.logger.warn(`Order failed: ${order.reason}, Total: $${order.total}`);
  }

  /**
   * Track payment success
   */
  trackPaymentSuccess(payment: {
    method: string;
    amount: number;
    processorId: string;
    duration: number;
  }): void {
    this.paymentAttempts++;

    // Track payment count
    this.metrics.incrementCounter('payment_success_total', 1, {
      method: payment.method,
      processor: payment.processorId,
    });

    // Track payment amount
    this.metrics.recordHistogram('payment_amount_dollars', payment.amount, {
      method: payment.method,
    });

    // Track payment duration
    this.metrics.recordHistogram('payment_duration_ms', payment.duration, {
      method: payment.method,
    });

    this.logger.debug(
      `Payment succeeded: ${payment.method}, Amount: $${payment.amount}, Duration: ${payment.duration}ms`,
    );
  }

  /**
   * Track payment failure
   */
  trackPaymentFailure(payment: {
    method: string;
    amount: number;
    reason: string;
    processorId: string;
  }): void {
    this.paymentAttempts++;
    this.paymentFailures++;

    // Track failure
    this.metrics.incrementCounter('payment_failures_total', 1, {
      method: payment.method,
      reason: payment.reason,
      processor: payment.processorId,
    });

    // Check failure rate
    const failureRate = this.paymentFailures / this.paymentAttempts;
    if (failureRate > ALERT_RULES.business.paymentFailureRate.threshold) {
      this.monitoring.sendAlert({
        severity: ALERT_RULES.business.paymentFailureRate.severity,
        type: 'business.payment_failure_rate',
        message: `Payment failure rate is ${(failureRate * 100).toFixed(2)}%`,
        details: {
          failureRate,
          failures: this.paymentFailures,
          attempts: this.paymentAttempts,
          method: payment.method,
          reason: payment.reason,
        },
        timestamp: new Date(),
      });
    }

    this.logger.warn(
      `Payment failed: ${payment.method}, Amount: $${payment.amount}, Reason: ${payment.reason}`,
    );
  }

  /**
   * Track refund
   */
  trackRefund(refund: {
    orderId: string;
    amount: number;
    reason: string;
    locationId: string;
  }): void {
    // Track refund count
    this.metrics.incrementCounter('refunds_total', 1, {
      location: refund.locationId,
      reason: refund.reason,
    });

    // Track refund amount
    this.metrics.recordHistogram('refund_amount_dollars', refund.amount, {
      location: refund.locationId,
    });

    this.logger.log(
      `Refund processed: Order ${refund.orderId}, Amount: $${refund.amount}, Reason: ${refund.reason}`,
    );
  }

  /**
   * Track inventory out of stock
   */
  trackOutOfStock(product: { sku: string; name: string; locationId: string }): void {
    // Track out of stock count
    this.metrics.incrementCounter('inventory_out_of_stock_total', 1, {
      location: product.locationId,
    });

    this.logger.warn(
      `Product out of stock: ${product.sku} - ${product.name} at ${product.locationId}`,
    );
  }

  /**
   * Track customer registration
   */
  trackCustomerRegistered(customer: { id: string; locationId: string; channel: string }): void {
    this.metrics.incrementCounter('customers_registered_total', 1, {
      location: customer.locationId,
      channel: customer.channel,
    });

    this.logger.debug(`Customer registered: ${customer.id}`);
  }

  /**
   * Track loyalty points redemption
   */
  trackLoyaltyRedemption(redemption: {
    customerId: string;
    points: number;
    value: number;
    locationId: string;
  }): void {
    this.metrics.incrementCounter('loyalty_redemptions_total', 1, {
      location: redemption.locationId,
    });

    this.metrics.recordHistogram('loyalty_points_redeemed', redemption.points, {
      location: redemption.locationId,
    });

    this.logger.debug(
      `Loyalty redemption: Customer ${redemption.customerId}, Points: ${redemption.points}, Value: $${redemption.value}`,
    );
  }

  /**
   * Get business metrics summary
   */
  getMetricsSummary(): {
    orders: {
      total: number;
      failed: number;
      failureRate: number;
    };
    payments: {
      total: number;
      failed: number;
      failureRate: number;
    };
    revenue: {
      lastRevenueAge: number;
      isHealthy: boolean;
    };
  } {
    return {
      orders: {
        total: this.orderAttempts,
        failed: this.orderFailures,
        failureRate: this.orderAttempts > 0 ? this.orderFailures / this.orderAttempts : 0,
      },
      payments: {
        total: this.paymentAttempts,
        failed: this.paymentFailures,
        failureRate: this.paymentAttempts > 0 ? this.paymentFailures / this.paymentAttempts : 0,
      },
      revenue: {
        lastRevenueAge: Date.now() - this.lastRevenueTimestamp.getTime(),
        isHealthy:
          Date.now() - this.lastRevenueTimestamp.getTime() <
          ALERT_RULES.business.zeroRevenue.threshold,
      },
    };
  }

  /**
   * Reset hourly counters
   */
  private resetCounters(): void {
    this.orderAttempts = 0;
    this.orderFailures = 0;
    this.paymentAttempts = 0;
    this.paymentFailures = 0;

    this.logger.debug('Business metrics counters reset');
  }

  /**
   * Check for zero revenue during business hours
   */
  private checkZeroRevenue(): void {
    const timeSinceLastRevenue = Date.now() - this.lastRevenueTimestamp.getTime();

    // Check if it's during business hours (8 AM - 10 PM)
    const hour = new Date().getHours();
    const isBusinessHours = hour >= 8 && hour <= 22;

    if (isBusinessHours && timeSinceLastRevenue > ALERT_RULES.business.zeroRevenue.threshold) {
      this.monitoring.sendAlert({
        severity: ALERT_RULES.business.zeroRevenue.severity,
        type: 'business.zero_revenue',
        message: `No revenue for ${Math.round(timeSinceLastRevenue / 1000 / 60)} minutes during business hours`,
        details: {
          lastRevenueTimestamp: this.lastRevenueTimestamp,
          timeSinceLastRevenue,
        },
        timestamp: new Date(),
      });
    }
  }
}
