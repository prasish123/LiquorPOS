import {
  IsValidIdempotencyKeyConstraint,
  IsValidSKUConstraint,
  IsReasonableQuantityConstraint,
  IsReasonableAmountConstraint,
  IsUUIDOrCUIDConstraint,
} from './order-validators';

describe('Order Validators', () => {
  describe('IsValidIdempotencyKeyConstraint', () => {
    const validator = new IsValidIdempotencyKeyConstraint();

    it('should accept valid UUID v4', () => {
      const validUUIDs = [
        '550e8400-e29b-41d4-a716-446655440000',
        'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
      ];

      validUUIDs.forEach((uuid) => {
        expect(validator.validate(uuid)).toBe(true);
      });
    });

    it('should accept custom format (alphanumeric with hyphens, 16-128 chars)', () => {
      const validKeys = [
        'order-2024-01-01-abc123',
        'transaction_12345678901234567890',
        'POS-TERMINAL-001-20240101-123456',
      ];

      validKeys.forEach((key) => {
        expect(validator.validate(key)).toBe(true);
      });
    });

    it('should reject invalid formats', () => {
      const invalidKeys = [
        'short', // Too short
        'a'.repeat(129), // Too long
        'invalid@key#with$special', // Special characters
        '', // Empty
        null,
        undefined,
        123, // Not a string
      ];

      invalidKeys.forEach((key) => {
        expect(validator.validate(key)).toBe(false);
      });
    });
  });

  describe('IsValidSKUConstraint', () => {
    const validator = new IsValidSKUConstraint();

    it('should accept valid SKU formats', () => {
      const validSKUs = [
        'WINE-001',
        'BEER-CORONA-12OZ',
        'VODKA-GREY-GOOSE-750ML',
        'SKU123',
        'PRODUCT-ABC-DEF-GHI',
      ];

      validSKUs.forEach((sku) => {
        expect(validator.validate(sku)).toBe(true);
      });
    });

    it('should reject invalid SKU formats', () => {
      const invalidSKUs = [
        'AB', // Too short
        'a'.repeat(51), // Too long
        'SKU@123', // Special characters
        'sku with spaces',
        '', // Empty
        null,
        undefined,
        123, // Not a string
      ];

      invalidSKUs.forEach((sku) => {
        expect(validator.validate(sku)).toBe(false);
      });
    });
  });

  describe('IsReasonableQuantityConstraint', () => {
    const validator = new IsReasonableQuantityConstraint();

    it('should accept reasonable quantities', () => {
      const validQuantities = [1, 2, 10, 100, 500, 1000];

      validQuantities.forEach((qty) => {
        expect(validator.validate(qty)).toBe(true);
      });
    });

    it('should reject invalid quantities', () => {
      const invalidQuantities = [
        0, // Too low
        -1, // Negative
        1001, // Too high
        2.5, // Not an integer
        '10', // Not a number
        null,
        undefined,
      ];

      invalidQuantities.forEach((qty) => {
        expect(validator.validate(qty)).toBe(false);
      });
    });
  });

  describe('IsReasonableAmountConstraint', () => {
    const validator = new IsReasonableAmountConstraint();

    it('should accept reasonable amounts', () => {
      const validAmounts = [0, 0.01, 10.5, 19.99, 100, 1000, 99999.99];

      validAmounts.forEach((amount) => {
        expect(validator.validate(amount)).toBe(true);
      });
    });

    it('should reject invalid amounts', () => {
      const invalidAmounts = [
        -0.01, // Negative
        100001, // Too high
        19.999, // More than 2 decimal places
        10.123, // More than 2 decimal places
        '19.99', // Not a number
        null,
        undefined,
      ];

      invalidAmounts.forEach((amount) => {
        expect(validator.validate(amount)).toBe(false);
      });
    });

    it('should validate decimal places correctly', () => {
      expect(validator.validate(19.99)).toBe(true); // 2 decimals - OK
      expect(validator.validate(19.9)).toBe(true); // 1 decimal - OK
      expect(validator.validate(19)).toBe(true); // 0 decimals - OK
      expect(validator.validate(19.999)).toBe(false); // 3 decimals - FAIL
      expect(validator.validate(19.9999)).toBe(false); // 4 decimals - FAIL
    });
  });

  describe('IsUUIDOrCUIDConstraint', () => {
    const validator = new IsUUIDOrCUIDConstraint();

    it('should accept valid UUIDs', () => {
      const validUUIDs = [
        '550e8400-e29b-41d4-a716-446655440000',
        'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
      ];

      validUUIDs.forEach((uuid) => {
        expect(validator.validate(uuid)).toBe(true);
      });
    });

    it('should accept valid CUIDs', () => {
      const validCUIDs = [
        'c1234567890123456789012345',
        'cabcdefghijklmnopqrstuvwxy',
      ];

      validCUIDs.forEach((cuid) => {
        expect(validator.validate(cuid)).toBe(true);
      });
    });

    it('should accept custom ID formats', () => {
      const validCustomIDs = [
        'location_001',
        'terminal-abc123',
        'customer_12345678',
      ];

      validCustomIDs.forEach((id) => {
        expect(validator.validate(id)).toBe(true);
      });
    });

    it('should reject invalid formats', () => {
      const invalidIDs = [
        'short', // Too short
        'a'.repeat(37), // Too long
        'invalid@id', // Special characters
        '', // Empty
        null,
        undefined,
        123, // Not a string
      ];

      invalidIDs.forEach((id) => {
        expect(validator.validate(id)).toBe(false);
      });
    });
  });
});
