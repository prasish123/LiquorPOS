import { Test, TestingModule } from '@nestjs/testing';
import { PerformanceMonitoringService } from './performance-monitoring.service';
import { MetricsService } from './metrics.service';
import { SentryService } from './sentry.service';

describe('Monitoring Services', () => {
  let performanceMonitoring: PerformanceMonitoringService;
  let metrics: MetricsService;
  let sentry: SentryService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PerformanceMonitoringService, MetricsService, SentryService],
    }).compile();

    performanceMonitoring = module.get<PerformanceMonitoringService>(PerformanceMonitoringService);
    metrics = module.get<MetricsService>(MetricsService);
    sentry = module.get<SentryService>(SentryService);

    // Initialize Sentry service
    await sentry.onModuleInit();

    // Clear metrics before each test
    performanceMonitoring.clearMetrics();
    metrics.clearMetrics();
  });

  describe('PerformanceMonitoringService', () => {
    it('should be defined', () => {
      expect(performanceMonitoring).toBeDefined();
    });

    it('should track request metrics', () => {
      performanceMonitoring.trackRequest({
        method: 'GET',
        path: '/api/test',
        statusCode: 200,
        duration: 150,
        timestamp: new Date(),
      });

      const stats = performanceMonitoring.getStats();
      expect(stats.requests.total).toBe(1);
      expect(stats.requests.averageDuration).toBe(150);
    });

    it('should track database query metrics', () => {
      performanceMonitoring.trackDatabaseQuery({
        query: 'SELECT * FROM users',
        duration: 50,
        timestamp: new Date(),
        success: true,
      });

      const stats = performanceMonitoring.getStats();
      expect(stats.database.total).toBe(1);
      expect(stats.database.averageDuration).toBe(50);
    });

    it('should identify slow requests', () => {
      performanceMonitoring.trackRequest({
        method: 'POST',
        path: '/api/slow',
        statusCode: 200,
        duration: 5000,
        timestamp: new Date(),
      });

      const slowRequests = performanceMonitoring.getSlowRequests();
      expect(slowRequests).toHaveLength(1);
      expect(slowRequests[0].duration).toBe(5000);
    });

    it('should identify slow queries', () => {
      performanceMonitoring.trackDatabaseQuery({
        query: 'SELECT * FROM large_table',
        duration: 2000,
        timestamp: new Date(),
        success: true,
      });

      const slowQueries = performanceMonitoring.getSlowQueries();
      expect(slowQueries).toHaveLength(1);
      expect(slowQueries[0].duration).toBe(2000);
    });

    it('should calculate percentiles correctly', () => {
      // Add multiple requests with varying durations
      for (let i = 1; i <= 100; i++) {
        performanceMonitoring.trackRequest({
          method: 'GET',
          path: '/api/test',
          statusCode: 200,
          duration: i * 10, // 10ms to 1000ms
          timestamp: new Date(),
        });
      }

      const stats = performanceMonitoring.getStats();
      expect(stats.requests.total).toBe(100);
      expect(stats.requests.p50).toBeGreaterThan(0);
      expect(stats.requests.p95).toBeGreaterThan(stats.requests.p50);
      expect(stats.requests.p99).toBeGreaterThan(stats.requests.p95);
    });

    it('should track custom metrics', () => {
      performanceMonitoring.trackCustomMetric('payment_processing', 250);
      performanceMonitoring.trackCustomMetric('payment_processing', 300);

      const stats = performanceMonitoring.getStats();
      expect(stats.custom['payment_processing']).toBeDefined();
      expect(stats.custom['payment_processing'].count).toBe(2);
      expect(stats.custom['payment_processing'].averageDuration).toBe(275);
    });

    it('should provide time window filtering', () => {
      const now = new Date();
      const old = new Date(now.getTime() - 10 * 60 * 1000); // 10 minutes ago

      performanceMonitoring.trackRequest({
        method: 'GET',
        path: '/api/old',
        statusCode: 200,
        duration: 100,
        timestamp: old,
      });

      performanceMonitoring.trackRequest({
        method: 'GET',
        path: '/api/new',
        statusCode: 200,
        duration: 100,
        timestamp: now,
      });

      const metrics = performanceMonitoring.getMetricsInTimeWindow(5);
      expect(metrics.requests).toHaveLength(1);
      expect(metrics.requests[0].path).toBe('/api/new');
    });
  });

  describe('MetricsService', () => {
    it('should be defined', () => {
      expect(metrics).toBeDefined();
    });

    it('should increment counters', () => {
      metrics.incrementCounter('http_requests', 1);
      metrics.incrementCounter('http_requests', 2);

      expect(metrics.getCounter('http_requests')).toBe(3);
    });

    it('should handle counters with labels', () => {
      metrics.incrementCounter('http_requests', 1, { method: 'GET' });
      metrics.incrementCounter('http_requests', 1, { method: 'POST' });

      expect(metrics.getCounter('http_requests', { method: 'GET' })).toBe(1);
      expect(metrics.getCounter('http_requests', { method: 'POST' })).toBe(1);
    });

    it('should set and get gauge values', () => {
      metrics.setGauge('active_connections', 10);
      expect(metrics.getGauge('active_connections')).toBe(10);

      metrics.setGauge('active_connections', 15);
      expect(metrics.getGauge('active_connections')).toBe(15);
    });

    it('should increment and decrement gauges', () => {
      metrics.setGauge('queue_size', 10);
      metrics.incrementGauge('queue_size', 5);
      expect(metrics.getGauge('queue_size')).toBe(15);

      metrics.decrementGauge('queue_size', 3);
      expect(metrics.getGauge('queue_size')).toBe(12);
    });

    it('should record histogram values', () => {
      metrics.recordHistogram('response_time', 100);
      metrics.recordHistogram('response_time', 200);
      metrics.recordHistogram('response_time', 150);

      const stats = metrics.getHistogramStats('response_time');
      expect(stats).not.toBeNull();
      expect(stats!.count).toBe(3);
      expect(stats!.avg).toBe(150);
      expect(stats!.min).toBe(100);
      expect(stats!.max).toBe(200);
    });

    it('should calculate histogram percentiles', () => {
      // Add 100 values
      for (let i = 1; i <= 100; i++) {
        metrics.recordHistogram('test_metric', i);
      }

      const stats = metrics.getHistogramStats('test_metric');
      expect(stats).not.toBeNull();
      expect(stats!.p50).toBeCloseTo(50, 0);
      expect(stats!.p95).toBeCloseTo(95, 0);
      expect(stats!.p99).toBeCloseTo(99, 0);
    });

    it('should generate Prometheus format metrics', () => {
      metrics.incrementCounter('http_requests_total', 10);
      metrics.setGauge('active_connections', 5);

      const prometheus = metrics.getPrometheusMetrics();
      expect(prometheus).toContain('http_requests_total 10');
      expect(prometheus).toContain('active_connections 5');
    });

    it('should handle labels in Prometheus format', () => {
      metrics.incrementCounter('http_requests_total', 1, {
        method: 'GET',
        status: '200',
      });

      const prometheus = metrics.getPrometheusMetrics();
      expect(prometheus).toContain('http_requests_total{method="GET",status="200"} 1');
    });
  });

  describe('SentryService', () => {
    it('should be defined', () => {
      expect(sentry).toBeDefined();
    });

    it('should load configuration from environment', () => {
      const config = sentry.getConfig();
      expect(config).toBeDefined();
      expect(config.environment).toBeDefined();
      expect(config.tracesSampleRate).toBeGreaterThanOrEqual(0);
      expect(config.tracesSampleRate).toBeLessThanOrEqual(1);
    });

    it('should not initialize without DSN', () => {
      // Sentry should not be initialized in test environment without DSN
      expect(sentry.isInitialized()).toBe(false);
    });

    it('should handle capture calls when not initialized', () => {
      // Should not throw when Sentry is not initialized
      expect(() => {
        sentry.captureException(new Error('Test error'));
      }).not.toThrow();

      expect(() => {
        sentry.captureMessage('Test message');
      }).not.toThrow();
    });

    it('should handle user context when not initialized', () => {
      // Should not throw when Sentry is not initialized
      expect(() => {
        sentry.setUser({ id: '123', username: 'test' });
      }).not.toThrow();
    });

    it('should handle tags when not initialized', () => {
      // Should not throw when Sentry is not initialized
      expect(() => {
        sentry.setTag('environment', 'test');
      }).not.toThrow();
    });

    it('should handle breadcrumbs when not initialized', () => {
      // Should not throw when Sentry is not initialized
      expect(() => {
        sentry.addBreadcrumb({
          message: 'Test breadcrumb',
          level: 'info',
        });
      }).not.toThrow();
    });
  });
});
