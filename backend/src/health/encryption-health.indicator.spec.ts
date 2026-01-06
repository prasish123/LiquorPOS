import { Test, TestingModule } from '@nestjs/testing';
import { EncryptionHealthIndicator } from './encryption-health.indicator';
import { EncryptionService } from '../common/encryption.service';
import { HealthCheckError } from '@nestjs/terminus';

describe('EncryptionHealthIndicator', () => {
  let indicator: EncryptionHealthIndicator;
  let encryptionService: EncryptionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EncryptionHealthIndicator,
        {
          provide: EncryptionService,
          useValue: {
            encrypt: jest.fn(),
            decrypt: jest.fn(),
            isKeyRotationActive: jest.fn(),
          },
        },
      ],
    }).compile();

    indicator = module.get<EncryptionHealthIndicator>(EncryptionHealthIndicator);
    encryptionService = module.get<EncryptionService>(EncryptionService);
  });

  it('should be defined', () => {
    expect(indicator).toBeDefined();
  });

  describe('isHealthy()', () => {
    it('should return healthy status when encryption works', async () => {
      jest.spyOn(encryptionService, 'encrypt').mockReturnValue('encrypted-data');
      jest.spyOn(encryptionService, 'decrypt').mockReturnValue('health-check-test');
      jest.spyOn(encryptionService, 'isKeyRotationActive').mockReturnValue(false);

      const result = await indicator.isHealthy('encryption');

      expect(result).toEqual({
        encryption: {
          status: 'up',
          status: 'up',
          message: 'Encryption service is operational',
          keyRotationActive: false,
        },
      });
    });

    it('should include key rotation status', async () => {
      jest.spyOn(encryptionService, 'encrypt').mockReturnValue('encrypted-data');
      jest.spyOn(encryptionService, 'decrypt').mockReturnValue('health-check-test');
      jest.spyOn(encryptionService, 'isKeyRotationActive').mockReturnValue(true);

      const result = await indicator.isHealthy('encryption');

      expect(result.encryption).toMatchObject({
        keyRotationActive: true,
      });
    });

    it('should throw HealthCheckError when encryption returns null', async () => {
      jest.spyOn(encryptionService, 'encrypt').mockReturnValue(null as any);

      await expect(indicator.isHealthy('encryption')).rejects.toThrow(HealthCheckError);
    });

    it('should throw HealthCheckError when decryption fails', async () => {
      jest.spyOn(encryptionService, 'encrypt').mockReturnValue('encrypted-data');
      jest.spyOn(encryptionService, 'decrypt').mockReturnValue('wrong-data');

      await expect(indicator.isHealthy('encryption')).rejects.toThrow(HealthCheckError);
    });

    it('should throw HealthCheckError when encryption throws error', async () => {
      jest.spyOn(encryptionService, 'encrypt').mockImplementation(() => {
        throw new Error('Encryption key not found');
      });

      await expect(indicator.isHealthy('encryption')).rejects.toThrow(HealthCheckError);
    });

    it('should include error message in result when check fails', async () => {
      jest.spyOn(encryptionService, 'encrypt').mockImplementation(() => {
        throw new Error('Key missing');
      });

      try {
        await indicator.isHealthy('encryption');
        fail('Should have thrown HealthCheckError');
      } catch (error) {
        expect(error).toBeInstanceOf(HealthCheckError);
        if (error instanceof HealthCheckError) {
          expect(error.causes).toMatchObject({
            encryption: expect.objectContaining({
              status: 'down',
              message: expect.stringContaining('Key missing'),
            }),
          });
        }
      }
    });
  });
});
