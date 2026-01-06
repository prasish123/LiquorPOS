import * as Sentry from '@sentry/react';

export enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3
}

type LogContext = Record<string, any>;

export class LoggerService {
    private static instance: LoggerService;
    private level: LogLevel = import.meta.env.DEV ? LogLevel.DEBUG : LogLevel.WARN;
    private sentryEnabled: boolean = false;

    private constructor() {
        // Check if Sentry is initialized
        this.sentryEnabled = !!import.meta.env.VITE_SENTRY_DSN;
    }

    static getInstance(): LoggerService {
        if (!LoggerService.instance) {
            LoggerService.instance = new LoggerService();
        }
        return LoggerService.instance;
    }

    debug(message: string, context?: LogContext) {
        if (this.level <= LogLevel.DEBUG) {
            console.debug(`%c[DEBUG] ${message}`, 'color: #888', context || '');
        }
    }

    info(message: string, context?: LogContext) {
        if (this.level <= LogLevel.INFO) {
            console.info(`%c[INFO] ${message}`, 'color: #00bfff', context || '');
        }
        
        // Send info messages to Sentry as breadcrumbs
        if (this.sentryEnabled) {
            Sentry.addBreadcrumb({
                message,
                level: 'info',
                data: context,
            });
        }
    }

    warn(message: string, context?: LogContext) {
        if (this.level <= LogLevel.WARN) {
            console.warn(`%c[WARN] ${message}`, 'color: #ffa500', context || '');
        }
        
        // Send warnings to Sentry
        if (this.sentryEnabled) {
            Sentry.captureMessage(message, {
                level: 'warning',
                extra: context,
            });
        }
    }

    error(message: string, error?: Error, context?: LogContext) {
        if (this.level <= LogLevel.ERROR) {
            console.error(`%c[ERROR] ${message}`, 'color: #ff0000', error || '', context || '');
        }
        
        // Send errors to Sentry
        if (this.sentryEnabled) {
            if (error) {
                Sentry.captureException(error, {
                    extra: {
                        message,
                        ...context,
                    },
                });
            } else {
                Sentry.captureMessage(message, {
                    level: 'error',
                    extra: context,
                });
            }
        }
    }

    /**
     * Set user context for Sentry
     */
    setUser(user: { id: string; username?: string; email?: string } | null) {
        if (this.sentryEnabled) {
            Sentry.setUser(user);
        }
    }

    /**
     * Add custom context to Sentry
     */
    setContext(name: string, context: Record<string, any>) {
        if (this.sentryEnabled) {
            Sentry.setContext(name, context);
        }
    }

    /**
     * Add tags to Sentry
     */
    setTag(key: string, value: string) {
        if (this.sentryEnabled) {
            Sentry.setTag(key, value);
        }
    }
}

export const Logger = LoggerService.getInstance();
