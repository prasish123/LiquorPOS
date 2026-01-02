import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PerformanceMonitoringService } from './performance-monitoring.service';
import { MetricsService } from './metrics.service';
import { SentryService } from './sentry.service';

@ApiTags('monitoring')
@Controller('monitoring')
export class MonitoringController {
  constructor(
    private readonly performanceMonitoring: PerformanceMonitoringService,
    private readonly metrics: MetricsService,
    private readonly sentry: SentryService,
  ) {}

  @Get('performance')
  @ApiOperation({ summary: 'Get performance statistics' })
  @ApiResponse({
    status: 200,
    description: 'Performance statistics retrieved successfully',
  })
  getPerformanceStats() {
    return {
      stats: this.performanceMonitoring.getStats(),
      slowRequests: this.performanceMonitoring.getSlowRequests(10),
      slowQueries: this.performanceMonitoring.getSlowQueries(10),
    };
  }

  @Get('metrics')
  @ApiOperation({ summary: 'Get application metrics' })
  @ApiResponse({ status: 200, description: 'Metrics retrieved successfully' })
  getMetrics() {
    return {
      counters: this.metrics.getAllCounters(),
      gauges: this.metrics.getAllGauges(),
      histograms: this.metrics.getAllHistograms(),
    };
  }

  @Get('metrics/prometheus')
  @ApiOperation({ summary: 'Get metrics in Prometheus format' })
  @ApiResponse({ status: 200, description: 'Prometheus metrics', type: String })
  getPrometheusMetrics() {
    return this.metrics.getPrometheusMetrics();
  }

  @Get('sentry/status')
  @ApiOperation({ summary: 'Get Sentry configuration status' })
  @ApiResponse({
    status: 200,
    description: 'Sentry status retrieved successfully',
  })
  getSentryStatus() {
    return {
      initialized: this.sentry.isInitialized(),
      config: this.sentry.getConfig(),
    };
  }

  @Get('health')
  @ApiOperation({ summary: 'Get monitoring health status' })
  @ApiResponse({ status: 200, description: 'Monitoring health status' })
  getHealth() {
    const stats = this.performanceMonitoring.getStats();
    const sentryConfig = this.sentry.getConfig();

    return {
      status: 'ok',
      monitoring: {
        performance: {
          enabled: true,
          requestsTracked: stats.requests.total,
          queriesTracked: stats.database.total,
        },
        sentry: {
          enabled: sentryConfig.enabled,
          initialized: this.sentry.isInitialized(),
          environment: sentryConfig.environment,
        },
        metrics: {
          enabled: true,
          counters: this.metrics.getAllCounters().length,
          gauges: this.metrics.getAllGauges().length,
          histograms: this.metrics.getAllHistograms().length,
        },
      },
    };
  }
}
