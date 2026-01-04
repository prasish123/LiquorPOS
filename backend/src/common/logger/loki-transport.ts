import Transport from 'winston-transport';
import axios, { AxiosInstance, AxiosError } from 'axios';

interface LogEntry {
  stream: Record<string, string>;
  values: [string, string][];
}

interface LokiTransportOptions {
  host: string;
  labels?: Record<string, string>;
  batching?: boolean;
  batchInterval?: number;
  maxBatchSize?: number;
  maxRetries?: number;
  retryDelay?: number;
  maxQueueSize?: number;
}

enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

export class LokiTransport extends Transport {
  private client: AxiosInstance;
  private labels: Record<string, string>;
  private batch: LogEntry[] = [];
  private batchInterval: NodeJS.Timeout | null = null;
  private batching: boolean;
  private maxBatchSize: number;
  private maxRetries: number;
  private retryDelay: number;
  private maxQueueSize: number;
  
  // Circuit breaker
  private circuitState: CircuitState = CircuitState.CLOSED;
  private failureCount: number = 0;
  private lastFailureTime: number = 0;
  private circuitOpenDuration: number = 60000; // 1 minute
  private failureThreshold: number = 5;

  constructor(options: LokiTransportOptions) {
    super(options);

    this.labels = options.labels || {};
    this.batching = options.batching !== false;
    this.maxBatchSize = options.maxBatchSize || 100;
    this.maxRetries = options.maxRetries || 3;
    this.retryDelay = options.retryDelay || 1000;
    this.maxQueueSize = options.maxQueueSize || 1000;

    this.client = axios.create({
      baseURL: options.host,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (this.batching) {
      this.startBatching(options.batchInterval || 5000);
    }
  }

  log(info: any, callback: () => void): void {
    setImmediate(() => {
      this.emit('logged', info);
    });

    // Check circuit breaker
    if (this.circuitState === CircuitState.OPEN) {
      if (Date.now() - this.lastFailureTime > this.circuitOpenDuration) {
        this.circuitState = CircuitState.HALF_OPEN;
        console.log('Circuit breaker: HALF_OPEN');
      } else {
        // Circuit is open, drop the log
        callback();
        return;
      }
    }

    // Check queue size
    if (this.batch.length >= this.maxQueueSize) {
      console.warn('Loki queue full, dropping oldest logs');
      this.batch.shift(); // Remove oldest
    }

    const logEntry: LogEntry = {
      stream: {
        level: info.level,
        service: info.service || this.labels.service || 'unknown',
        location: info.location || this.labels.location || 'unknown',
        ...this.labels, // Spread other custom labels
      },
      values: [
        [
          String(Date.now() * 1000000),
          JSON.stringify({
            message: info.message,
            level: info.level,
            timestamp: new Date().toISOString(),
            ...info,
          }),
        ],
      ],
    };

    if (this.batching) {
      this.batch.push(logEntry);
      if (this.batch.length >= this.maxBatchSize) {
        this.flush();
      }
    } else {
      this.send([logEntry]);
    }

    callback();
  }

  private startBatching(interval: number): void {
    this.batchInterval = setInterval(() => {
      if (this.batch.length > 0) {
        this.flush();
      }
    }, interval);
  }

  private flush(): void {
    if (this.batch.length === 0) return;

    const logsToSend = [...this.batch];
    this.batch = [];
    this.send(logsToSend);
  }

  private async send(streams: LogEntry[], retryCount: number = 0): Promise<void> {
    try {
      await this.client.post('/loki/api/v1/push', { streams });
      
      // Success - reset circuit breaker
      this.failureCount = 0;
      if (this.circuitState === CircuitState.HALF_OPEN) {
        this.circuitState = CircuitState.CLOSED;
        console.log('Circuit breaker: CLOSED');
      }
    } catch (error) {
      this.handleError(error as AxiosError, streams, retryCount);
    }
  }

  private async handleError(
    error: AxiosError,
    streams: LogEntry[],
    retryCount: number
  ): Promise<void> {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    // Open circuit breaker if threshold reached
    if (this.failureCount >= this.failureThreshold) {
      this.circuitState = CircuitState.OPEN;
      console.error(`Circuit breaker: OPEN (${this.failureCount} failures)`);
    }

    // Retry logic
    if (retryCount < this.maxRetries && this.circuitState !== CircuitState.OPEN) {
      const delay = this.retryDelay * Math.pow(2, retryCount); // Exponential backoff
      console.warn(
        `Failed to send logs to Loki (attempt ${retryCount + 1}/${this.maxRetries}), ` +
        `retrying in ${delay}ms: ${error.message}`
      );
      
      await new Promise(resolve => setTimeout(resolve, delay));
      return this.send(streams, retryCount + 1);
    }

    // All retries failed
    console.error(
      `Failed to send logs to Loki after ${this.maxRetries} retries: ${error.message}`
    );
    
    // Don't throw - we don't want to crash the app
    // Logs are lost, but app continues
  }

  close(): void {
    if (this.batchInterval) {
      clearInterval(this.batchInterval);
    }
    this.flush();
  }
}

