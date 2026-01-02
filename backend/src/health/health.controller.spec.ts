import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import {
  HealthCheckService,
  PrismaHealthIndicator,
  MemoryHealthIndicator,
  DiskHealthIndicator,
} from '@nestjs/terminus';
import { RedisHealthIndicator } from './redis-health.indicator';
import { ConexxusHealthIndicator } from './conexxus-health.indicator';
import { EncryptionHealthIndicator } from './encryption-health.indicator';
import { PrismaService } from '../prisma.service';

describe('HealthController', () => {
  let controller: HealthController;
  let healthCheckService: HealthCheckService;
  let prismaHealth: PrismaHealthIndicator;
  let redisHealth: RedisHealthIndicator;
  let conexxusHealth: ConexxusHealthIndicator;
  let encryptionHealth: EncryptionHealthIndicator;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: HealthCheckService,
          useValue: {
            check: jest.fn(),
          },
        },
        {
          provide: PrismaHealthIndicator,
          useValue: {
            pingCheck: jest.fn(),
          },
        },
        {
          provide: RedisHealthIndicator,
          useValue: {
            isHealthy: jest.fn(),
          },
        },
        {
          provide: ConexxusHealthIndicator,
          useValue: {
            isHealthy: jest.fn(),
          },
        },
        {
          provide: EncryptionHealthIndicator,
          useValue: {
            isHealthy: jest.fn(),
          },
        },
        {
          provide: MemoryHealthIndicator,
          useValue: {
            checkHeap: jest.fn(),
          },
        },
        {
          provide: DiskHealthIndicator,
          useValue: {
            checkStorage: jest.fn(),
          },
        },
        {
          provide: PrismaService,
          useValue: {},
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
    healthCheckService = module.get<HealthCheckService>(HealthCheckService);
    prismaHealth = module.get<PrismaHealthIndicator>(PrismaHealthIndicator);
    redisHealth = module.get<RedisHealthIndicator>(RedisHealthIndicator);
    conexxusHealth = module.get<ConexxusHealthIndicator>(
      ConexxusHealthIndicator,
    );
    encryptionHealth = module.get<EncryptionHealthIndicator>(
      EncryptionHealthIndicator,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('check()', () => {
    it('should return healthy status when all checks pass', async () => {
      const mockResult = {
        status: 'ok',
        info: {
          database: { status: 'up' },
          cache: { status: 'up' },
          encryption: { status: 'up' },
          conexxus: { status: 'up' },
        },
        error: {},
        details: {},
      };

      jest
        .spyOn(healthCheckService, 'check')
        .mockResolvedValue(mockResult as any);

      const result = await controller.check();

      expect(result.status).toBe('ok');
      expect(healthCheckService.check).toHaveBeenCalled();
    });

    it('should handle Redis failure gracefully', async () => {
      jest
        .spyOn(redisHealth, 'isHealthy')
        .mockRejectedValue(new Error('Redis down'));

      const mockResult = {
        status: 'ok',
        info: {
          database: { status: 'up' },
          cache: { status: 'degraded' },
        },
        error: {},
        details: {},
      };

      jest
        .spyOn(healthCheckService, 'check')
        .mockResolvedValue(mockResult as any);

      const result = await controller.check();

      expect(result.status).toBe('ok');
    });

    it('should handle Conexxus failure gracefully', async () => {
      jest
        .spyOn(conexxusHealth, 'isHealthy')
        .mockRejectedValue(new Error('Conexxus down'));

      const mockResult = {
        status: 'ok',
        info: {
          database: { status: 'up' },
          conexxus: { status: 'degraded' },
        },
        error: {},
        details: {},
      };

      jest
        .spyOn(healthCheckService, 'check')
        .mockResolvedValue(mockResult as any);

      const result = await controller.check();

      expect(result.status).toBe('ok');
    });
  });

  describe('checkLiveness()', () => {
    it('should return healthy status for liveness probe', async () => {
      const mockResult = {
        status: 'ok',
        info: {
          app: {
            status: 'up',
            message: 'Application is running',
          },
        },
        error: {},
        details: {},
      };

      jest
        .spyOn(healthCheckService, 'check')
        .mockResolvedValue(mockResult as any);

      const result = await controller.checkLiveness();

      expect(result.status).toBe('ok');
      expect(healthCheckService.check).toHaveBeenCalled();
    });

    it('should check memory usage', async () => {
      const mockResult = {
        status: 'ok',
        info: {
          app: { status: 'up' },
          memory_heap: { status: 'up' },
        },
        error: {},
        details: {},
      };

      jest
        .spyOn(healthCheckService, 'check')
        .mockResolvedValue(mockResult as any);

      await controller.checkLiveness();

      expect(healthCheckService.check).toHaveBeenCalled();
    });
  });

  describe('checkReadiness()', () => {
    it('should return healthy status when critical services are up', async () => {
      const mockResult = {
        status: 'ok',
        info: {
          database: { status: 'up' },
          encryption: { status: 'up' },
        },
        error: {},
        details: {},
      };

      jest
        .spyOn(healthCheckService, 'check')
        .mockResolvedValue(mockResult as any);

      const result = await controller.checkReadiness();

      expect(result.status).toBe('ok');
    });

    it('should be ready even if Redis is down', async () => {
      jest
        .spyOn(redisHealth, 'isHealthy')
        .mockRejectedValue(new Error('Redis down'));

      const mockResult = {
        status: 'ok',
        info: {
          database: { status: 'up' },
          encryption: { status: 'up' },
          cache: { status: 'degraded' },
        },
        error: {},
        details: {},
      };

      jest
        .spyOn(healthCheckService, 'check')
        .mockResolvedValue(mockResult as any);

      const result = await controller.checkReadiness();

      expect(result.status).toBe('ok');
    });

    it('should be ready even if Conexxus is down', async () => {
      jest
        .spyOn(conexxusHealth, 'isHealthy')
        .mockRejectedValue(new Error('Conexxus down'));

      const mockResult = {
        status: 'ok',
        info: {
          database: { status: 'up' },
          encryption: { status: 'up' },
          conexxus: { status: 'degraded' },
        },
        error: {},
        details: {},
      };

      jest
        .spyOn(healthCheckService, 'check')
        .mockResolvedValue(mockResult as any);

      const result = await controller.checkReadiness();

      expect(result.status).toBe('ok');
    });

    it('should fail if database is down', async () => {
      jest
        .spyOn(prismaHealth, 'pingCheck')
        .mockRejectedValue(new Error('Database down'));

      const mockResult = {
        status: 'error',
        info: {},
        error: {
          database: { status: 'down' },
        },
        details: {},
      };

      jest
        .spyOn(healthCheckService, 'check')
        .mockResolvedValue(mockResult as any);

      const result = await controller.checkReadiness();

      expect(result.status).toBe('error');
    });

    it('should fail if encryption is broken', async () => {
      jest
        .spyOn(encryptionHealth, 'isHealthy')
        .mockRejectedValue(new Error('Encryption broken'));

      const mockResult = {
        status: 'error',
        info: {},
        error: {
          encryption: { status: 'down' },
        },
        details: {},
      };

      jest
        .spyOn(healthCheckService, 'check')
        .mockResolvedValue(mockResult as any);

      const result = await controller.checkReadiness();

      expect(result.status).toBe('error');
    });
  });

  describe('getDetails()', () => {
    it('should return detailed health information', async () => {
      const mockHealthResult = {
        status: 'ok',
        info: {
          database: { status: 'up' },
        },
        error: {},
        details: {},
      };

      jest
        .spyOn(controller, 'check')
        .mockResolvedValue(mockHealthResult as any);

      const result = await controller.getDetails();

      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('uptime');
      expect(result).toHaveProperty('memory');
      expect(result).toHaveProperty('environment');
    });

    it('should handle errors gracefully', async () => {
      jest
        .spyOn(controller, 'check')
        .mockRejectedValue(new Error('Health check failed'));

      const result = await controller.getDetails();

      expect(result).toHaveProperty('status', 'error');
      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('timestamp');
    });
  });
});
