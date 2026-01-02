import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

/**
 * Custom validator to ensure idempotency key format
 * Should be a UUID v4 or similar unique identifier
 */
@ValidatorConstraint({ name: 'isValidIdempotencyKey', async: false })
export class IsValidIdempotencyKeyConstraint implements ValidatorConstraintInterface {
  validate(value: any): boolean {
    if (typeof value !== 'string') return false;

    // Allow UUID v4 format or custom format (alphanumeric with hyphens, min 16 chars)
    const uuidV4Regex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const customFormatRegex = /^[a-zA-Z0-9-_]{16,128}$/;

    return uuidV4Regex.test(value) || customFormatRegex.test(value);
  }

  defaultMessage(args: ValidationArguments): string {
    return `${args.property} must be a valid UUID v4 or unique identifier (16-128 alphanumeric characters)`;
  }
}

export function IsValidIdempotencyKey(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsValidIdempotencyKeyConstraint,
    });
  };
}

/**
 * Custom validator to ensure SKU format
 * SKUs should follow a specific pattern
 */
@ValidatorConstraint({ name: 'isValidSKU', async: false })
export class IsValidSKUConstraint implements ValidatorConstraintInterface {
  validate(value: any): boolean {
    if (typeof value !== 'string') return false;

    // SKU format: alphanumeric with hyphens, 3-50 characters
    // Examples: WINE-001, BEER-CORONA-12OZ, VODKA-GREY-GOOSE-750ML
    const skuRegex = /^[A-Z0-9][A-Z0-9-]{2,49}$/i;
    return skuRegex.test(value);
  }

  defaultMessage(args: ValidationArguments): string {
    return `${args.property} must be a valid SKU (3-50 alphanumeric characters with hyphens)`;
  }
}

export function IsValidSKU(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsValidSKUConstraint,
    });
  };
}

/**
 * Custom validator to ensure quantity is reasonable
 * Prevents extremely large orders that might be errors or attacks
 */
@ValidatorConstraint({ name: 'isReasonableQuantity', async: false })
export class IsReasonableQuantityConstraint implements ValidatorConstraintInterface {
  validate(value: any): boolean {
    if (typeof value !== 'number') return false;
    // Reasonable quantity: 1-1000 items per line item
    return value >= 1 && value <= 1000 && Number.isInteger(value);
  }

  defaultMessage(args: ValidationArguments): string {
    return `${args.property} must be between 1 and 1000`;
  }
}

export function IsReasonableQuantity(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsReasonableQuantityConstraint,
    });
  };
}

/**
 * Custom validator to ensure monetary amounts are reasonable
 * Prevents extremely large amounts that might be errors or attacks
 */
@ValidatorConstraint({ name: 'isReasonableAmount', async: false })
export class IsReasonableAmountConstraint implements ValidatorConstraintInterface {
  validate(value: any): boolean {
    if (typeof value !== 'number') return false;
    // Reasonable amount: 0-100,000 (most transactions under $100k)
    // Also ensure max 2 decimal places for currency
    const decimalPlaces = (value.toString().split('.')[1] || '').length;
    const hasValidDecimals = decimalPlaces <= 2;
    return value >= 0 && value <= 100000 && hasValidDecimals;
  }

  defaultMessage(args: ValidationArguments): string {
    return `${args.property} must be between 0 and 100,000 with max 2 decimal places`;
  }
}

export function IsReasonableAmount(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsReasonableAmountConstraint,
    });
  };
}

/**
 * Custom validator to ensure UUID format for IDs
 */
@ValidatorConstraint({ name: 'isUUIDOrCUID', async: false })
export class IsUUIDOrCUIDConstraint implements ValidatorConstraintInterface {
  validate(value: any): boolean {
    if (typeof value !== 'string') return false;

    // UUID v4 format
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    // CUID format (starts with 'c', 25 characters)
    const cuidRegex = /^c[a-z0-9]{24}$/i;
    // Custom ID format (alphanumeric, 8-36 characters)
    const customIdRegex = /^[a-zA-Z0-9_-]{8,36}$/;

    return (
      uuidRegex.test(value) ||
      cuidRegex.test(value) ||
      customIdRegex.test(value)
    );
  }

  defaultMessage(args: ValidationArguments): string {
    return `${args.property} must be a valid UUID, CUID, or custom ID format`;
  }
}

export function IsUUIDOrCUID(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsUUIDOrCUIDConstraint,
    });
  };
}
