import { Injectable, OnModuleInit } from '@nestjs/common';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

@Injectable()
export class EncryptionService implements OnModuleInit {
    private readonly algorithm = 'aes-256-gcm';
    private readonly keyLength = 32; // 256 bits
    private readonly ivLength = 16; // 128 bits for GCM
    private readonly authTagLength = 16; // 128 bits
    private encryptionKey: Buffer;

    onModuleInit() {
        const key = process.env.AUDIT_LOG_ENCRYPTION_KEY;

        if (!key) {
            throw new Error(
                'AUDIT_LOG_ENCRYPTION_KEY environment variable is required. ' +
                'Generate with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'base64\'))"'
            );
        }

        try {
            this.encryptionKey = Buffer.from(key, 'base64');

            if (this.encryptionKey.length !== this.keyLength) {
                throw new Error(
                    `Encryption key must be ${this.keyLength} bytes (256 bits). ` +
                    `Provided key is ${this.encryptionKey.length} bytes.`
                );
            }
        } catch (error) {
            throw new Error(
                `Invalid AUDIT_LOG_ENCRYPTION_KEY format. Must be base64-encoded 32-byte key. ` +
                `Error: ${error.message}`
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

            // Create decipher
            const decipher = createDecipheriv(this.algorithm, this.encryptionKey, iv);
            decipher.setAuthTag(authTag);

            // Decrypt
            let decrypted = decipher.update(encrypted, 'base64', 'utf8');
            decrypted += decipher.final('utf8');

            return decrypted;
        } catch (error) {
            throw new Error(`Decryption failed: ${error.message}`);
        }
    }
}
