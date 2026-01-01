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

    private constructor() { }

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
    }

    warn(message: string, context?: LogContext) {
        if (this.level <= LogLevel.WARN) {
            console.warn(`%c[WARN] ${message}`, 'color: #ffa500', context || '');
        }
    }

    error(message: string, error?: Error, context?: LogContext) {
        if (this.level <= LogLevel.ERROR) {
            console.error(`%c[ERROR] ${message}`, 'color: #ff0000', error || '', context || '');
            // TODO: Sentry.captureException(error, { extra: context });
        }
    }
}

export const Logger = LoggerService.getInstance();
