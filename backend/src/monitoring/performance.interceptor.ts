import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { performance } from 'perf_hooks';
import { PerformanceMonitoringService } from './performance-monitoring.service';
import { MetricsService } from './metrics.service';
import { SentryService } from './sentry.service';

@Injectable()
export class PerformanceInterceptor implements NestInterceptor {
  private readonly logger = new Logger(PerformanceInterceptor.name);

  constructor(
    private readonly performanceMonitoring: PerformanceMonitoringService,
    private readonly metrics: MetricsService,
    private readonly sentry: SentryService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const startTime = performance.now();
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    const { method, url, user, headers } = request;
    const correlationId =
      headers['x-correlation-id'] || headers['x-request-id'];

    // Start Sentry transaction
    const transaction = this.sentry.startTransaction(
      `${method} ${url}`,
      'http.server',
      `HTTP ${method} ${url}`,
    );

    // Set Sentry context
    if (user) {
      this.sentry.setUser({
        id: user.sub || user.id,
        username: user.username,
        role: user.role,
      });
    }

    if (correlationId) {
      this.sentry.setTag('correlation_id', correlationId);
    }

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = performance.now() - startTime;
          const statusCode = response.statusCode;

          // Track request metrics
          this.performanceMonitoring.trackRequest({
            method,
            path: url,
            statusCode,
            duration,
            timestamp: new Date(),
            userId: user?.sub || user?.id,
            correlationId,
          });

          // Track metrics
          this.metrics.incrementCounter('http_requests_total', 1, {
            method,
            status: statusCode.toString(),
          });

          this.metrics.recordHistogram('http_request_duration_ms', duration, {
            method,
            status: statusCode.toString(),
          });

          // Finish Sentry transaction
          if (transaction) {
            transaction.setHttpStatus(statusCode);
            transaction.finish();
          }

          // Log slow requests
          if (duration > 3000) {
            this.logger.warn(
              `Slow request: ${method} ${url} took ${Math.round(duration)}ms`,
              {
                method,
                url,
                duration: Math.round(duration),
                statusCode,
                userId: user?.sub || user?.id,
                correlationId,
              },
            );
          }
        },
        error: (error) => {
          const duration = performance.now() - startTime;
          const statusCode = response.statusCode || 500;

          // Track error metrics
          this.performanceMonitoring.trackRequest({
            method,
            path: url,
            statusCode,
            duration,
            timestamp: new Date(),
            userId: user?.sub || user?.id,
            correlationId,
          });

          this.metrics.incrementCounter('http_requests_total', 1, {
            method,
            status: statusCode.toString(),
          });

          this.metrics.incrementCounter('http_errors_total', 1, {
            method,
            error: error.constructor.name,
          });

          // Capture error in Sentry
          this.sentry.captureException(error, {
            user: user
              ? {
                  id: user.sub || user.id,
                  username: user.username,
                  role: user.role,
                }
              : undefined,
            tags: {
              method,
              url,
              correlation_id: correlationId,
            },
            extra: {
              duration: Math.round(duration),
              statusCode,
            },
          });

          // Finish Sentry transaction with error
          if (transaction) {
            transaction.setHttpStatus(statusCode);
            transaction.setStatus('internal_error');
            transaction.finish();
          }
        },
      }),
    );
  }
}
