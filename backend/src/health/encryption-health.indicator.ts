import { Injectable } from '@nestjs/common';
import {
  HealthIndicator,
  HealthIndicatorResult,
  HealthCheckError,
} from '@nestjs/terminus';
import { EncryptionService } from '../common/encryption.service';

/**
 * Health indicator for encryption service
 * Verifies that encryption keys are properly configured
 */
@Injectable()
export class EncryptionHealthIndicator extends HealthIndicator {
  constructor(private readonly encryptionService: EncryptionService) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      // Test encryption/decryption
      const testData = 'health-check-test';
      const encrypted = this.encryptionService.encrypt(testData);

      if (!encrypted) {
        throw new Error('Encryption returned null');
      }

      const decrypted = this.encryptionService.decrypt(encrypted);

      if (decrypted !== testData) {
        throw new Error('Decryption mismatch');
      }

      const keyRotationActive = this.encryptionService.isKeyRotationActive();

      const result = this.getStatus(key, true, {
        status: 'up',
        message: 'Encryption service is operational',
        keyRotationActive,
      });

      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const result = this.getStatus(key, false, {
        status: 'down',
        message: `Encryption check failed: ${errorMessage}`,
      });

      throw new HealthCheckError('Encryption health check failed', result);
    }
  }
}
