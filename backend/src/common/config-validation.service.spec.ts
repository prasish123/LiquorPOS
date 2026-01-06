import { Test, TestingModule } from '@nestjs/testing';
import { ConfigValidationService } from './config-validation.service';

describe('ConfigValidationService', () => {
  let service: ConfigValidationService;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(async () => {
    // Save original environment
    originalEnv = { ...process.env };

    // Clear environment for testing
    delete process.env.AUDIT_LOG_ENCRYPTION_KEY;
    delete process.env.ALLOWED_ORIGINS;
    delete process.env.JWT_SECRET;
    delete process.env.STRIPE_SECRET_KEY;
    delete process.env.DATABASE_URL;
    delete process.env.REDIS_URL;
    delete process.env.NODE_ENV;

    const module: TestingModule = await Test.createTestingModule({
      providers: [ConfigValidationService],
    }).compile();

    service = module.get<ConfigValidationService>(ConfigValidationService);
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('AUDIT_LOG_ENCRYPTION_KEY validation', () => {
    it('should fail if AUDIT_LOG_ENCRYPTION_KEY is missing', () => {
      const result = service.validateEnvironment();

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.stringContaining('AUDIT_LOG_ENCRYPTION_KEY is required'),
      );
    });

    it('should fail if AUDIT_LOG_ENCRYPTION_KEY is not base64', () => {
      process.env.AUDIT_LOG_ENCRYPTION_KEY = 'not-base64!!!';
      process.env.ALLOWED_ORIGINS = 'http://localhost:5173'; // Avoid multiple errors

      const result = service.validateEnvironment();

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(expect.stringContaining('32 bytes'));
    });

    it('should fail if AUDIT_LOG_ENCRYPTION_KEY is wrong length', () => {
      // 16 bytes instead of 32
      process.env.AUDIT_LOG_ENCRYPTION_KEY = Buffer.from('a'.repeat(16)).toString('base64');

      const result = service.validateEnvironment();

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(expect.stringContaining('must be 32 bytes'));
    });

    it('should pass with valid AUDIT_LOG_ENCRYPTION_KEY', () => {
      process.env.AUDIT_LOG_ENCRYPTION_KEY = Buffer.from('a'.repeat(32)).toString('base64');
      process.env.ALLOWED_ORIGINS = 'http://localhost:5173';

      const result = service.validateEnvironment();

      expect(result.config.AUDIT_LOG_ENCRYPTION_KEY).toBeDefined();
    });
  });

  describe('ALLOWED_ORIGINS validation', () => {
    beforeEach(() => {
      // Set required encryption key
      process.env.AUDIT_LOG_ENCRYPTION_KEY = Buffer.from('a'.repeat(32)).toString('base64');
    });

    it('should fail if ALLOWED_ORIGINS is missing', () => {
      const result = service.validateEnvironment();

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(expect.stringContaining('ALLOWED_ORIGINS is required'));
    });

    it('should fail if ALLOWED_ORIGINS is empty string', () => {
      process.env.ALLOWED_ORIGINS = '   ';

      const result = service.validateEnvironment();

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(expect.stringContaining('ALLOWED_ORIGINS is required'));
    });

    it('should fail if ALLOWED_ORIGINS contains invalid URLs', () => {
      process.env.ALLOWED_ORIGINS = 'not-a-url,also-invalid';

      const result = service.validateEnvironment();

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(expect.stringContaining('invalid URLs'));
    });

    it('should pass with single valid origin', () => {
      process.env.ALLOWED_ORIGINS = 'http://localhost:5173';

      const result = service.validateEnvironment();

      expect(result.config.ALLOWED_ORIGINS).toBe('http://localhost:5173');
    });

    it('should pass with multiple valid origins', () => {
      process.env.ALLOWED_ORIGINS = 'http://localhost:5173,https://app.example.com';

      const result = service.validateEnvironment();

      expect(result.config.ALLOWED_ORIGINS).toBe('http://localhost:5173,https://app.example.com');
    });

    it('should handle origins with trailing/leading spaces', () => {
      process.env.ALLOWED_ORIGINS = ' http://localhost:5173 , https://app.example.com ';

      const result = service.validateEnvironment();

      expect(result.valid).toBe(true);
    });
  });

  describe('JWT_SECRET validation', () => {
    beforeEach(() => {
      // Set required variables
      process.env.AUDIT_LOG_ENCRYPTION_KEY = Buffer.from('a'.repeat(32)).toString('base64');
      process.env.ALLOWED_ORIGINS = 'http://localhost:5173';
    });

    it('should auto-generate JWT_SECRET in development if missing', () => {
      process.env.NODE_ENV = 'development';

      const result = service.validateEnvironment();

      expect(result.valid).toBe(true);
      expect(result.config.JWT_SECRET).toBeDefined();
      expect(result.config.JWT_SECRET!.length).toBeGreaterThan(32);
      expect(result.warnings).toContainEqual(expect.stringContaining('Auto-generated'));
    });

    it('should fail in production if JWT_SECRET is missing', () => {
      process.env.NODE_ENV = 'production';

      const result = service.validateEnvironment();

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.stringContaining('JWT_SECRET must be explicitly set in production'),
      );
    });

    it('should fail if JWT_SECRET is default insecure value', () => {
      process.env.JWT_SECRET = 'your-secret-key-change-in-production';

      const result = service.validateEnvironment();

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(expect.stringContaining('default insecure value'));
    });

    it('should warn if JWT_SECRET is too short', () => {
      process.env.JWT_SECRET = 'short';

      const result = service.validateEnvironment();

      expect(result.valid).toBe(true);
      expect(result.warnings).toContainEqual(expect.stringContaining('weak'));
    });

    it('should pass with strong JWT_SECRET', () => {
      process.env.JWT_SECRET = Buffer.from('a'.repeat(32)).toString('base64');

      const result = service.validateEnvironment();

      expect(result.valid).toBe(true);
      expect(result.config.JWT_SECRET).toBe(process.env.JWT_SECRET);
    });
  });

  describe('STRIPE_SECRET_KEY validation', () => {
    beforeEach(() => {
      // Set required variables
      process.env.AUDIT_LOG_ENCRYPTION_KEY = Buffer.from('a'.repeat(32)).toString('base64');
      process.env.ALLOWED_ORIGINS = 'http://localhost:5173';
    });

    it('should warn if STRIPE_SECRET_KEY is missing', () => {
      const result = service.validateEnvironment();

      expect(result.valid).toBe(true);
      expect(result.warnings).toContainEqual(
        expect.stringContaining('STRIPE_SECRET_KEY not configured'),
      );
    });

    it('should warn if STRIPE_SECRET_KEY has unexpected format', () => {
      process.env.STRIPE_SECRET_KEY = 'invalid_format';

      const result = service.validateEnvironment();

      expect(result.warnings).toContainEqual(expect.stringContaining('unexpected format'));
    });

    it('should warn if using test key in production', () => {
      process.env.NODE_ENV = 'production';
      process.env.STRIPE_SECRET_KEY = 'sk_test_123456789';
      process.env.JWT_SECRET = 'secure-secret-key-for-testing-purposes';

      const result = service.validateEnvironment();

      expect(result.warnings).toContainEqual(
        expect.stringContaining('test mode but NODE_ENV is production'),
      );
    });

    it('should pass with valid test key', () => {
      process.env.STRIPE_SECRET_KEY = 'sk_test_123456789';

      const result = service.validateEnvironment();

      expect(result.config.STRIPE_SECRET_KEY).toBe('sk_test_123456789');
    });

    it('should pass with valid live key', () => {
      process.env.STRIPE_SECRET_KEY = 'sk_live_123456789';

      const result = service.validateEnvironment();

      expect(result.config.STRIPE_SECRET_KEY).toBe('sk_live_123456789');
    });
  });

  describe('DATABASE_URL validation', () => {
    beforeEach(() => {
      // Set required variables
      process.env.AUDIT_LOG_ENCRYPTION_KEY = Buffer.from('a'.repeat(32)).toString('base64');
      process.env.ALLOWED_ORIGINS = 'http://localhost:5173';
    });

    it('should warn if DATABASE_URL is missing', () => {
      const result = service.validateEnvironment();

      expect(result.warnings).toContainEqual(expect.stringContaining('DATABASE_URL not set'));
    });

    it('should pass with DATABASE_URL set', () => {
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';

      const result = service.validateEnvironment();

      expect(result.config.DATABASE_URL).toBe('postgresql://user:pass@localhost:5432/db');
    });
  });

  describe('PORT validation', () => {
    beforeEach(() => {
      // Set required variables
      process.env.AUDIT_LOG_ENCRYPTION_KEY = Buffer.from('a'.repeat(32)).toString('base64');
      process.env.ALLOWED_ORIGINS = 'http://localhost:5173';
    });

    it('should fail if PORT is not a number', () => {
      process.env.PORT = 'not-a-number';

      const result = service.validateEnvironment();

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(expect.stringContaining('valid port number'));
    });

    it('should fail if PORT is out of range', () => {
      process.env.PORT = '99999';

      const result = service.validateEnvironment();

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(expect.stringContaining('valid port number'));
    });

    it('should pass with valid PORT', () => {
      process.env.PORT = '3000';

      const result = service.validateEnvironment();

      expect(result.config.PORT).toBe('3000');
    });
  });

  describe('validateAndThrow', () => {
    it('should throw error if validation fails', () => {
      // Missing required variables

      expect(() => service.validateAndThrow()).toThrow('Environment validation failed');
    });

    it('should return config if validation succeeds', () => {
      process.env.AUDIT_LOG_ENCRYPTION_KEY = Buffer.from('a'.repeat(32)).toString('base64');
      process.env.ALLOWED_ORIGINS = 'http://localhost:5173';
      process.env.JWT_SECRET = 'secure-secret-key-for-testing';

      const config = service.validateAndThrow();

      expect(config.AUDIT_LOG_ENCRYPTION_KEY).toBeDefined();
      expect(config.ALLOWED_ORIGINS).toBeDefined();
      expect(config.JWT_SECRET).toBeDefined();
    });
  });

  describe('Complete validation scenarios', () => {
    it('should pass with all required variables set', () => {
      process.env.AUDIT_LOG_ENCRYPTION_KEY = Buffer.from('a'.repeat(32)).toString('base64');
      process.env.ALLOWED_ORIGINS = 'http://localhost:5173';
      process.env.JWT_SECRET = 'secure-secret-key-for-testing';

      const result = service.validateEnvironment();

      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it('should collect multiple errors', () => {
      // All required variables missing

      const result = service.validateEnvironment();

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(2);
    });

    it('should collect warnings even when valid', () => {
      process.env.AUDIT_LOG_ENCRYPTION_KEY = Buffer.from('a'.repeat(32)).toString('base64');
      process.env.ALLOWED_ORIGINS = 'http://localhost:5173';
      process.env.JWT_SECRET = 'secure-secret-key-for-testing';
      // STRIPE_SECRET_KEY missing - should warn

      const result = service.validateEnvironment();

      expect(result.valid).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });
});
