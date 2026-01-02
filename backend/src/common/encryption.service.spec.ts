import { Test, TestingModule } from '@nestjs/testing';
import { EncryptionService } from './encryption.service';
import { randomBytes } from 'crypto';

describe('EncryptionService', () => {
  let service: EncryptionService;
  const validKey = randomBytes(32).toString('base64');
  const oldKey = randomBytes(32).toString('base64');

  beforeEach(async () => {
    // Clear environment
    delete process.env.AUDIT_LOG_ENCRYPTION_KEY;
    delete process.env.OLD_AUDIT_LOG_ENCRYPTION_KEY;
  });

  describe('onModuleInit', () => {
    it('should throw error if AUDIT_LOG_ENCRYPTION_KEY is missing', () => {
      const service = new EncryptionService();
      expect(() => service.onModuleInit()).toThrow(
        'AUDIT_LOG_ENCRYPTION_KEY environment variable is required',
      );
    });

    it('should throw error if key is not base64', () => {
      process.env.AUDIT_LOG_ENCRYPTION_KEY = 'not-base64!!!';
      const service = new EncryptionService();
      expect(() => service.onModuleInit()).toThrow(
        'Invalid AUDIT_LOG_ENCRYPTION_KEY format',
      );
    });

    it('should throw error if key is wrong length', () => {
      process.env.AUDIT_LOG_ENCRYPTION_KEY = randomBytes(16).toString('base64'); // 16 bytes instead of 32
      const service = new EncryptionService();
      expect(() => service.onModuleInit()).toThrow(
        'Encryption key must be 32 bytes',
      );
    });

    it('should initialize successfully with valid key', () => {
      process.env.AUDIT_LOG_ENCRYPTION_KEY = validKey;
      const service = new EncryptionService();
      expect(() => service.onModuleInit()).not.toThrow();
    });

    it('should load OLD_AUDIT_LOG_ENCRYPTION_KEY if provided', () => {
      process.env.AUDIT_LOG_ENCRYPTION_KEY = validKey;
      process.env.OLD_AUDIT_LOG_ENCRYPTION_KEY = oldKey;
      const service = new EncryptionService();
      service.onModuleInit();
      expect(service.isKeyRotationActive()).toBe(true);
    });

    it('should ignore invalid OLD_AUDIT_LOG_ENCRYPTION_KEY', () => {
      process.env.AUDIT_LOG_ENCRYPTION_KEY = validKey;
      process.env.OLD_AUDIT_LOG_ENCRYPTION_KEY = 'invalid';
      const service = new EncryptionService();
      service.onModuleInit();
      expect(service.isKeyRotationActive()).toBe(false);
    });
  });

  describe('encrypt and decrypt', () => {
    beforeEach(() => {
      process.env.AUDIT_LOG_ENCRYPTION_KEY = validKey;
      service = new EncryptionService();
      service.onModuleInit();
    });

    it('should encrypt and decrypt plaintext', () => {
      const plaintext = 'sensitive data';
      const encrypted = service.encrypt(plaintext);
      expect(encrypted).toBeTruthy();
      expect(encrypted).not.toBe(plaintext);

      const decrypted = service.decrypt(encrypted!);
      expect(decrypted).toBe(plaintext);
    });

    it('should return null for empty plaintext', () => {
      expect(service.encrypt('')).toBeNull();
      expect(service.encrypt(null as any)).toBeNull();
    });

    it('should return null for empty ciphertext', () => {
      expect(service.decrypt('')).toBeNull();
      expect(service.decrypt(null as any)).toBeNull();
    });

    it('should produce different ciphertext for same plaintext (random IV)', () => {
      const plaintext = 'sensitive data';
      const encrypted1 = service.encrypt(plaintext);
      const encrypted2 = service.encrypt(plaintext);
      expect(encrypted1).not.toBe(encrypted2);

      // Both should decrypt to same plaintext
      expect(service.decrypt(encrypted1!)).toBe(plaintext);
      expect(service.decrypt(encrypted2!)).toBe(plaintext);
    });

    it('should throw error for invalid ciphertext format', () => {
      expect(() => service.decrypt('invalid')).toThrow(
        'Invalid ciphertext format',
      );
    });

    it('should throw error for corrupted ciphertext', () => {
      const plaintext = 'sensitive data';
      const encrypted = service.encrypt(plaintext)!;
      const corrupted = encrypted.replace(/[a-z]/g, 'x');
      expect(() => service.decrypt(corrupted)).toThrow('Decryption failed');
    });

    it('should handle special characters and unicode', () => {
      const plaintext = '🔐 Special: @#$%^&*() Unicode: 你好世界';
      const encrypted = service.encrypt(plaintext);
      const decrypted = service.decrypt(encrypted!);
      expect(decrypted).toBe(plaintext);
    });

    it('should handle long text', () => {
      const plaintext = 'A'.repeat(10000);
      const encrypted = service.encrypt(plaintext);
      const decrypted = service.decrypt(encrypted!);
      expect(decrypted).toBe(plaintext);
    });

    it('should handle JSON data', () => {
      const data = {
        customerId: 'cust_123',
        ageVerified: true,
        verifiedBy: 'John Doe',
        timestamp: new Date().toISOString(),
      };
      const plaintext = JSON.stringify(data);
      const encrypted = service.encrypt(plaintext);
      const decrypted = service.decrypt(encrypted!);
      expect(JSON.parse(decrypted!)).toEqual(data);
    });
  });

  describe('key rotation', () => {
    let serviceWithOldKey: EncryptionService;
    let serviceWithNewKey: EncryptionService;
    let serviceWithBothKeys: EncryptionService;

    beforeEach(() => {
      // Service with old key only
      process.env.AUDIT_LOG_ENCRYPTION_KEY = oldKey;
      delete process.env.OLD_AUDIT_LOG_ENCRYPTION_KEY;
      serviceWithOldKey = new EncryptionService();
      serviceWithOldKey.onModuleInit();

      // Service with new key only
      process.env.AUDIT_LOG_ENCRYPTION_KEY = validKey;
      delete process.env.OLD_AUDIT_LOG_ENCRYPTION_KEY;
      serviceWithNewKey = new EncryptionService();
      serviceWithNewKey.onModuleInit();

      // Service with both keys (rotation mode)
      process.env.AUDIT_LOG_ENCRYPTION_KEY = validKey;
      process.env.OLD_AUDIT_LOG_ENCRYPTION_KEY = oldKey;
      serviceWithBothKeys = new EncryptionService();
      serviceWithBothKeys.onModuleInit();
    });

    it('should detect key rotation mode', () => {
      expect(serviceWithOldKey.isKeyRotationActive()).toBe(false);
      expect(serviceWithNewKey.isKeyRotationActive()).toBe(false);
      expect(serviceWithBothKeys.isKeyRotationActive()).toBe(true);
    });

    it('should decrypt data encrypted with old key using rotation mode', () => {
      const plaintext = 'sensitive data';

      // Encrypt with old key
      const encryptedWithOldKey = serviceWithOldKey.encrypt(plaintext)!;

      // Should fail to decrypt with new key only
      expect(() => serviceWithNewKey.decrypt(encryptedWithOldKey)).toThrow();

      // Should succeed with rotation mode (both keys)
      const decrypted = serviceWithBothKeys.decrypt(encryptedWithOldKey);
      expect(decrypted).toBe(plaintext);
    });

    it('should decrypt data encrypted with new key using rotation mode', () => {
      const plaintext = 'sensitive data';

      // Encrypt with new key
      const encryptedWithNewKey = serviceWithNewKey.encrypt(plaintext)!;

      // Should succeed with rotation mode
      const decrypted = serviceWithBothKeys.decrypt(encryptedWithNewKey);
      expect(decrypted).toBe(plaintext);
    });

    it('should re-encrypt data from old key to new key', () => {
      const plaintext = 'sensitive data';

      // Encrypt with old key
      const encryptedWithOldKey = serviceWithOldKey.encrypt(plaintext)!;

      // Re-encrypt with rotation service
      const reEncrypted = serviceWithBothKeys.reEncrypt(encryptedWithOldKey)!;

      // Should be different ciphertext
      expect(reEncrypted).not.toBe(encryptedWithOldKey);

      // Should decrypt with new key only
      const decrypted = serviceWithNewKey.decrypt(reEncrypted);
      expect(decrypted).toBe(plaintext);

      // Old service should NOT be able to decrypt re-encrypted data
      expect(() => serviceWithOldKey.decrypt(reEncrypted)).toThrow();
    });

    it('should handle re-encryption of null/empty data', () => {
      expect(serviceWithBothKeys.reEncrypt('')).toBeNull();
      expect(serviceWithBothKeys.reEncrypt(null as any)).toBeNull();
    });

    it('should re-encrypt multiple entries', () => {
      const entries = [
        'entry 1',
        'entry 2',
        'entry 3',
        JSON.stringify({ id: 1, data: 'test' }),
      ];

      // Encrypt all with old key
      const encryptedEntries = entries.map(
        (e) => serviceWithOldKey.encrypt(e)!,
      );

      // Re-encrypt all with rotation service
      const reEncryptedEntries = encryptedEntries.map((e) =>
        serviceWithBothKeys.reEncrypt(e),
      );

      // Verify all can be decrypted with new key only
      reEncryptedEntries.forEach((encrypted, index) => {
        const decrypted = serviceWithNewKey.decrypt(encrypted!);
        expect(decrypted).toBe(entries[index]);
      });
    });
  });

  describe('error handling', () => {
    beforeEach(() => {
      process.env.AUDIT_LOG_ENCRYPTION_KEY = validKey;
      service = new EncryptionService();
      service.onModuleInit();
    });

    it('should throw descriptive error for tampered auth tag', () => {
      const plaintext = 'sensitive data';
      const encrypted = service.encrypt(plaintext)!;

      // Tamper with auth tag (second part)
      const parts = encrypted.split(':');
      parts[1] = randomBytes(16).toString('base64');
      const tampered = parts.join(':');

      expect(() => service.decrypt(tampered)).toThrow('Decryption failed');
    });

    it('should throw descriptive error for wrong key', () => {
      const plaintext = 'sensitive data';
      const encrypted = service.encrypt(plaintext)!;

      // Create new service with different key
      process.env.AUDIT_LOG_ENCRYPTION_KEY = randomBytes(32).toString('base64');
      const wrongKeyService = new EncryptionService();
      wrongKeyService.onModuleInit();

      expect(() => wrongKeyService.decrypt(encrypted)).toThrow(
        'Decryption failed',
      );
    });

    it('should throw error for malformed ciphertext (missing parts)', () => {
      expect(() => service.decrypt('onlyonepart')).toThrow(
        'Invalid ciphertext format',
      );
      expect(() => service.decrypt('two:parts')).toThrow(
        'Invalid ciphertext format',
      );
    });

    it('should throw error for invalid base64 in ciphertext', () => {
      expect(() => service.decrypt('invalid!!!:base64!!!:data!!!')).toThrow();
    });
  });

  describe('security properties', () => {
    beforeEach(() => {
      process.env.AUDIT_LOG_ENCRYPTION_KEY = validKey;
      service = new EncryptionService();
      service.onModuleInit();
    });

    it('should use AES-256-GCM algorithm', () => {
      // Verify by checking ciphertext format (iv:authTag:encrypted)
      const encrypted = service.encrypt('test')!;
      const parts = encrypted.split(':');
      expect(parts.length).toBe(3);

      // Verify IV length (16 bytes = 24 base64 chars)
      const ivBuffer = Buffer.from(parts[0], 'base64');
      expect(ivBuffer.length).toBe(16);

      // Verify auth tag length (16 bytes = 24 base64 chars)
      const authTagBuffer = Buffer.from(parts[1], 'base64');
      expect(authTagBuffer.length).toBe(16);
    });

    it('should use unique IV for each encryption', () => {
      const plaintext = 'test';
      const encrypted1 = service.encrypt(plaintext)!;
      const encrypted2 = service.encrypt(plaintext)!;

      const iv1 = encrypted1.split(':')[0];
      const iv2 = encrypted2.split(':')[0];

      expect(iv1).not.toBe(iv2);
    });

    it('should provide authenticated encryption (detect tampering)', () => {
      const plaintext = 'sensitive data';
      const encrypted = service.encrypt(plaintext)!;

      // Tamper with encrypted data (third part)
      const parts = encrypted.split(':');
      const encryptedData = Buffer.from(parts[2], 'base64');
      encryptedData[0] ^= 0xff; // Flip bits
      parts[2] = encryptedData.toString('base64');
      const tampered = parts.join(':');

      // Should fail authentication
      expect(() => service.decrypt(tampered)).toThrow();
    });
  });
});
