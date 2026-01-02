import {
  IsString,
  IsNumber,
  IsNotEmpty,
  IsOptional,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateInventoryDto {
  @ApiProperty({
    description: 'Product ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
    type: String,
  })
  @IsString()
  @IsNotEmpty()
  productId: string;

  @ApiProperty({
    description: 'Location ID',
    example: 'loc-001',
    type: String,
  })
  @IsString()
  @IsNotEmpty()
  locationId: string;

  @ApiProperty({
    description: 'Current quantity in stock',
    example: 100,
    minimum: 0,
    type: Number,
  })
  @IsNumber()
  @Min(0)
  quantity: number;

  @ApiPropertyOptional({
    description: 'Reserved quantity (for pending orders)',
    example: 5,
    minimum: 0,
    type: Number,
  })
  @IsNumber()
  @IsOptional()
  @Min(0)
  reserved?: number;

  @ApiPropertyOptional({
    description: 'Reorder point threshold',
    example: 20,
    minimum: 0,
    type: Number,
  })
  @IsNumber()
  @IsOptional()
  @Min(0)
  reorderPoint?: number;
}

export class UpdateInventoryDto {
  @ApiPropertyOptional({
    description: 'Current quantity in stock',
    example: 100,
    minimum: 0,
    type: Number,
  })
  @IsNumber()
  @IsOptional()
  @Min(0)
  quantity?: number;

  @ApiPropertyOptional({
    description: 'Reserved quantity (for pending orders)',
    example: 5,
    minimum: 0,
    type: Number,
  })
  @IsNumber()
  @IsOptional()
  @Min(0)
  reserved?: number;

  @ApiPropertyOptional({
    description: 'Reorder point threshold',
    example: 20,
    minimum: 0,
    type: Number,
  })
  @IsNumber()
  @IsOptional()
  @Min(0)
  reorderPoint?: number;
}

export class AdjustInventoryDto {
  @ApiProperty({
    description: 'Product ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
    type: String,
  })
  @IsString()
  @IsNotEmpty()
  productId: string;

  @ApiProperty({
    description: 'Location ID',
    example: 'loc-001',
    type: String,
  })
  @IsString()
  @IsNotEmpty()
  locationId: string;

  @ApiProperty({
    description:
      'Adjustment amount (positive for increase, negative for decrease)',
    example: -5,
    type: Number,
  })
  @IsNumber()
  @IsNotEmpty()
  adjustment: number; // Can be positive or negative

  @ApiPropertyOptional({
    description: 'Reason for adjustment',
    example: 'damage',
    enum: [
      'sale',
      'restock',
      'damage',
      'theft',
      'count',
      'correction',
      'return',
    ],
    type: String,
  })
  @IsString()
  @IsOptional()
  reason?: string; // e.g., "restock", "damage", "theft", "correction"
}
