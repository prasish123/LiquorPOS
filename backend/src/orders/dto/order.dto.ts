import {
  IsString,
  IsArray,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsNumber,
  Min,
  Max,
  MaxLength,
  MinLength,
  ArrayMinSize,
  ArrayMaxSize,
  ValidateNested,
  IsNotEmpty,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsValidIdempotencyKey,
  IsValidSKU,
  IsReasonableQuantity,
  IsReasonableAmount,
  IsUUIDOrCUID,
} from '../validators/order-validators';

/**
 * ============================================================================
 * REQUEST DTOs - Used for incoming API requests
 * ============================================================================
 */

/**
 * Order Item DTO
 * Represents a single item in an order request
 * Must be defined before CreateOrderDto since it's used as a nested type
 */
export class OrderItemDto {
  // SKU - Product identifier
  @ApiProperty({
    description: 'Product SKU code',
    example: 'WINE-001',
    type: String,
  })
  @IsString({ message: 'SKU must be a string' })
  @IsNotEmpty({ message: 'SKU is required' })
  @IsValidSKU({ message: 'SKU must be a valid product code' })
  sku: string;

  // Quantity - Must be positive integer, reasonable limit
  @ApiProperty({
    description: 'Quantity of items (1-1000)',
    example: 2,
    minimum: 1,
    maximum: 1000,
    type: Number,
  })
  @IsNumber({}, { message: 'Quantity must be a number' })
  @IsReasonableQuantity({
    message: 'Quantity must be between 1 and 1000',
  })
  quantity: number;

  // Price at Sale - Captured at time of sale
  @ApiProperty({
    description: 'Price per unit at time of sale',
    example: 19.99,
    minimum: 0,
    maximum: 100000,
    type: Number,
  })
  @IsNumber({}, { message: 'Price must be a number' })
  @Min(0, { message: 'Price cannot be negative' })
  @Max(100000, { message: 'Price exceeds maximum allowed' })
  @IsReasonableAmount({ message: 'Price must be a reasonable amount' })
  priceAtSale: number;

  // Discount - Optional per-item discount
  @ApiPropertyOptional({
    description: 'Discount amount applied to this item',
    example: 2.0,
    minimum: 0,
    maximum: 100000,
    type: Number,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Discount must be a number' })
  @Min(0, { message: 'Discount cannot be negative' })
  @Max(100000, { message: 'Discount exceeds maximum allowed' })
  @IsReasonableAmount({ message: 'Discount must be a reasonable amount' })
  discount?: number;
}

/**
 * Create Order DTO
 * Main DTO for creating a new order
 * Contains all required fields and validation rules
 */
export class CreateOrderDto {
  // Location and Terminal IDs
  @ApiProperty({
    description: 'Location ID where the order is placed',
    example: 'loc-001',
    type: String,
  })
  @IsString()
  @IsNotEmpty({ message: 'Location ID is required' })
  @IsUUIDOrCUID({ message: 'Location ID must be a valid UUID or CUID' })
  locationId: string;

  @ApiPropertyOptional({
    description: 'Terminal ID processing the order',
    example: 'term-001',
    type: String,
  })
  @IsOptional()
  @IsString()
  @IsUUIDOrCUID({ message: 'Terminal ID must be a valid UUID or CUID' })
  terminalId?: string;

  @ApiPropertyOptional({
    description: 'Employee ID processing the order',
    example: 'emp-001',
    type: String,
  })
  @IsOptional()
  @IsString()
  @IsUUIDOrCUID({ message: 'Employee ID must be a valid UUID or CUID' })
  employeeId?: string;

  @ApiPropertyOptional({
    description: 'Customer ID (if customer is registered)',
    example: 'cust-001',
    type: String,
  })
  @IsOptional()
  @IsString()
  @IsUUIDOrCUID({ message: 'Customer ID must be a valid UUID or CUID' })
  customerId?: string;

  // Order Items - CRITICAL: Must have at least 1 item, max 100 items per order
  @ApiProperty({
    description: 'Array of items in the order (min: 1, max: 100)',
    type: [OrderItemDto],
    minItems: 1,
    maxItems: 100,
    example: [
      {
        sku: 'WINE-001',
        quantity: 2,
        priceAtSale: 19.99,
        discount: 0,
      },
    ],
  })
  @IsArray({ message: 'Items must be an array' })
  @ArrayMinSize(1, { message: 'Order must contain at least 1 item' })
  @ArrayMaxSize(100, {
    message: 'Order cannot contain more than 100 items',
  })
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];

  // Payment Method - Required
  @ApiProperty({
    description: 'Payment method used for the order',
    enum: ['cash', 'card', 'split'],
    example: 'card',
  })
  @IsEnum(['cash', 'card', 'split'], {
    message: 'Payment method must be cash, card, or split',
  })
  @IsNotEmpty({ message: 'Payment method is required' })
  paymentMethod: 'cash' | 'card' | 'split';

  // Channel/Source - Required
  @ApiProperty({
    description: 'Sales channel where the order originated',
    enum: ['counter', 'web', 'uber_eats', 'doordash'],
    example: 'counter',
  })
  @IsEnum(['counter', 'web', 'uber_eats', 'doordash'], {
    message: 'Channel must be counter, web, uber_eats, or doordash',
  })
  @IsNotEmpty({ message: 'Channel is required' })
  channel: 'counter' | 'web' | 'uber_eats' | 'doordash';

  // Compliance - Age Verification
  @ApiPropertyOptional({
    description: 'Whether age was verified for alcohol purchase',
    example: true,
    type: Boolean,
  })
  @IsOptional()
  @IsBoolean({ message: 'Age verified must be a boolean' })
  ageVerified?: boolean;

  @ApiPropertyOptional({
    description: 'Name of employee who verified age',
    example: 'John Doe',
    minLength: 2,
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'Age verified by must be at least 2 characters' })
  @MaxLength(100, {
    message: 'Age verified by must not exceed 100 characters',
  })
  ageVerifiedBy?: string;

  @ApiPropertyOptional({
    description: 'Whether ID was scanned',
    example: true,
    type: Boolean,
  })
  @IsOptional()
  @IsBoolean({ message: 'ID scanned must be a boolean' })
  idScanned?: boolean;

  // POS Provided Totals (Source of Truth)
  // If provided, these override calculated values
  @ApiPropertyOptional({
    description: 'Subtotal amount (if provided by POS, overrides calculation)',
    example: 39.98,
    type: Number,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Subtotal must be a number' })
  @IsReasonableAmount({ message: 'Subtotal must be a reasonable amount' })
  subtotal?: number;

  @ApiPropertyOptional({
    description: 'Tax amount (if provided by POS, overrides calculation)',
    example: 2.8,
    type: Number,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Tax must be a number' })
  @IsReasonableAmount({ message: 'Tax must be a reasonable amount' })
  tax?: number;

  @ApiPropertyOptional({
    description: 'Total amount (if provided by POS, overrides calculation)',
    example: 42.78,
    type: Number,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Total must be a number' })
  @IsReasonableAmount({ message: 'Total must be a reasonable amount' })
  total?: number;

  // Idempotency Key - CRITICAL for preventing duplicate orders
  @ApiProperty({
    description:
      'Unique idempotency key to prevent duplicate orders (UUID recommended)',
    example: '123e4567-e89b-12d3-a456-426614174000',
    type: String,
  })
  @IsString({ message: 'Idempotency key must be a string' })
  @IsNotEmpty({ message: 'Idempotency key is required' })
  @IsValidIdempotencyKey({
    message: 'Idempotency key must be a valid UUID or unique identifier',
  })
  idempotencyKey: string;
}

/**
 * Update Order DTO
 * Used for updating existing orders (limited fields)
 */
export class UpdateOrderDto {
  @ApiPropertyOptional({
    description: 'Payment status of the order',
    enum: ['completed', 'refunded', 'partial_refund'],
    example: 'completed',
  })
  @IsOptional()
  @IsEnum(['completed', 'refunded', 'partial_refund'], {
    message: 'Payment status must be completed, refunded, or partial_refund',
  })
  paymentStatus?: 'completed' | 'refunded' | 'partial_refund';

  @ApiPropertyOptional({
    description: 'Whether order has been synced to cloud',
    example: true,
    type: Boolean,
  })
  @IsOptional()
  @IsBoolean({ message: 'Synced to cloud must be a boolean' })
  syncedToCloud?: boolean;

  @ApiPropertyOptional({
    description: 'Whether order has been synced to back office',
    example: true,
    type: Boolean,
  })
  @IsOptional()
  @IsBoolean({ message: 'Synced to back office must be a boolean' })
  syncedToBackOffice?: boolean;
}

/**
 * ============================================================================
 * RESPONSE DTOs - Used for outgoing API responses
 * ============================================================================
 */

/**
 * Order Item Response DTO
 * Represents a single item in an order response
 * Must be defined before OrderResponseDto since it's used as a nested type
 */
export class OrderItemResponseDto {
  id: string;
  sku: string;
  name: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  tax: number;
  total: number;
}

/**
 * Order Response DTO
 * Complete order information returned to the client
 * Includes calculated totals and all order details
 */
export class OrderResponseDto {
  id: string;
  locationId: string;
  terminalId?: string;
  employeeId?: string;
  customerId?: string;

  subtotal: number;
  tax: number;
  discount: number;
  total: number;

  paymentMethod: string;
  paymentStatus: string;
  channel: string;

  ageVerified: boolean;
  idScanned: boolean;

  items: OrderItemResponseDto[];

  createdAt: Date;
}
