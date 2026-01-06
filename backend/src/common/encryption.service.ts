import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

@Injectable()
export class EncryptionService implements OnModuleInit {
  private readonly logger = new Logger(EncryptionService.name);
  private readonly algorithm = 'aes-256-gcm';
  private readonly keyLength = 32; // 256 bits
  private readonly ivLength = 16; // 128 bits for GCM
  private readonly authTagLength = 16; // 128 bits
  private encryptionKey: Buffer;
  private oldEncryptionKey: Buffer | null = null; // For key rotation

  onModuleInit() {
    const key = process.env.AUDIT_LOG_ENCRYPTION_KEY;

    if (!key) {
      throw new Error(
        'AUDIT_LOG_ENCRYPTION_KEY environment variable is required. ' +
          "Generate with: node -e \"console.log(require('crypto').randomBytes(32).toString('base64'))\"",
      );
    }

    try {
      this.encryptionKey = Buffer.from(key, 'base64');

      if (this.encryptionKey.length !== this.keyLength) {
        throw new Error(
          `Encryption key must be ${this.keyLength} bytes (256 bits). ` +
            `Provided key is ${this.encryptionKey.length} bytes.`,
        );
      }

      // Support key rotation: OLD_AUDIT_LOG_ENCRYPTION_KEY for decryption
      const oldKey = process.env.OLD_AUDIT_LOG_ENCRYPTION_KEY;
      if (oldKey) {
        try {
          this.oldEncryptionKey = Buffer.from(oldKey, 'base64');
          if (this.oldEncryptionKey.length !== this.keyLength) {
            this.logger.warn(
              `OLD_AUDIT_LOG_ENCRYPTION_KEY is invalid length (${this.oldEncryptionKey.length} bytes). Ignoring.`,
            );
            this.oldEncryptionKey = null;
          } else {
            this.logger.log('Key rotation mode enabled: OLD_AUDIT_LOG_ENCRYPTION_KEY detected');
          }
        } catch (error) {
          this.logger.warn('OLD_AUDIT_LOG_ENCRYPTION_KEY is invalid format. Ignoring.');
          this.oldEncryptionKey = null;
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(
        `Invalid AUDIT_LOG_ENCRYPTION_KEY format. Must be base64-encoded 32-byte key. ` +
          `Error: ${errorMessage}`,
      );
    }
  }

  /**
   * Encrypt plaintext using AES-256-GCM
   * @param plaintext - String to encrypt
   * @returns Base64-encoded string in format: iv:authTag:encryptedData, or null if input is empty
   */
  encrypt(plaintext: string): string | null {
    if (!plaintext) {
      return null;
    }

    // Generate random IV for each encryption
    const iv = randomBytes(this.ivLength);

    // Create cipher
    const cipher = createCipheriv(this.algorithm, this.encryptionKey, iv);

    // Encrypt
    let encrypted = cipher.update(plaintext, 'utf8', 'base64');
    encrypted += cipher.final('base64');

    // Get authentication tag
    const authTag = cipher.getAuthTag();

    // Return format: iv:authTag:encryptedData (all base64)
    return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`;
  }

  /**
   * Decrypt ciphertext encrypted with AES-256-GCM
   * Supports key rotation: tries current key first, then old key if available
   * @param ciphertext - Base64-encoded string in format: iv:authTag:encryptedData
   * @returns Decrypted plaintext string, or null if input is empty
   */
  decrypt(ciphertext: string): string | null {
    if (!ciphertext) {
      return null;
    }

    try {
      // Parse format: iv:authTag:encryptedData
      const parts = ciphertext.split(':');

      if (parts.length !== 3) {
        throw new Error('Invalid ciphertext format. Expected: iv:authTag:encryptedData');
      }

      const iv = Buffer.from(parts[0], 'base64');
      const authTag = Buffer.from(parts[1], 'base64');
      const encrypted = parts[2];

      // Try current key first
      try {
        const decipher = createDecipheriv(this.algorithm, this.encryptionKey, iv);
        decipher.setAuthTag(authTag);

        let decrypted = decipher.update(encrypted, 'base64', 'utf8');
        decrypted += decipher.final('utf8');

        return decrypted;
      } catch (currentKeyError) {
        // If current key fails and old key exists, try old key
        if (this.oldEncryptionKey) {
          try {
            const decipher = createDecipheriv(this.algorithm, this.oldEncryptionKey, iv);
            decipher.setAuthTag(authTag);

            let decrypted = decipher.update(encrypted, 'base64', 'utf8');
            decrypted += decipher.final('utf8');

            this.logger.debug('Successfully decrypted with OLD_AUDIT_LOG_ENCRYPTION_KEY');
            return decrypted;
          } catch (oldKeyError) {
            // Both keys failed
            throw currentKeyError; // Throw original error
          }
        }
        throw currentKeyError;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Decryption failed: ${errorMessage}`);
    }
  }

  /**
   * Re-encrypt data with current key (for key rotation)
   * @param ciphertext - Data encrypted with old key
   * @returns Data encrypted with current key
   */
  reEncrypt(ciphertext: string): string | null {
    if (!ciphertext) {
      return null;
    }

    // Decrypt with old key (if available) or current key
    const plaintext = this.decrypt(ciphertext);

    if (!plaintext) {
      return null;
    }

    // Re-encrypt with current key
    return this.encrypt(plaintext);
  }

  /**
   * Check if key rotation mode is active
   * @returns true if OLD_AUDIT_LOG_ENCRYPTION_KEY is configured
   */
  isKeyRotationActive(): boolean {
    return this.oldEncryptionKey !== null;
  }
}
