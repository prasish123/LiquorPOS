/**
 * Circuit Breaker Pattern Implementation
 *
 * Prevents cascading failures when external services are down.
 *
 * States:
 * - CLOSED: Normal operation, requests pass through
 * - OPEN: Service is down, requests fail fast
 * - HALF_OPEN: Testing if service has recovered
 *
 * Benefits:
 * - Prevents resource exhaustion
 * - Fails fast when service is down
 * - Automatic recovery detection
 * - Protects system from cascading failures
 */

import { Logger } from '@nestjs/common';

export enum CircuitState {
  CLOSED = 'CLOSED', // Normal operation
  OPEN = 'OPEN', // Service down, fail fast
  HALF_OPEN = 'HALF_OPEN', // Testing recovery
}

export interface CircuitBreakerConfig {
  failureThreshold: number; // Number of failures before opening
  successThreshold: number; // Number of successes to close from half-open
  timeout: number; // Time in ms before attempting recovery
  monitoringPeriod: number; // Time window for counting failures
}

export interface CircuitBreakerStats {
  state: CircuitState;
  failureCount: number;
  successCount: number;
  lastFailureTime?: Date;
  lastSuccessTime?: Date;
  nextAttemptTime?: Date;
  totalRequests: number;
  totalFailures: number;
  totalSuccesses: number;
}

export class CircuitBreaker {
  private readonly logger = new Logger('CircuitBreaker');
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount: number = 0;
  private successCount: number = 0;
  private lastFailureTime?: Date;
  private lastSuccessTime?: Date;
  private nextAttemptTime?: Date;
  private totalRequests: number = 0;
  private totalFailures: number = 0;
  private totalSuccesses: number = 0;

  private readonly config: CircuitBreakerConfig;

  constructor(
    private readonly name: string,
    config?: Partial<CircuitBreakerConfig>,
  ) {
    this.config = {
      failureThreshold: config?.failureThreshold ?? 5,
      successThreshold: config?.successThreshold ?? 2,
      timeout: config?.timeout ?? 60000, // 1 minute
      monitoringPeriod: config?.monitoringPeriod ?? 60000, // 1 minute
    };

    this.logger.log(`Circuit breaker initialized for ${name}`, {
      failureThreshold: this.config.failureThreshold,
      successThreshold: this.config.successThreshold,
      timeout: this.config.timeout,
    });
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    this.totalRequests++;

    // Check if circuit is open
    if (this.state === CircuitState.OPEN) {
      if (this.shouldAttemptReset()) {
        this.logger.log(`${this.name}: Attempting recovery (HALF_OPEN)`);
        this.state = CircuitState.HALF_OPEN;
        this.successCount = 0;
      } else {
        const waitTime = this.nextAttemptTime
          ? Math.ceil((this.nextAttemptTime.getTime() - Date.now()) / 1000)
          : 0;

        this.logger.warn(
          `${this.name}: Circuit is OPEN, failing fast (retry in ${waitTime}s)`,
          {
            failureCount: this.failureCount,
            lastFailure: this.lastFailureTime,
          },
        );

        throw new Error(
          `Circuit breaker is OPEN for ${this.name}. Service is unavailable. Retry in ${waitTime}s.`,
        );
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure(error);
      throw error;
    }
  }

  /**
   * Record a successful execution
   */
  private onSuccess(): void {
    this.lastSuccessTime = new Date();
    this.totalSuccesses++;
    this.failureCount = 0; // Reset failure count on success

    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;

      if (this.successCount >= this.config.successThreshold) {
        this.logger.log(
          `${this.name}: Circuit breaker CLOSED (recovered after ${this.successCount} successes)`,
        );
        this.state = CircuitState.CLOSED;
        this.successCount = 0;
      }
    }
  }

  /**
   * Record a failed execution
   */
  private onFailure(error: any): void {
    this.lastFailureTime = new Date();
    this.totalFailures++;
    this.failureCount++;

    const errorMessage = error instanceof Error ? error.message : String(error);

    if (this.state === CircuitState.HALF_OPEN) {
      // Failed during recovery, go back to OPEN
      this.logger.warn(
        `${this.name}: Recovery failed, circuit breaker OPEN again`,
        { error: errorMessage },
      );
      this.state = CircuitState.OPEN;
      this.nextAttemptTime = new Date(Date.now() + this.config.timeout);
      this.successCount = 0;
    } else if (this.state === CircuitState.CLOSED) {
      // Check if we should open the circuit
      if (this.failureCount >= this.config.failureThreshold) {
        this.logger.error(
          `${this.name}: Circuit breaker OPEN (${this.failureCount} failures)`,
          {
            threshold: this.config.failureThreshold,
            lastError: errorMessage,
          },
        );
        this.state = CircuitState.OPEN;
        this.nextAttemptTime = new Date(Date.now() + this.config.timeout);
      } else {
        this.logger.warn(
          `${this.name}: Failure ${this.failureCount}/${this.config.failureThreshold}`,
          { error: errorMessage },
        );
      }
    }
  }

  /**
   * Check if we should attempt to reset the circuit
   */
  private shouldAttemptReset(): boolean {
    if (!this.nextAttemptTime) {
      return true;
    }
    return Date.now() >= this.nextAttemptTime.getTime();
  }

  /**
   * Get current circuit breaker statistics
   */
  getStats(): CircuitBreakerStats {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime,
      nextAttemptTime: this.nextAttemptTime,
      totalRequests: this.totalRequests,
      totalFailures: this.totalFailures,
      totalSuccesses: this.totalSuccesses,
    };
  }

  /**
   * Force the circuit breaker to a specific state (for testing)
   */
  forceState(state: CircuitState): void {
    this.logger.warn(`${this.name}: Forcing circuit breaker to ${state}`);
    this.state = state;

    if (state === CircuitState.OPEN) {
      this.nextAttemptTime = new Date(Date.now() + this.config.timeout);
    }
  }

  /**
   * Reset the circuit breaker (for testing)
   */
  reset(): void {
    this.logger.log(`${this.name}: Resetting circuit breaker`);
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = undefined;
    this.lastSuccessTime = undefined;
    this.nextAttemptTime = undefined;
  }

  /**
   * Get current state
   */
  getState(): CircuitState {
    return this.state;
  }

  /**
   * Check if circuit is open
   */
  isOpen(): boolean {
    return this.state === CircuitState.OPEN;
  }

  /**
   * Check if circuit is closed
   */
  isClosed(): boolean {
    return this.state === CircuitState.CLOSED;
  }

  /**
   * Check if circuit is half-open
   */
  isHalfOpen(): boolean {
    return this.state === CircuitState.HALF_OPEN;
  }
}
