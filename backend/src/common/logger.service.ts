import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';
import * as winston from 'winston';
import * as DailyRotateFile from 'winston-daily-rotate-file';
import * as cls from 'cls-hooked';
import { LokiTransport } from './logger/loki-transport';
import { getAppConfig } from '../config/app.config';

// Create namespace for request context
const namespace = cls.createNamespace('app-context');

/**
 * Centralized logging service using Winston
 * Provides structured logging with levels, correlation IDs, and log aggregation support
 */
@Injectable()
export class LoggerService implements NestLoggerService {
  private logger: winston.Logger;
  private context?: string;

  constructor(context?: string) {
    this.context = context;
    this.logger = this.createLogger();
  }

  /**
   * Create Winston logger with appropriate transports and formats
   */
  private createLogger(): winston.Logger {
    const logLevel = process.env.LOG_LEVEL || 'info';
    const logDir = process.env.LOG_DIR || 'logs';
    const isProduction = process.env.NODE_ENV === 'production';

    // Load app config for observability settings
    let appConfig;
    try {
      appConfig = getAppConfig();
    } catch (error) {
      // If config fails to load, continue without Loki
      console.warn('Failed to load app config, Loki integration disabled:', error);
    }

    // Custom format for structured logging
    const structuredFormat = winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.errors({ stack: true }),
      winston.format.metadata({
        fillExcept: ['message', 'level', 'timestamp'],
      }),
      winston.format.json(),
    );

    // Human-readable format for development
    const consoleFormat = winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.colorize(),
      winston.format.printf(({ timestamp, level, message, context, correlationId, ...meta }) => {
        let log = `${timestamp} [${level}]`;
        if (context) log += ` [${context}]`;
        if (correlationId) log += ` [${correlationId}]`;
        log += ` ${message}`;
        if (Object.keys(meta).length > 0) {
          log += ` ${JSON.stringify(meta)}`;
        }
        return log;
      }),
    );

    const transports: winston.transport[] = [];

    // Console transport (always enabled)
    transports.push(
      new winston.transports.Console({
        format: isProduction ? structuredFormat : consoleFormat,
        level: logLevel,
      }),
    );

    // File transports (production only)
    if (isProduction) {
      // Combined logs (all levels)
      const combinedTransport = new (DailyRotateFile as any)({
        filename: `${logDir}/combined-%DATE%.log`,
        datePattern: 'YYYY-MM-DD',
        maxSize: '20m',
        maxFiles: '14d',
        format: structuredFormat,
        level: logLevel,
      });
      transports.push(combinedTransport);

      // Error logs (error level only)
      const errorTransport = new (DailyRotateFile as any)({
        filename: `${logDir}/error-%DATE%.log`,
        datePattern: 'YYYY-MM-DD',
        maxSize: '20m',
        maxFiles: '30d',
        format: structuredFormat,
        level: 'error',
      });
      transports.push(errorTransport);
    }

    // Loki transport (if enabled)
    if (appConfig?.observability.lokiEnabled && appConfig?.observability.lokiUrl) {
      try {
        const lokiTransport = new LokiTransport({
          host: appConfig.observability.lokiUrl,
          labels: {
            service: 'liquor-pos-backend',
            location: appConfig.location.id,
            environment: appConfig.nodeEnv,
          },
          batching: true,
          batchInterval: appConfig.observability.lokiBatchInterval,
          maxBatchSize: appConfig.observability.lokiMaxBatchSize,
          maxRetries: appConfig.observability.lokiMaxRetries,
        });
        transports.push(lokiTransport);
        console.log(`✅ Loki transport enabled: ${appConfig.observability.lokiUrl}`);
      } catch (error) {
        console.error('Failed to initialize Loki transport:', error);
      }
    }

    return winston.createLogger({
      level: logLevel,
      transports,
      exitOnError: false,
    });
  }

  /**
   * Get correlation ID from request context
   */
  private getCorrelationId(): string | undefined {
    return namespace.get('correlationId');
  }

  /**
   * Build log metadata with context and correlation ID
   */
  private buildMetadata(meta?: Record<string, any>): Record<string, any> {
    const metadata: Record<string, any> = {
      context: this.context,
      correlationId: this.getCorrelationId(),
      ...meta,
    };

    // Remove undefined values
    Object.keys(metadata).forEach((key) => {
      if (metadata[key] === undefined) {
        delete metadata[key];
      }
    });

    return metadata;
  }

  /**
   * Log at DEBUG level
   */
  debug(message: string, meta?: Record<string, any>): void {
    this.logger.debug(message, this.buildMetadata(meta));
  }

  /**
   * Log at INFO level (general application flow)
   */
  log(message: string, meta?: Record<string, any>): void {
    this.logger.info(message, this.buildMetadata(meta));
  }

  /**
   * Log at INFO level (alias for log)
   */
  info(message: string, meta?: Record<string, any>): void {
    this.log(message, meta);
  }

  /**
   * Log at WARN level (potential issues)
   */
  warn(message: string, meta?: Record<string, any>): void {
    this.logger.warn(message, this.buildMetadata(meta));
  }

  /**
   * Log at ERROR level (errors and exceptions)
   */
  error(message: string, trace?: string, meta?: Record<string, any>): void {
    const metadata = this.buildMetadata(meta);
    if (trace) {
      metadata.stack = trace;
    }
    this.logger.error(message, metadata);

    // TODO: Integrate with Sentry for error tracking
    // This will be automatically handled by the SentryService via the PerformanceInterceptor
  }

  /**
   * Log at VERBOSE level (detailed information)
   */
  verbose(message: string, meta?: Record<string, any>): void {
    this.logger.verbose(message, this.buildMetadata(meta));
  }

  /**
   * Set context for this logger instance
   */
  setContext(context: string): void {
    this.context = context;
  }

  /**
   * Create a child logger with a specific context
   */
  child(context: string): LoggerService {
    return new LoggerService(context);
  }

  /**
   * Set correlation ID in request context
   */
  static setCorrelationId(correlationId: string): void {
    namespace.set('correlationId', correlationId);
  }

  /**
   * Get the CLS namespace for manual context management
   */
  static getNamespace() {
    return namespace;
  }
}
