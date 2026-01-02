import { CircuitBreaker, CircuitState } from './circuit-breaker';

describe('CircuitBreaker', () => {
  let circuitBreaker: CircuitBreaker;

  beforeEach(() => {
    circuitBreaker = new CircuitBreaker('TestService', {
      failureThreshold: 3,
      successThreshold: 2,
      timeout: 1000,
      monitoringPeriod: 5000,
    });
  });

  describe('initialization', () => {
    it('should start in CLOSED state', () => {
      expect(circuitBreaker.getState()).toBe(CircuitState.CLOSED);
      expect(circuitBreaker.isClosed()).toBe(true);
      expect(circuitBreaker.isOpen()).toBe(false);
      expect(circuitBreaker.isHalfOpen()).toBe(false);
    });

    it('should initialize with default config', () => {
      const cb = new CircuitBreaker('DefaultService');
      const stats = cb.getStats();
      expect(stats.state).toBe(CircuitState.CLOSED);
      expect(stats.failureCount).toBe(0);
    });
  });

  describe('execute - success path', () => {
    it('should execute function successfully when circuit is CLOSED', async () => {
      const mockFn = jest.fn().mockResolvedValue('success');

      const result = await circuitBreaker.execute(mockFn);

      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(circuitBreaker.getState()).toBe(CircuitState.CLOSED);
    });

    it('should reset failure count on success', async () => {
      const mockFn = jest
        .fn()
        .mockRejectedValueOnce(new Error('fail'))
        .mockResolvedValue('success');

      // First call fails
      await expect(circuitBreaker.execute(mockFn)).rejects.toThrow('fail');
      expect(circuitBreaker.getStats().failureCount).toBe(1);

      // Second call succeeds and resets failure count
      await circuitBreaker.execute(mockFn);
      expect(circuitBreaker.getStats().failureCount).toBe(0);
    });
  });

  describe('execute - failure path', () => {
    it('should track failures', async () => {
      const mockFn = jest.fn().mockRejectedValue(new Error('fail'));

      await expect(circuitBreaker.execute(mockFn)).rejects.toThrow('fail');

      const stats = circuitBreaker.getStats();
      expect(stats.failureCount).toBe(1);
      expect(stats.totalFailures).toBe(1);
      expect(stats.lastFailureTime).toBeDefined();
    });

    it('should open circuit after threshold failures', async () => {
      const mockFn = jest.fn().mockRejectedValue(new Error('fail'));

      // Fail 3 times (threshold)
      for (let i = 0; i < 3; i++) {
        await expect(circuitBreaker.execute(mockFn)).rejects.toThrow('fail');
      }

      expect(circuitBreaker.getState()).toBe(CircuitState.OPEN);
      expect(circuitBreaker.isOpen()).toBe(true);
    });

    it('should fail fast when circuit is OPEN', async () => {
      const mockFn = jest.fn().mockRejectedValue(new Error('fail'));

      // Open the circuit
      for (let i = 0; i < 3; i++) {
        await expect(circuitBreaker.execute(mockFn)).rejects.toThrow();
      }

      expect(circuitBreaker.isOpen()).toBe(true);

      // Next call should fail fast without calling the function
      const callCount = mockFn.mock.calls.length;
      await expect(circuitBreaker.execute(mockFn)).rejects.toThrow(
        'Circuit breaker is OPEN',
      );
      expect(mockFn.mock.calls.length).toBe(callCount); // Not called again
    });
  });

  describe('circuit recovery', () => {
    it('should transition to HALF_OPEN after timeout', async () => {
      const mockFn = jest
        .fn()
        .mockRejectedValueOnce(new Error('fail'))
        .mockRejectedValueOnce(new Error('fail'))
        .mockRejectedValueOnce(new Error('fail'))
        .mockResolvedValue('success');

      // Open the circuit
      for (let i = 0; i < 3; i++) {
        await expect(circuitBreaker.execute(mockFn)).rejects.toThrow();
      }
      expect(circuitBreaker.isOpen()).toBe(true);

      // Wait for timeout
      await new Promise((resolve) => setTimeout(resolve, 1100));

      // Next call should attempt recovery (HALF_OPEN)
      const result = await circuitBreaker.execute(mockFn);
      expect(result).toBe('success');
      expect(circuitBreaker.getState()).toBe(CircuitState.HALF_OPEN);
    });

    it('should close circuit after successful recovery', async () => {
      circuitBreaker.forceState(CircuitState.HALF_OPEN);

      const mockFn = jest.fn().mockResolvedValue('success');

      // Need 2 successes to close (successThreshold = 2)
      await circuitBreaker.execute(mockFn);
      expect(circuitBreaker.isHalfOpen()).toBe(true);

      await circuitBreaker.execute(mockFn);
      expect(circuitBreaker.isClosed()).toBe(true);
    });

    it('should reopen circuit if recovery fails', async () => {
      circuitBreaker.forceState(CircuitState.HALF_OPEN);

      const mockFn = jest.fn().mockRejectedValue(new Error('still failing'));

      await expect(circuitBreaker.execute(mockFn)).rejects.toThrow(
        'still failing',
      );
      expect(circuitBreaker.isOpen()).toBe(true);
    });
  });

  describe('statistics', () => {
    it('should track total requests', async () => {
      const mockFn = jest
        .fn()
        .mockResolvedValueOnce('success')
        .mockRejectedValueOnce(new Error('fail'))
        .mockResolvedValueOnce('success');

      await circuitBreaker.execute(mockFn);
      await expect(circuitBreaker.execute(mockFn)).rejects.toThrow();
      await circuitBreaker.execute(mockFn);

      const stats = circuitBreaker.getStats();
      expect(stats.totalRequests).toBe(3);
      expect(stats.totalSuccesses).toBe(2);
      expect(stats.totalFailures).toBe(1);
    });

    it('should track last success and failure times', async () => {
      const mockFn = jest
        .fn()
        .mockResolvedValueOnce('success')
        .mockRejectedValueOnce(new Error('fail'));

      await circuitBreaker.execute(mockFn);
      const statsAfterSuccess = circuitBreaker.getStats();
      expect(statsAfterSuccess.lastSuccessTime).toBeDefined();

      await expect(circuitBreaker.execute(mockFn)).rejects.toThrow();
      const statsAfterFailure = circuitBreaker.getStats();
      expect(statsAfterFailure.lastFailureTime).toBeDefined();
      expect(statsAfterFailure.lastFailureTime!.getTime()).toBeGreaterThan(
        statsAfterSuccess.lastSuccessTime!.getTime(),
      );
    });
  });

  describe('reset', () => {
    it('should reset circuit breaker to initial state', async () => {
      const mockFn = jest.fn().mockRejectedValue(new Error('fail'));

      // Open the circuit
      for (let i = 0; i < 3; i++) {
        await expect(circuitBreaker.execute(mockFn)).rejects.toThrow();
      }
      expect(circuitBreaker.isOpen()).toBe(true);

      // Reset
      circuitBreaker.reset();

      const stats = circuitBreaker.getStats();
      expect(stats.state).toBe(CircuitState.CLOSED);
      expect(stats.failureCount).toBe(0);
      expect(stats.successCount).toBe(0);
      expect(stats.lastFailureTime).toBeUndefined();
      expect(stats.lastSuccessTime).toBeUndefined();
    });
  });

  describe('force state', () => {
    it('should allow forcing circuit to OPEN state', () => {
      circuitBreaker.forceState(CircuitState.OPEN);
      expect(circuitBreaker.isOpen()).toBe(true);
    });

    it('should allow forcing circuit to HALF_OPEN state', () => {
      circuitBreaker.forceState(CircuitState.HALF_OPEN);
      expect(circuitBreaker.isHalfOpen()).toBe(true);
    });

    it('should allow forcing circuit to CLOSED state', () => {
      circuitBreaker.forceState(CircuitState.OPEN);
      circuitBreaker.forceState(CircuitState.CLOSED);
      expect(circuitBreaker.isClosed()).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle synchronous errors', async () => {
      const mockFn = jest.fn(() => {
        throw new Error('sync error');
      });

      await expect(circuitBreaker.execute(mockFn)).rejects.toThrow(
        'sync error',
      );
      expect(circuitBreaker.getStats().failureCount).toBe(1);
    });

    it('should handle non-Error rejections', async () => {
      const mockFn = jest.fn().mockRejectedValue('string error');

      await expect(circuitBreaker.execute(mockFn)).rejects.toBe('string error');
      expect(circuitBreaker.getStats().failureCount).toBe(1);
    });

    it('should handle multiple concurrent requests', async () => {
      const mockFn = jest.fn().mockResolvedValue('success');

      const promises = Array(10)
        .fill(null)
        .map(() => circuitBreaker.execute(mockFn));

      const results = await Promise.all(promises);
      expect(results).toHaveLength(10);
      expect(results.every((r) => r === 'success')).toBe(true);
      expect(circuitBreaker.getStats().totalRequests).toBe(10);
    });
  });
});
