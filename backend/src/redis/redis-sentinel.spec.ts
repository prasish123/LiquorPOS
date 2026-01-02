import { Test, TestingModule } from '@nestjs/testing';
import { RedisService } from './redis.service';

// Mock ioredis
const mockRedisClient = {
  connect: jest.fn().mockResolvedValue(undefined),
  disconnect: jest.fn().mockResolvedValue(undefined),
  quit: jest.fn().mockResolvedValue(undefined),
  ping: jest.fn().mockResolvedValue('PONG'),
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue('OK'),
  del: jest.fn().mockResolvedValue(1),
  keys: jest.fn().mockResolvedValue([]),
  sentinel: jest.fn().mockResolvedValue(['ip', '127.0.0.1', 'port', '6379']),
  on: jest.fn((event, handler) => {
    // Simulate successful connection
    if (event === 'connect') {
      setTimeout(() => handler(), 0);
    }
    return mockRedisClient;
  }),
};

jest.mock('ioredis', () => {
  return jest.fn(() => mockRedisClient);
});

describe('RedisService - Sentinel Mode', () => {
  let service: RedisService;

  beforeEach(async () => {
    // Clear environment variables
    delete process.env.REDIS_SENTINEL_ENABLED;
    delete process.env.REDIS_SENTINEL_MASTER_NAME;
    delete process.env.REDIS_SENTINELS;
    delete process.env.REDIS_HOST;
    delete process.env.REDIS_PORT;
    delete process.env.REDIS_PASSWORD;

    // Clear all mocks
    jest.clearAllMocks();
  });

  afterEach(async () => {
    if (service) {
      await service.onModuleDestroy();
    }
  });

  describe('Standalone Mode', () => {
    it('should initialize in standalone mode by default', async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [RedisService],
      }).compile();

      service = module.get<RedisService>(RedisService);
      await service.onModuleInit();

      expect(service.getMode()).toBe('standalone');
      const sentinelInfo = service.getSentinelInfo();
      expect(sentinelInfo).toBeNull();
    });

    it('should use custom host and port in standalone mode', async () => {
      process.env.REDIS_HOST = 'custom-host';
      process.env.REDIS_PORT = '6380';

      const module: TestingModule = await Test.createTestingModule({
        providers: [RedisService],
      }).compile();

      service = module.get<RedisService>(RedisService);
      await service.onModuleInit();

      expect(service.getMode()).toBe('standalone');
    });
  });

  describe('Sentinel Mode Detection', () => {
    it('should enable Sentinel mode when all required env vars are set', async () => {
      process.env.REDIS_SENTINEL_ENABLED = 'true';
      process.env.REDIS_SENTINEL_MASTER_NAME = 'mymaster';
      process.env.REDIS_SENTINELS =
        'sentinel1:26379,sentinel2:26379,sentinel3:26379';

      const module: TestingModule = await Test.createTestingModule({
        providers: [RedisService],
      }).compile();

      service = module.get<RedisService>(RedisService);
      await service.onModuleInit();

      expect(service.getMode()).toBe('sentinel');
      const sentinelInfo = service.getSentinelInfo();
      expect(sentinelInfo).not.toBeNull();
      expect(sentinelInfo?.enabled).toBe(true);
      expect(sentinelInfo?.masterName).toBe('mymaster');
      expect(sentinelInfo?.sentinels).toHaveLength(3);
    });

    it('should fall back to standalone if Sentinel is enabled but sentinels not configured', async () => {
      process.env.REDIS_SENTINEL_ENABLED = 'true';
      process.env.REDIS_SENTINEL_MASTER_NAME = 'mymaster';
      // Missing REDIS_SENTINELS

      const module: TestingModule = await Test.createTestingModule({
        providers: [RedisService],
      }).compile();

      service = module.get<RedisService>(RedisService);
      await service.onModuleInit();

      expect(service.getMode()).toBe('standalone');
    });

    it('should fall back to standalone if less than 3 sentinels configured', async () => {
      process.env.REDIS_SENTINEL_ENABLED = 'true';
      process.env.REDIS_SENTINEL_MASTER_NAME = 'mymaster';
      process.env.REDIS_SENTINELS = 'sentinel1:26379,sentinel2:26379'; // Only 2

      const module: TestingModule = await Test.createTestingModule({
        providers: [RedisService],
      }).compile();

      service = module.get<RedisService>(RedisService);
      await service.onModuleInit();

      // Should fall back to standalone
      expect(service.getMode()).toBe('standalone');
    });
  });

  describe('Sentinel Configuration', () => {
    it('should parse sentinel nodes correctly', async () => {
      process.env.REDIS_SENTINEL_ENABLED = 'true';
      process.env.REDIS_SENTINEL_MASTER_NAME = 'mymaster';
      process.env.REDIS_SENTINELS =
        'sentinel1:26379,sentinel2:26380,sentinel3:26381';

      const module: TestingModule = await Test.createTestingModule({
        providers: [RedisService],
      }).compile();

      service = module.get<RedisService>(RedisService);
      await service.onModuleInit();

      const sentinelInfo = service.getSentinelInfo();
      expect(sentinelInfo?.sentinels).toEqual([
        { host: 'sentinel1', port: 26379 },
        { host: 'sentinel2', port: 26380 },
        { host: 'sentinel3', port: 26381 },
      ]);
    });

    it('should handle whitespace in sentinel configuration', async () => {
      process.env.REDIS_SENTINEL_ENABLED = 'true';
      process.env.REDIS_SENTINEL_MASTER_NAME = 'mymaster';
      process.env.REDIS_SENTINELS =
        ' sentinel1:26379 , sentinel2:26379 , sentinel3:26379 ';

      const module: TestingModule = await Test.createTestingModule({
        providers: [RedisService],
      }).compile();

      service = module.get<RedisService>(RedisService);
      await service.onModuleInit();

      const sentinelInfo = service.getSentinelInfo();
      expect(sentinelInfo?.sentinels).toHaveLength(3);
      expect(sentinelInfo?.sentinels?.[0].host).toBe('sentinel1');
    });
  });

  describe('Health Status', () => {
    it('should include Sentinel info in health status when in Sentinel mode', async () => {
      process.env.REDIS_SENTINEL_ENABLED = 'true';
      process.env.REDIS_SENTINEL_MASTER_NAME = 'mymaster';
      process.env.REDIS_SENTINELS =
        'sentinel1:26379,sentinel2:26379,sentinel3:26379';

      const module: TestingModule = await Test.createTestingModule({
        providers: [RedisService],
      }).compile();

      service = module.get<RedisService>(RedisService);
      await service.onModuleInit();

      const health = await service.getHealthStatus();
      expect(health.mode).toBe('sentinel');
      expect(health.sentinel).toBeDefined();
      expect(health.sentinel?.enabled).toBe(true);
      expect(health.sentinel?.masterName).toBe('mymaster');
    });

    it('should not include Sentinel info in standalone mode', async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [RedisService],
      }).compile();

      service = module.get<RedisService>(RedisService);
      await service.onModuleInit();

      const health = await service.getHealthStatus();
      expect(health.mode).toBe('standalone');
      expect(health.sentinel).toBeUndefined();
    });
  });

  describe('Failover Tracking', () => {
    it('should initialize failover count to 0', async () => {
      process.env.REDIS_SENTINEL_ENABLED = 'true';
      process.env.REDIS_SENTINEL_MASTER_NAME = 'mymaster';
      process.env.REDIS_SENTINELS =
        'sentinel1:26379,sentinel2:26379,sentinel3:26379';

      const module: TestingModule = await Test.createTestingModule({
        providers: [RedisService],
      }).compile();

      service = module.get<RedisService>(RedisService);
      await service.onModuleInit();

      const sentinelInfo = service.getSentinelInfo();
      expect(sentinelInfo?.failoverCount).toBe(0);
      expect(sentinelInfo?.lastFailover).toBeUndefined();
    });
  });

  describe('Mode Verification', () => {
    it('should initialize in Sentinel mode with correct configuration', async () => {
      process.env.REDIS_SENTINEL_ENABLED = 'true';
      process.env.REDIS_SENTINEL_MASTER_NAME = 'mymaster';
      process.env.REDIS_SENTINELS =
        'sentinel1:26379,sentinel2:26379,sentinel3:26379';

      const module: TestingModule = await Test.createTestingModule({
        providers: [RedisService],
      }).compile();

      service = module.get<RedisService>(RedisService);
      await service.onModuleInit();

      // Verify Sentinel mode is active
      expect(service.getMode()).toBe('sentinel');

      // Verify Sentinel info is populated
      const sentinelInfo = service.getSentinelInfo();
      expect(sentinelInfo).not.toBeNull();
      expect(sentinelInfo?.enabled).toBe(true);
      expect(sentinelInfo?.masterName).toBe('mymaster');
      expect(sentinelInfo?.sentinels).toHaveLength(3);
      expect(sentinelInfo?.failoverCount).toBe(0);
    });

    it('should initialize in standalone mode without Sentinel config', async () => {
      process.env.REDIS_HOST = 'localhost';
      process.env.REDIS_PORT = '6379';

      const module: TestingModule = await Test.createTestingModule({
        providers: [RedisService],
      }).compile();

      service = module.get<RedisService>(RedisService);
      await service.onModuleInit();

      // Verify standalone mode is active
      expect(service.getMode()).toBe('standalone');

      // Verify Sentinel info is null
      const sentinelInfo = service.getSentinelInfo();
      expect(sentinelInfo).toBeNull();
    });
  });
});
