import { Module, Global } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { PerformanceMonitoringService } from './performance-monitoring.service';
import { SentryService } from './sentry.service';
import { MetricsService } from './metrics.service';
import { MonitoringService } from './monitoring.service';
import { BusinessMetricsService } from './business-metrics.service';
import { PerformanceInterceptor } from './performance.interceptor';
import { MonitoringController } from './monitoring.controller';
import { PrismaPerformanceMiddleware } from './prisma-performance.middleware';
import { PrismaService } from '../prisma.service';

@Global()
@Module({
  controllers: [MonitoringController],
  providers: [
    PerformanceMonitoringService,
    SentryService,
    MetricsService,
    MonitoringService,
    BusinessMetricsService,
    PrismaPerformanceMiddleware,
    PrismaService,
    {
      provide: APP_INTERCEPTOR,
      useClass: PerformanceInterceptor,
    },
  ],
  exports: [
    PerformanceMonitoringService,
    SentryService,
    MetricsService,
    MonitoringService,
    BusinessMetricsService,
  ],
})
export class MonitoringModule {}
