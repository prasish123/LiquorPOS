import {
  IsString,
  IsArray,
  IsNumber,
  IsOptional,
  IsNotEmpty,
  ValidateNested,
  IsEnum,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Uber Eats Webhook Item DTO
 * Represents a single item in an Uber Eats order
 */
export class UberEatsItemDto {
  @ApiProperty({
    description: 'Uber Eats item ID',
    example: 'item-123',
  })
  @IsString()
  @IsNotEmpty()
  id: string;

  @ApiProperty({
    description: 'Item name',
    example: 'Grey Goose Vodka 750ml',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    description: 'Quantity ordered',
    example: 2,
  })
  @IsNumber()
  @Min(1)
  @Max(1000)
  quantity: number;

  @ApiProperty({
    description: 'Price per unit in cents',
    example: 1999,
  })
  @IsNumber()
  @Min(0)
  @Max(10000000)
  price: number;

  @ApiPropertyOptional({
    description: 'External reference ID (SKU)',
    example: 'VODKA-GREY-GOOSE-750ML',
  })
  @IsOptional()
  @IsString()
  external_data?: string;
}

/**
 * Uber Eats Webhook Customer DTO
 */
export class UberEatsCustomerDto {
  @ApiPropertyOptional({
    description: 'Customer first name',
    example: 'John',
  })
  @IsOptional()
  @IsString()
  first_name?: string;

  @ApiPropertyOptional({
    description: 'Customer last name',
    example: 'Doe',
  })
  @IsOptional()
  @IsString()
  last_name?: string;

  @ApiPropertyOptional({
    description: 'Customer phone number',
    example: '+1234567890',
  })
  @IsOptional()
  @IsString()
  phone?: string;
}

/**
 * Uber Eats Webhook Payment DTO
 */
export class UberEatsPaymentDto {
  @ApiProperty({
    description: 'Total amount charged in cents',
    example: 4278,
  })
  @IsNumber()
  @Min(0)
  @Max(10000000)
  total: number;

  @ApiPropertyOptional({
    description: 'Subtotal in cents',
    example: 3998,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  subtotal?: number;

  @ApiPropertyOptional({
    description: 'Tax amount in cents',
    example: 280,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  tax?: number;

  @ApiPropertyOptional({
    description: 'Tip amount in cents',
    example: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  tip?: number;
}

/**
 * Uber Eats Webhook DTO
 * Main payload for Uber Eats order webhooks
 */
export class UberEatsWebhookDto {
  @ApiProperty({
    description: 'Event type',
    example: 'orders.notification',
  })
  @IsString()
  @IsNotEmpty()
  event_type: string;

  @ApiProperty({
    description: 'Unique event ID for idempotency',
    example: 'evt_123456789',
  })
  @IsString()
  @IsNotEmpty()
  event_id: string;

  @ApiProperty({
    description: 'Uber Eats order ID',
    example: 'order-abc123',
  })
  @IsString()
  @IsNotEmpty()
  order_id: string;

  @ApiProperty({
    description: 'Store ID in Uber Eats system',
    example: 'store-xyz789',
  })
  @IsString()
  @IsNotEmpty()
  store_id: string;

  @ApiProperty({
    description: 'Order status',
    enum: ['created', 'accepted', 'denied', 'finished', 'cancelled'],
    example: 'created',
  })
  @IsEnum(['created', 'accepted', 'denied', 'finished', 'cancelled'])
  @IsNotEmpty()
  status: 'created' | 'accepted' | 'denied' | 'finished' | 'cancelled';

  @ApiProperty({
    description: 'Order items',
    type: [UberEatsItemDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UberEatsItemDto)
  items: UberEatsItemDto[];

  @ApiProperty({
    description: 'Payment information',
    type: UberEatsPaymentDto,
  })
  @ValidateNested()
  @Type(() => UberEatsPaymentDto)
  payment: UberEatsPaymentDto;

  @ApiPropertyOptional({
    description: 'Customer information',
    type: UberEatsCustomerDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => UberEatsCustomerDto)
  customer?: UberEatsCustomerDto;

  @ApiProperty({
    description: 'Timestamp of order creation',
    example: '2025-01-02T12:00:00Z',
  })
  @IsString()
  @IsNotEmpty()
  created_at: string;

  @ApiPropertyOptional({
    description: 'Additional metadata',
  })
  @IsOptional()
  metadata?: any;
}
