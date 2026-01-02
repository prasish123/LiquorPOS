import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import * as Sentry from '@sentry/node';
import { ProfilingIntegration } from '@sentry/profiling-node';

export interface SentryConfig {
  dsn?: string;
  environment: string;
  release?: string;
  tracesSampleRate: number;
  profilesSampleRate: number;
  enabled: boolean;
}

export interface ErrorContext {
  user?: {
    id: string;
    username?: string;
    role?: string;
  };
  tags?: Record<string, string>;
  extra?: Record<string, any>;
  level?: Sentry.SeverityLevel;
}

@Injectable()
export class SentryService implements OnModuleInit {
  private readonly logger = new Logger(SentryService.name);
  private config: SentryConfig;
  private initialized = false;

  onModuleInit() {
    this.config = this.loadConfig();

    if (!this.config.enabled) {
      this.logger.warn(
        'Sentry is disabled. Set SENTRY_DSN to enable error tracking and performance monitoring.',
      );
      return;
    }

    try {
      Sentry.init({
        dsn: this.config.dsn,
        environment: this.config.environment,
        release: this.config.release,

        // Performance Monitoring
        tracesSampleRate: this.config.tracesSampleRate,
        profilesSampleRate: this.config.profilesSampleRate,

        // Integrations
        integrations: [
          // Profiling integration
          new ProfilingIntegration(),

          // HTTP integration for tracking HTTP requests
          new Sentry.Integrations.Http({ tracing: true }),

          // Express integration (NestJS uses Express under the hood)
          new Sentry.Integrations.Express(),

          // Console integration for capturing console.error
          new Sentry.Integrations.Console(),

          // OnUncaughtException integration
          new Sentry.Integrations.OnUncaughtException(),

          // OnUnhandledRejection integration
          new Sentry.Integrations.OnUnhandledRejection(),
        ],

        // Before send hook to filter/modify events
        beforeSend(event, hint) {
          // Filter out sensitive data
          if (event.request) {
            // Remove sensitive headers
            if (event.request.headers) {
              delete event.request.headers['authorization'];
              delete event.request.headers['cookie'];
              delete event.request.headers['x-api-key'];
            }

            // Remove sensitive query params
            if (
              event.request.query_string &&
              typeof event.request.query_string === 'string'
            ) {
              event.request.query_string = event.request.query_string
                .replace(/password=[^&]*/gi, 'password=[REDACTED]')
                .replace(/token=[^&]*/gi, 'token=[REDACTED]')
                .replace(/api_key=[^&]*/gi, 'api_key=[REDACTED]');
            }
          }

          // Filter out sensitive data from extra context
          if (event.extra) {
            ['password', 'token', 'apiKey', 'secret'].forEach((key) => {
              if (event.extra && event.extra[key]) {
                event.extra[key] = '[REDACTED]';
              }
            });
          }

          return event;
        },

        // Before breadcrumb hook
        beforeBreadcrumb(breadcrumb, hint) {
          // Filter sensitive data from breadcrumbs
          if (breadcrumb.data) {
            ['password', 'token', 'apiKey', 'secret'].forEach((key) => {
              if (breadcrumb.data && breadcrumb.data[key]) {
                breadcrumb.data[key] = '[REDACTED]';
              }
            });
          }
          return breadcrumb;
        },
      });

      this.initialized = true;
      this.logger.log(
        `Sentry initialized successfully (Environment: ${this.config.environment}, Release: ${this.config.release || 'not set'})`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to initialize Sentry: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Load Sentry configuration from environment variables
   */
  private loadConfig(): SentryConfig {
    const dsn = process.env.SENTRY_DSN;
    const environment = process.env.NODE_ENV || 'development';
    const release =
      process.env.SENTRY_RELEASE || process.env.npm_package_version;

    // Sentry is enabled if DSN is provided
    const enabled = !!dsn;

    // Sample rates (0.0 to 1.0)
    const tracesSampleRate = parseFloat(
      process.env.SENTRY_TRACES_SAMPLE_RATE || '1.0',
    );
    const profilesSampleRate = parseFloat(
      process.env.SENTRY_PROFILES_SAMPLE_RATE || '1.0',
    );

    return {
      dsn,
      environment,
      release,
      tracesSampleRate: Math.min(Math.max(tracesSampleRate, 0), 1),
      profilesSampleRate: Math.min(Math.max(profilesSampleRate, 0), 1),
      enabled,
    };
  }

  /**
   * Capture an exception with context
   */
  captureException(error: Error, context?: ErrorContext): string | undefined {
    if (!this.initialized) {
      return undefined;
    }

    return Sentry.captureException(error, {
      user: context?.user,
      tags: context?.tags,
      extra: context?.extra,
      level: context?.level || 'error',
    });
  }

  /**
   * Capture a message
   */
  captureMessage(
    message: string,
    level: Sentry.SeverityLevel = 'info',
    context?: ErrorContext,
  ): string | undefined {
    if (!this.initialized) {
      return undefined;
    }

    return Sentry.captureMessage(message, {
      level,
      user: context?.user,
      tags: context?.tags,
      extra: context?.extra,
    });
  }

  /**
   * Set user context for all subsequent events
   */
  setUser(
    user: {
      id: string;
      username?: string;
      email?: string;
      role?: string;
    } | null,
  ): void {
    if (!this.initialized) {
      return;
    }

    Sentry.setUser(user);
  }

  /**
   * Set tag for all subsequent events
   */
  setTag(key: string, value: string): void {
    if (!this.initialized) {
      return;
    }

    Sentry.setTag(key, value);
  }

  /**
   * Set context for all subsequent events
   */
  setContext(name: string, context: Record<string, any>): void {
    if (!this.initialized) {
      return;
    }

    Sentry.setContext(name, context);
  }

  /**
   * Add breadcrumb for debugging
   */
  addBreadcrumb(breadcrumb: Sentry.Breadcrumb): void {
    if (!this.initialized) {
      return;
    }

    Sentry.addBreadcrumb(breadcrumb);
  }

  /**
   * Start a new transaction for performance monitoring
   */
  startTransaction(
    name: string,
    op: string,
    description?: string,
  ): Sentry.Transaction | undefined {
    if (!this.initialized) {
      return undefined;
    }

    return Sentry.startTransaction({
      name,
      op,
      description,
    });
  }

  /**
   * Get current transaction
   */
  getCurrentTransaction(): Sentry.Transaction | undefined {
    if (!this.initialized) {
      return undefined;
    }

    return Sentry.getCurrentHub().getScope().getTransaction();
  }

  /**
   * Check if Sentry is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Get Sentry configuration
   */
  getConfig(): SentryConfig {
    return { ...this.config };
  }

  /**
   * Flush all pending events (useful for graceful shutdown)
   */
  async flush(timeout = 2000): Promise<boolean> {
    if (!this.initialized) {
      return true;
    }

    try {
      return await Sentry.flush(timeout);
    } catch (error) {
      this.logger.error(
        `Failed to flush Sentry events: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      return false;
    }
  }

  /**
   * Close Sentry client (for graceful shutdown)
   */
  async close(timeout = 2000): Promise<boolean> {
    if (!this.initialized) {
      return true;
    }

    try {
      return await Sentry.close(timeout);
    } catch (error) {
      this.logger.error(
        `Failed to close Sentry client: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      return false;
    }
  }
}
