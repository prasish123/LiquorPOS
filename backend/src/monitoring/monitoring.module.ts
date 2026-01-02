import { Module, Global } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { PerformanceMonitoringService } from './performance-monitoring.service';
import { SentryService } from './sentry.service';
import { MetricsService } from './metrics.service';
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
    PrismaPerformanceMiddleware,
    PrismaService,
    {
      provide: APP_INTERCEPTOR,
      useClass: PerformanceInterceptor,
    },
  ],
  exports: [PerformanceMonitoringService, SentryService, MetricsService],
})
export class MonitoringModule {}
