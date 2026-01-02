import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PerformanceMonitoringService } from './performance-monitoring.service';
import { MetricsService } from './metrics.service';

/**
 * Prisma middleware for tracking database query performance
 */
@Injectable()
export class PrismaPerformanceMiddleware implements OnModuleInit {
  private readonly logger = new Logger(PrismaPerformanceMiddleware.name);
  private readonly SLOW_QUERY_THRESHOLD = 1000; // 1 second

  constructor(
    private readonly prisma: PrismaClient,
    private readonly performanceMonitoring: PerformanceMonitoringService,
    private readonly metrics: MetricsService,
  ) {}

  onModuleInit() {
    // Add Prisma middleware for performance tracking
    // Note: $use method exists on PrismaClient but TypeScript doesn't recognize it

    (this.prisma as any).$use(async (params: any, next: any) => {
      const startTime = Date.now();

      try {
        const result = await next(params);
        const duration = Date.now() - startTime;

        // Track query performance
        this.trackQuery(params, duration, true);

        return result;
      } catch (error) {
        const duration = Date.now() - startTime;

        // Track failed query
        this.trackQuery(params, duration, false, error);

        throw error;
      }
    });

    this.logger.log('Prisma performance monitoring middleware initialized');
  }

  /**
   * Track database query performance
   */
  private trackQuery(
    params: any,
    duration: number,
    success: boolean,
    error?: any,
  ): void {
    const { model, action } = params;
    const query = `${model}.${action}`;

    // Track in performance monitoring service
    this.performanceMonitoring.trackDatabaseQuery({
      query,
      duration,
      timestamp: new Date(),
      success,
      error: error instanceof Error ? error.message : undefined,
    });

    // Track metrics
    this.metrics.incrementCounter('db_queries_total', 1, {
      model: model || 'unknown',
      action: action || 'unknown',
      status: success ? 'success' : 'error',
    });

    this.metrics.recordHistogram('db_query_duration_ms', duration, {
      model: model || 'unknown',
      action: action || 'unknown',
    });

    // Log slow queries
    if (duration > this.SLOW_QUERY_THRESHOLD) {
      this.logger.warn(`Slow database query: ${query} took ${duration}ms`, {
        model,
        action,
        duration,
        success,
        params: this.sanitizeParams(params),
      });
    }

    // Log failed queries
    if (!success) {
      this.logger.error(
        `Database query failed: ${query}`,
        error instanceof Error ? error.stack : undefined,
        {
          model,
          action,
          duration,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      );
    }
  }

  /**
   * Sanitize query parameters (remove sensitive data)
   */
  private sanitizeParams(params: any): any {
    const sanitized = { ...params };

    // Remove sensitive fields
    if (sanitized.args && typeof sanitized.args === 'object') {
      const sensitiveFields = ['password', 'token', 'apiKey', 'secret'];

      for (const field of sensitiveFields) {
        if (sanitized.args[field]) {
          sanitized.args[field] = '[REDACTED]';
        }

        if (sanitized.args.data && sanitized.args.data[field]) {
          sanitized.args.data[field] = '[REDACTED]';
        }
      }
    }

    return sanitized;
  }
}
