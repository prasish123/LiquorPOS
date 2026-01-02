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
 * DoorDash Webhook Item DTO
 * Represents a single item in a DoorDash order
 */
export class DoorDashItemDto {
  @ApiProperty({
    description: 'DoorDash item ID',
    example: 'item-456',
  })
  @IsString()
  @IsNotEmpty()
  id: string;

  @ApiProperty({
    description: 'Item name',
    example: 'Corona Extra 12oz 6-Pack',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Quantity ordered',
    example: 1,
  })
  @IsNumber()
  @Min(1)
  @Max(1000)
  quantity: number;

  @ApiProperty({
    description: 'Unit price in cents',
    example: 899,
  })
  @IsNumber()
  @Min(0)
  @Max(10000000)
  unit_price: number;

  @ApiPropertyOptional({
    description: 'External reference ID (SKU)',
    example: 'BEER-CORONA-12OZ-6PK',
  })
  @IsOptional()
  @IsString()
  external_id?: string;

  @ApiPropertyOptional({
    description: 'Special instructions',
    example: 'Extra cold',
  })
  @IsOptional()
  @IsString()
  special_instructions?: string;
}

/**
 * DoorDash Webhook Consumer DTO
 */
export class DoorDashConsumerDto {
  @ApiPropertyOptional({
    description: 'Consumer first name',
    example: 'Jane',
  })
  @IsOptional()
  @IsString()
  first_name?: string;

  @ApiPropertyOptional({
    description: 'Consumer last name',
    example: 'Smith',
  })
  @IsOptional()
  @IsString()
  last_name?: string;

  @ApiPropertyOptional({
    description: 'Consumer phone number',
    example: '+1987654321',
  })
  @IsOptional()
  @IsString()
  phone_number?: string;
}

/**
 * DoorDash Webhook Order Value DTO
 */
export class DoorDashOrderValueDto {
  @ApiProperty({
    description: 'Subtotal in cents',
    example: 899,
  })
  @IsNumber()
  @Min(0)
  @Max(10000000)
  subtotal: number;

  @ApiProperty({
    description: 'Tax amount in cents',
    example: 63,
  })
  @IsNumber()
  @Min(0)
  @Max(10000000)
  tax: number;

  @ApiProperty({
    description: 'Total amount in cents',
    example: 962,
  })
  @IsNumber()
  @Min(0)
  @Max(10000000)
  total: number;

  @ApiPropertyOptional({
    description: 'Delivery fee in cents',
    example: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  delivery_fee?: number;

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
 * DoorDash Webhook DTO
 * Main payload for DoorDash order webhooks
 */
export class DoorDashWebhookDto {
  @ApiProperty({
    description: 'Event type',
    example: 'order.created',
  })
  @IsString()
  @IsNotEmpty()
  event_type: string;

  @ApiProperty({
    description: 'Unique event ID for idempotency',
    example: 'evt_987654321',
  })
  @IsString()
  @IsNotEmpty()
  event_id: string;

  @ApiProperty({
    description: 'DoorDash order ID',
    example: 'dd-order-xyz789',
  })
  @IsString()
  @IsNotEmpty()
  order_id: string;

  @ApiProperty({
    description: 'Store ID in DoorDash system',
    example: 'store-abc123',
  })
  @IsString()
  @IsNotEmpty()
  store_id: string;

  @ApiProperty({
    description: 'Order status',
    enum: ['created', 'confirmed', 'cancelled', 'delivered'],
    example: 'created',
  })
  @IsEnum(['created', 'confirmed', 'cancelled', 'delivered'])
  @IsNotEmpty()
  status: 'created' | 'confirmed' | 'cancelled' | 'delivered';

  @ApiProperty({
    description: 'Order items',
    type: [DoorDashItemDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DoorDashItemDto)
  items: DoorDashItemDto[];

  @ApiProperty({
    description: 'Order value breakdown',
    type: DoorDashOrderValueDto,
  })
  @ValidateNested()
  @Type(() => DoorDashOrderValueDto)
  order_value: DoorDashOrderValueDto;

  @ApiPropertyOptional({
    description: 'Consumer information',
    type: DoorDashConsumerDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => DoorDashConsumerDto)
  consumer?: DoorDashConsumerDto;

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

