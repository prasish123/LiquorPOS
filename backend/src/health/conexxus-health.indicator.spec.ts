import { Test, TestingModule } from '@nestjs/testing';
import { ConexxusHealthIndicator } from './conexxus-health.indicator';
import { ConexxusHttpClient } from '../integrations/conexxus/conexxus-http.client';
import { HealthCheckError } from '@nestjs/terminus';

describe('ConexxusHealthIndicator', () => {
  let indicator: ConexxusHealthIndicator;
  let conexxusClient: ConexxusHttpClient;

  beforeEach(async () => {
    // Mock environment variables for Conexxus configuration
    process.env.CONEXXUS_API_URL = 'https://api.test.conexxus.com';
    process.env.CONEXXUS_API_KEY = 'test-api-key';

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConexxusHealthIndicator,
        {
          provide: ConexxusHttpClient,
          useValue: {
            healthCheck: jest.fn(),
          },
        },
      ],
    }).compile();

    indicator = module.get<ConexxusHealthIndicator>(ConexxusHealthIndicator);
    conexxusClient = module.get<ConexxusHttpClient>(ConexxusHttpClient);
  });

  afterEach(() => {
    // Clean up environment variables
    delete process.env.CONEXXUS_API_URL;
    delete process.env.CONEXXUS_API_KEY;
  });

  it('should be defined', () => {
    expect(indicator).toBeDefined();
  });

  describe('isHealthy()', () => {
    it('should return disabled status when Conexxus is not configured', async () => {
      // Remove environment variables to simulate not configured
      delete process.env.CONEXXUS_API_URL;
      delete process.env.CONEXXUS_API_KEY;

      const result = await indicator.isHealthy('conexxus');

      expect(result).toEqual({
        conexxus: {
          status: 'disabled',
          message: 'Conexxus integration not configured (optional)',
        },
      });

      // Restore for other tests
      process.env.CONEXXUS_API_URL = 'https://api.test.conexxus.com';
      process.env.CONEXXUS_API_KEY = 'test-api-key';
    });

    it('should return healthy status when Conexxus API is reachable', async () => {
      jest.spyOn(conexxusClient, 'healthCheck').mockResolvedValue(true);

      const result = await indicator.isHealthy('conexxus');

      expect(result).toEqual({
        conexxus: {
          status: 'up',
          message: 'Conexxus API is reachable',
        },
      });
    });

    it('should throw HealthCheckError when Conexxus API is not responding', async () => {
      jest.spyOn(conexxusClient, 'healthCheck').mockResolvedValue(false);

      await expect(indicator.isHealthy('conexxus')).rejects.toThrow(
        HealthCheckError,
      );
    });

    it('should throw HealthCheckError when health check fails', async () => {
      jest
        .spyOn(conexxusClient, 'healthCheck')
        .mockRejectedValue(new Error('Connection failed'));

      await expect(indicator.isHealthy('conexxus')).rejects.toThrow(
        HealthCheckError,
      );
    });

    it('should include error message in result when check fails', async () => {
      jest
        .spyOn(conexxusClient, 'healthCheck')
        .mockRejectedValue(new Error('Timeout'));

      try {
        await indicator.isHealthy('conexxus');
        fail('Should have thrown HealthCheckError');
      } catch (error) {
        expect(error).toBeInstanceOf(HealthCheckError);
        if (error instanceof HealthCheckError) {
          expect(error.causes).toMatchObject({
            conexxus: expect.objectContaining({
              status: 'down',
              message: expect.stringContaining('Timeout'),
            }),
          });
        }
      }
    });
  });
});
