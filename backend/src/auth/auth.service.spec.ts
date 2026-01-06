import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma.service';
import { JwtService } from '@nestjs/jwt';
import { RedisService } from '../redis/redis.service';
import { AuthenticationException, ErrorCode } from '../common/errors';
import * as bcrypt from 'bcrypt';

// Mock bcrypt
jest.mock('bcrypt');
const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

describe('AuthService', () => {
  let service: AuthService;
  let prismaService: PrismaService;
  let jwtService: JwtService;
  let redisService: RedisService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockJwtService = {
    sign: jest.fn(),
    verify: jest.fn(),
  };

  const mockRedisService = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };

  const mockUser = {
    id: 'user-001',
    username: 'testuser',
    password: '$2b$10$hashedpassword',
    firstName: 'Test',
    lastName: 'User',
    role: 'CASHIER',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: RedisService, useValue: mockRedisService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prismaService = module.get<PrismaService>(PrismaService);
    jwtService = module.get<JwtService>(JwtService);
    redisService = module.get<RedisService>(RedisService);

    // Reset all mocks
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateUser', () => {
    it('should return user without password when credentials are valid', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockedBcrypt.compare.mockResolvedValue(true as never);

      const result = await service.validateUser('testuser', 'password123');

      expect(result).toBeDefined();
      expect(result).not.toHaveProperty('password');
      expect(result?.username).toBe('testuser');
      expect(result?.id).toBe('user-001');
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { username: 'testuser' },
      });
      expect(mockedBcrypt.compare).toHaveBeenCalledWith('password123', '$2b$10$hashedpassword');
    });

    it('should return null when user is not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      const result = await service.validateUser('nonexistent', 'password123');

      expect(result).toBeNull();
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { username: 'nonexistent' },
      });
      expect(mockedBcrypt.compare).not.toHaveBeenCalled();
    });

    it('should return null when password is incorrect', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockedBcrypt.compare.mockResolvedValue(false as never);

      const result = await service.validateUser('testuser', 'wrongpassword');

      expect(result).toBeNull();
      expect(mockedBcrypt.compare).toHaveBeenCalledWith('wrongpassword', '$2b$10$hashedpassword');
    });

    it('should handle database errors gracefully', async () => {
      mockPrismaService.user.findUnique.mockRejectedValue(new Error('Database connection error'));

      await expect(service.validateUser('testuser', 'password123')).rejects.toThrow(
        'Database connection error',
      );
    });
  });

  describe('login', () => {
    it('should return access token and user payload on successful login', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockedBcrypt.compare.mockResolvedValue(true as never);
      mockJwtService.sign.mockReturnValue('mock.jwt.token');

      const result = await service.login({
        username: 'testuser',
        password: 'password123',
      });

      expect(result).toHaveProperty('access_token', 'mock.jwt.token');
      expect(result).toHaveProperty('jti');
      expect(result).toHaveProperty('user');
      expect(result.user).toEqual({
        id: 'user-001',
        username: 'testuser',
        firstName: 'Test',
        lastName: 'User',
        role: 'CASHIER',
      });
      expect(mockJwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          username: 'testuser',
          sub: 'user-001',
          role: 'CASHIER',
          jti: expect.any(String),
        }),
      );
    });

    it('should generate unique jti for each login', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockedBcrypt.compare.mockResolvedValue(true as never);
      mockJwtService.sign.mockReturnValue('mock.jwt.token');

      const result1 = await service.login({
        username: 'testuser',
        password: 'password123',
      });
      const result2 = await service.login({
        username: 'testuser',
        password: 'password123',
      });

      expect(result1.jti).not.toBe(result2.jti);
    });

    it('should throw AuthenticationException when credentials are invalid', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        service.login({
          username: 'testuser',
          password: 'wrongpassword',
        }),
      ).rejects.toThrow(AuthenticationException);

      await expect(
        service.login({
          username: 'testuser',
          password: 'wrongpassword',
        }),
      ).rejects.toThrow(
        expect.objectContaining({
          code: ErrorCode.AUTH_INVALID_CREDENTIALS,
        }),
      );
    });

    it('should throw AuthenticationException when user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        service.login({
          username: 'nonexistent',
          password: 'password123',
        }),
      ).rejects.toThrow(AuthenticationException);
    });

    it('should include all required user fields in response', async () => {
      const userWithAllFields = {
        ...mockUser,
        firstName: 'John',
        lastName: 'Doe',
        role: 'MANAGER',
      };
      mockPrismaService.user.findUnique.mockResolvedValue(userWithAllFields);
      mockedBcrypt.compare.mockResolvedValue(true as never);
      mockJwtService.sign.mockReturnValue('mock.jwt.token');

      const result = await service.login({
        username: 'testuser',
        password: 'password123',
      });

      expect(result.user).toEqual({
        id: 'user-001',
        username: 'testuser',
        firstName: 'John',
        lastName: 'Doe',
        role: 'MANAGER',
      });
    });
  });

  describe('revokeToken', () => {
    it('should blacklist token in Redis with correct TTL', async () => {
      const user = {
        id: 'user-001',
        username: 'testuser',
        role: 'CASHIER',
        jti: 'token-jti-123',
      };

      await service.revokeToken(user);

      expect(mockRedisService.set).toHaveBeenCalledWith(
        'blacklist:token-jti-123',
        '1',
        8 * 60 * 60, // 8 hours in seconds
      );
    });

    it('should not blacklist when jti is undefined', async () => {
      const user = {
        id: 'user-001',
        username: 'testuser',
        role: 'CASHIER',
        jti: undefined,
      };

      await service.revokeToken(user);

      expect(mockRedisService.set).not.toHaveBeenCalled();
    });

    it('should handle Redis errors gracefully', async () => {
      const user = {
        id: 'user-001',
        username: 'testuser',
        role: 'CASHIER',
        jti: 'token-jti-123',
      };
      mockRedisService.set.mockRejectedValue(new Error('Redis connection error'));

      await expect(service.revokeToken(user)).rejects.toThrow('Redis connection error');
    });
  });

  describe('isTokenBlacklisted', () => {
    it('should return true when token is blacklisted', async () => {
      mockRedisService.get.mockResolvedValue('1');

      const result = await service.isTokenBlacklisted('token-jti-123');

      expect(result).toBe(true);
      expect(mockRedisService.get).toHaveBeenCalledWith('blacklist:token-jti-123');
    });

    it('should return false when token is not blacklisted', async () => {
      mockRedisService.get.mockResolvedValue(null);

      const result = await service.isTokenBlacklisted('token-jti-456');

      expect(result).toBe(false);
      expect(mockRedisService.get).toHaveBeenCalledWith('blacklist:token-jti-456');
    });

    it('should handle Redis errors gracefully', async () => {
      mockRedisService.get.mockRejectedValue(new Error('Redis connection error'));

      await expect(service.isTokenBlacklisted('token-jti-123')).rejects.toThrow(
        'Redis connection error',
      );
    });

    it('should return false for empty string jti', async () => {
      mockRedisService.get.mockResolvedValue(null);

      const result = await service.isTokenBlacklisted('');

      expect(result).toBe(false);
      expect(mockRedisService.get).toHaveBeenCalledWith('blacklist:');
    });
  });

  describe('Integration scenarios', () => {
    it('should complete full login and logout flow', async () => {
      // Reset mocks for this test
      jest.clearAllMocks();
      mockRedisService.set.mockResolvedValue(undefined);

      // Login
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockedBcrypt.compare.mockResolvedValue(true as never);
      mockJwtService.sign.mockReturnValue('mock.jwt.token');

      const loginResult = await service.login({
        username: 'testuser',
        password: 'password123',
      });

      expect(loginResult.access_token).toBe('mock.jwt.token');
      const jti = loginResult.jti;

      // Logout (revoke token)
      await service.revokeToken({
        id: 'user-001',
        username: 'testuser',
        role: 'CASHIER',
        jti,
      });

      expect(mockRedisService.set).toHaveBeenCalledWith(`blacklist:${jti}`, '1', 8 * 60 * 60);

      // Check if token is blacklisted
      mockRedisService.get.mockResolvedValue('1');
      const isBlacklisted = await service.isTokenBlacklisted(jti);
      expect(isBlacklisted).toBe(true);
    });

    it('should handle multiple concurrent login attempts', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockedBcrypt.compare.mockResolvedValue(true as never);
      mockJwtService.sign.mockReturnValue('mock.jwt.token');

      const promises = Array(5)
        .fill(null)
        .map(() =>
          service.login({
            username: 'testuser',
            password: 'password123',
          }),
        );

      const results = await Promise.all(promises);

      expect(results).toHaveLength(5);
      results.forEach((result) => {
        expect(result).toHaveProperty('access_token');
        expect(result).toHaveProperty('jti');
      });

      // All JTIs should be unique
      const jtis = results.map((r) => r.jti);
      const uniqueJtis = new Set(jtis);
      expect(uniqueJtis.size).toBe(5);
    });
  });
});
