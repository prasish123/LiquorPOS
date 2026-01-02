import { Injectable, Logger } from '@nestjs/common';
import { performance } from 'perf_hooks';

export interface PerformanceMetric {
  name: string;
  duration: number;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface RequestMetrics {
  method: string;
  path: string;
  statusCode: number;
  duration: number;
  timestamp: Date;
  userId?: string;
  correlationId?: string;
}

export interface DatabaseMetrics {
  query: string;
  duration: number;
  timestamp: Date;
  success: boolean;
  error?: string;
}

export interface PerformanceStats {
  requests: {
    total: number;
    averageDuration: number;
    p50: number;
    p95: number;
    p99: number;
    slowest: RequestMetrics | null;
  };
  database: {
    total: number;
    averageDuration: number;
    slowQueries: DatabaseMetrics[];
  };
  custom: {
    [key: string]: {
      count: number;
      averageDuration: number;
      totalDuration: number;
    };
  };
}

@Injectable()
export class PerformanceMonitoringService {
  private readonly logger = new Logger(PerformanceMonitoringService.name);

  // In-memory storage for metrics (last 1000 requests)
  private requestMetrics: RequestMetrics[] = [];
  private databaseMetrics: DatabaseMetrics[] = [];
  private customMetrics: Map<string, PerformanceMetric[]> = new Map();

  private readonly MAX_STORED_METRICS = 1000;
  private readonly SLOW_QUERY_THRESHOLD = 1000; // 1 second
  private readonly SLOW_REQUEST_THRESHOLD = 3000; // 3 seconds

  /**
   * Track a request's performance
   */
  trackRequest(metrics: RequestMetrics): void {
    this.requestMetrics.push(metrics);

    // Keep only last N metrics
    if (this.requestMetrics.length > this.MAX_STORED_METRICS) {
      this.requestMetrics.shift();
    }

    // Log slow requests
    if (metrics.duration > this.SLOW_REQUEST_THRESHOLD) {
      this.logger.warn(
        `Slow request detected: ${metrics.method} ${metrics.path} took ${metrics.duration}ms`,
        {
          method: metrics.method,
          path: metrics.path,
          duration: metrics.duration,
          statusCode: metrics.statusCode,
          userId: metrics.userId,
          correlationId: metrics.correlationId,
        },
      );
    }
  }

  /**
   * Track a database query's performance
   */
  trackDatabaseQuery(metrics: DatabaseMetrics): void {
    this.databaseMetrics.push(metrics);

    // Keep only last N metrics
    if (this.databaseMetrics.length > this.MAX_STORED_METRICS) {
      this.databaseMetrics.shift();
    }

    // Log slow queries
    if (metrics.duration > this.SLOW_QUERY_THRESHOLD) {
      this.logger.warn(
        `Slow database query detected: ${metrics.query.substring(0, 100)}... took ${metrics.duration}ms`,
        {
          query: metrics.query,
          duration: metrics.duration,
          success: metrics.success,
          error: metrics.error,
        },
      );
    }
  }

  /**
   * Track a custom operation's performance
   */
  trackCustomMetric(
    name: string,
    duration: number,
    metadata?: Record<string, any>,
  ): void {
    const metric: PerformanceMetric = {
      name,
      duration,
      timestamp: new Date(),
      metadata,
    };

    if (!this.customMetrics.has(name)) {
      this.customMetrics.set(name, []);
    }

    const metrics = this.customMetrics.get(name)!;
    metrics.push(metric);

    // Keep only last N metrics per operation
    if (metrics.length > this.MAX_STORED_METRICS) {
      metrics.shift();
    }
  }

  /**
   * Start tracking an operation
   */
  startTracking(operationName: string): () => void {
    const startTime = performance.now();

    return () => {
      const duration = performance.now() - startTime;
      this.trackCustomMetric(operationName, duration);
    };
  }

  /**
   * Get performance statistics
   */
  getStats(): PerformanceStats {
    return {
      requests: this.calculateRequestStats(),
      database: this.calculateDatabaseStats(),
      custom: this.calculateCustomStats(),
    };
  }

  /**
   * Calculate request statistics
   */
  private calculateRequestStats() {
    if (this.requestMetrics.length === 0) {
      return {
        total: 0,
        averageDuration: 0,
        p50: 0,
        p95: 0,
        p99: 0,
        slowest: null,
      };
    }

    const durations = this.requestMetrics
      .map((m) => m.duration)
      .sort((a, b) => a - b);
    const total = this.requestMetrics.length;
    const sum = durations.reduce((acc, d) => acc + d, 0);

    return {
      total,
      averageDuration: Math.round(sum / total),
      p50: this.percentile(durations, 0.5),
      p95: this.percentile(durations, 0.95),
      p99: this.percentile(durations, 0.99),
      slowest: this.requestMetrics.reduce((slowest, current) =>
        !slowest || current.duration > slowest.duration ? current : slowest,
      ),
    };
  }

  /**
   * Calculate database statistics
   */
  private calculateDatabaseStats() {
    if (this.databaseMetrics.length === 0) {
      return {
        total: 0,
        averageDuration: 0,
        slowQueries: [],
      };
    }

    const durations = this.databaseMetrics.map((m) => m.duration);
    const sum = durations.reduce((acc, d) => acc + d, 0);
    const slowQueries = this.databaseMetrics
      .filter((m) => m.duration > this.SLOW_QUERY_THRESHOLD)
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 10); // Top 10 slowest

    return {
      total: this.databaseMetrics.length,
      averageDuration: Math.round(sum / this.databaseMetrics.length),
      slowQueries,
    };
  }

  /**
   * Calculate custom metrics statistics
   */
  private calculateCustomStats() {
    const stats: PerformanceStats['custom'] = {};

    for (const [name, metrics] of this.customMetrics.entries()) {
      if (metrics.length === 0) continue;

      const durations = metrics.map((m) => m.duration);
      const sum = durations.reduce((acc, d) => acc + d, 0);

      stats[name] = {
        count: metrics.length,
        averageDuration: Math.round(sum / metrics.length),
        totalDuration: Math.round(sum),
      };
    }

    return stats;
  }

  /**
   * Calculate percentile
   */
  private percentile(sortedArray: number[], percentile: number): number {
    if (sortedArray.length === 0) return 0;

    const index = Math.ceil(sortedArray.length * percentile) - 1;
    return Math.round(sortedArray[Math.max(0, index)]);
  }

  /**
   * Get recent slow requests
   */
  getSlowRequests(limit = 10): RequestMetrics[] {
    return this.requestMetrics
      .filter((m) => m.duration > this.SLOW_REQUEST_THRESHOLD)
      .sort((a, b) => b.duration - a.duration)
      .slice(0, limit);
  }

  /**
   * Get recent slow queries
   */
  getSlowQueries(limit = 10): DatabaseMetrics[] {
    return this.databaseMetrics
      .filter((m) => m.duration > this.SLOW_QUERY_THRESHOLD)
      .sort((a, b) => b.duration - a.duration)
      .slice(0, limit);
  }

  /**
   * Clear all metrics (useful for testing)
   */
  clearMetrics(): void {
    this.requestMetrics = [];
    this.databaseMetrics = [];
    this.customMetrics.clear();
  }

  /**
   * Get metrics for a specific time window
   */
  getMetricsInTimeWindow(minutes: number): {
    requests: RequestMetrics[];
    database: DatabaseMetrics[];
  } {
    const cutoff = new Date(Date.now() - minutes * 60 * 1000);

    return {
      requests: this.requestMetrics.filter((m) => m.timestamp >= cutoff),
      database: this.databaseMetrics.filter((m) => m.timestamp >= cutoff),
    };
  }
}
