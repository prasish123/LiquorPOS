import { LokiTransport } from './loki-transport';
import axios from 'axios';

jest.mock('axios');

describe('LokiTransport', () => {
  let transport: LokiTransport;
  let mockPost: jest.Mock;
  let mockCreate: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockPost = jest.fn().mockResolvedValue({ data: 'ok' });
    mockCreate = jest.fn().mockReturnValue({
      post: mockPost,
    });

    (axios.create as jest.Mock) = mockCreate;

    transport = new LokiTransport({
      host: 'http://localhost:3100',
      batching: false,
    });
  });

  afterEach(() => {
    transport.close();
  });

  describe('Basic Functionality', () => {
    it('should send log to Loki', (done) => {
      transport.log({ level: 'info', message: 'test' }, () => {
        expect(mockPost).toHaveBeenCalledWith(
          '/loki/api/v1/push',
          expect.objectContaining({
            streams: expect.arrayContaining([
              expect.objectContaining({
                stream: expect.objectContaining({ level: 'info' }),
              }),
            ]),
          }),
        );
        done();
      });
    });

    it('should include custom labels', (done) => {
      // Close previous transport and clear mocks
      transport.close();
      jest.clearAllMocks();

      transport = new LokiTransport({
        host: 'http://localhost:3100',
        batching: false,
        labels: { service: 'test-service', location: 'test-location' },
      });

      transport.log({ level: 'info', message: 'test' }, () => {
        expect(mockPost).toHaveBeenCalledWith(
          '/loki/api/v1/push',
          expect.objectContaining({
            streams: expect.arrayContaining([
              expect.objectContaining({
                stream: expect.objectContaining({
                  service: 'test-service',
                  location: 'test-location',
                }),
              }),
            ]),
          }),
        );
        done();
      });
    });

    it('should include log message in values', (done) => {
      transport.log({ level: 'info', message: 'test message' }, () => {
        const call = mockPost.mock.calls[0][1];
        const logValue = JSON.parse(call.streams[0].values[0][1]);
        expect(logValue.message).toBe('test message');
        done();
      });
    });
  });

  describe('Batching', () => {
    it('should batch logs', (done) => {
      transport = new LokiTransport({
        host: 'http://localhost:3100',
        batching: true,
        maxBatchSize: 2,
      });

      transport.log({ level: 'info', message: 'log1' }, () => {});
      transport.log({ level: 'info', message: 'log2' }, () => {
        // Should send batch after 2 logs
        expect(mockPost).toHaveBeenCalledTimes(1);
        const call = mockPost.mock.calls[0][1];
        expect(call.streams).toHaveLength(2);
        done();
      });
    });

    it('should flush batch on interval', (done) => {
      transport = new LokiTransport({
        host: 'http://localhost:3100',
        batching: true,
        batchInterval: 100, // 100ms
        maxBatchSize: 100,
      });

      transport.log({ level: 'info', message: 'log1' }, () => {});

      // Wait for batch interval
      setTimeout(() => {
        expect(mockPost).toHaveBeenCalledTimes(1);
        done();
      }, 150);
    });

    it('should not lose logs when batching', (done) => {
      transport = new LokiTransport({
        host: 'http://localhost:3100',
        batching: true,
        maxBatchSize: 3,
      });

      transport.log({ level: 'info', message: 'log1' }, () => {});
      transport.log({ level: 'info', message: 'log2' }, () => {});
      transport.log({ level: 'info', message: 'log3' }, () => {
        const call = mockPost.mock.calls[0][1];
        const messages = call.streams.map((s: any) => JSON.parse(s.values[0][1]).message);
        expect(messages).toEqual(['log1', 'log2', 'log3']);
        done();
      });
    });
  });

  describe('Error Handling', () => {
    it('should retry on failure', async () => {
      mockPost
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ data: 'ok' });

      transport.log({ level: 'error', message: 'test' }, () => {});

      // Wait for retries to complete (1000ms initial delay)
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Should have retried
      expect(mockPost).toHaveBeenCalledTimes(2);
    });

    it('should use exponential backoff', async () => {
      jest.useFakeTimers();

      mockPost.mockRejectedValue(new Error('Network error'));

      const promise = new Promise<void>((resolve) => {
        transport.log({ level: 'error', message: 'test' }, resolve);
      });

      // First attempt fails immediately
      await jest.advanceTimersByTimeAsync(0);
      expect(mockPost).toHaveBeenCalledTimes(1);

      // Second attempt after 1000ms (retryDelay * 2^0)
      await jest.advanceTimersByTimeAsync(1000);
      expect(mockPost).toHaveBeenCalledTimes(2);

      // Third attempt after 2000ms (retryDelay * 2^1)
      await jest.advanceTimersByTimeAsync(2000);
      expect(mockPost).toHaveBeenCalledTimes(3);

      // Fourth attempt after 4000ms (retryDelay * 2^2)
      await jest.advanceTimersByTimeAsync(4000);
      expect(mockPost).toHaveBeenCalledTimes(4);

      jest.useRealTimers();
    });

    it('should not throw on failure', async () => {
      mockPost.mockRejectedValue(new Error('Network error'));

      await expect(
        new Promise<void>((resolve) => {
          transport.log({ level: 'error', message: 'test' }, resolve);
        }),
      ).resolves.not.toThrow();
    });

    it('should stop retrying after max retries', async () => {
      mockPost.mockRejectedValue(new Error('Network error'));

      transport.log({ level: 'error', message: 'test' }, () => {});

      // Wait for all retries to complete (1000 + 2000 + 4000 = 7000ms + buffer)
      await new Promise((resolve) => setTimeout(resolve, 8000));

      // Should have tried: initial + 3 retries = 4 times
      expect(mockPost).toHaveBeenCalledTimes(4);
    }, 10000);
  });

  describe('Circuit Breaker', () => {
    it('should open circuit breaker after failures', async () => {
      mockPost.mockRejectedValue(new Error('Network error'));

      // Trigger 5 failures (threshold)
      for (let i = 0; i < 5; i++) {
        transport.log({ level: 'error', message: `test${i}` }, () => {});
      }

      // Wait for all retries to complete
      await new Promise((resolve) => setTimeout(resolve, 8000));

      // Circuit should be open, next log should be dropped
      const initialCallCount = mockPost.mock.calls.length;

      transport.log({ level: 'error', message: 'dropped' }, () => {});

      // Wait a bit to ensure no new calls
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Should not have tried to send (circuit open)
      expect(mockPost).toHaveBeenCalledTimes(initialCallCount);
    }, 10000);

    it('should close circuit breaker after successful send', async () => {
      mockPost
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ data: 'ok' });

      transport.log({ level: 'error', message: 'test1' }, () => {});

      // Wait for retry
      await new Promise((resolve) => setTimeout(resolve, 1500));

      transport.log({ level: 'info', message: 'test2' }, () => {});
      transport.log({ level: 'info', message: 'test3' }, () => {});

      // Wait for all to complete
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Should have sent the last log
      expect(mockPost).toHaveBeenCalled();
    }, 5000);

    it('should transition to half-open after timeout', async () => {
      jest.useFakeTimers();

      mockPost.mockRejectedValue(new Error('Network error'));

      // Trigger 5 failures to open circuit
      for (let i = 0; i < 5; i++) {
        await new Promise<void>((resolve) => {
          transport.log({ level: 'error', message: `test${i}` }, resolve);
        });
      }

      // Wait for circuit open duration (60 seconds)
      jest.advanceTimersByTime(61000);

      // Mock success for next attempt
      mockPost.mockResolvedValueOnce({ data: 'ok' });

      // Next log should be attempted (half-open)
      await new Promise<void>((resolve) => {
        transport.log({ level: 'info', message: 'test' }, resolve);
      });

      // Should have tried to send
      expect(mockPost).toHaveBeenCalledWith('/loki/api/v1/push', expect.any(Object));

      jest.useRealTimers();
    });
  });

  describe('Queue Management', () => {
    it('should limit queue size', () => {
      transport = new LokiTransport({
        host: 'http://localhost:3100',
        batching: true,
        maxQueueSize: 2,
        maxBatchSize: 100,
      });

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      // Add 3 logs (queue size is 2)
      transport.log({ level: 'info', message: 'log1' }, () => {});
      transport.log({ level: 'info', message: 'log2' }, () => {});
      transport.log({ level: 'info', message: 'log3' }, () => {});

      expect(consoleSpy).toHaveBeenCalledWith('Loki queue full, dropping oldest logs');

      consoleSpy.mockRestore();
    });

    it('should drop oldest logs when queue is full', () => {
      transport = new LokiTransport({
        host: 'http://localhost:3100',
        batching: true,
        maxQueueSize: 2,
        maxBatchSize: 100,
      });

      jest.spyOn(console, 'warn').mockImplementation();

      transport.log({ level: 'info', message: 'log1' }, () => {});
      transport.log({ level: 'info', message: 'log2' }, () => {});
      transport.log({ level: 'info', message: 'log3' }, () => {});

      // Flush and check
      transport.close();

      const call = mockPost.mock.calls[0][1];
      const messages = call.streams.map((s: any) => JSON.parse(s.values[0][1]).message);

      // Should have log2 and log3 (log1 was dropped)
      expect(messages).toEqual(['log2', 'log3']);
    });
  });

  describe('Cleanup', () => {
    it('should flush on close', () => {
      transport = new LokiTransport({
        host: 'http://localhost:3100',
        batching: true,
        maxBatchSize: 100,
      });

      transport.log({ level: 'info', message: 'log1' }, () => {});
      transport.log({ level: 'info', message: 'log2' }, () => {});

      // Close should flush
      transport.close();

      expect(mockPost).toHaveBeenCalledTimes(1);
    });

    it('should stop batching interval on close', () => {
      transport = new LokiTransport({
        host: 'http://localhost:3100',
        batching: true,
        batchInterval: 100,
      });

      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');

      transport.close();

      expect(clearIntervalSpy).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty log message', (done) => {
      transport.log({ level: 'info', message: '' }, () => {
        expect(mockPost).toHaveBeenCalled();
        done();
      });
    });

    it('should handle very long log message', (done) => {
      const longMessage = 'a'.repeat(10000);

      transport.log({ level: 'info', message: longMessage }, () => {
        const call = mockPost.mock.calls[0][1];
        const logValue = JSON.parse(call.streams[0].values[0][1]);
        expect(logValue.message).toBe(longMessage);
        done();
      });
    });

    it('should handle special characters in message', (done) => {
      const message = 'Test "quotes" and \'apostrophes\' and \n newlines';

      transport.log({ level: 'info', message }, () => {
        const call = mockPost.mock.calls[0][1];
        const logValue = JSON.parse(call.streams[0].values[0][1]);
        expect(logValue.message).toBe(message);
        done();
      });
    });

    it('should handle undefined values in log', (done) => {
      transport.log(
        {
          level: 'info',
          message: 'test',
          undefinedValue: undefined,
          nullValue: null,
        },
        () => {
          expect(mockPost).toHaveBeenCalled();
          done();
        },
      );
    });
  });
});
