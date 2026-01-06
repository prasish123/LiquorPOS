import { IsString, IsNumber, IsBoolean, IsOptional, IsNotEmpty, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProductDto {
  @ApiProperty({
    description: 'Product SKU code',
    example: 'WINE-001',
    type: String,
  })
  @IsString()
  @IsNotEmpty()
  sku: string;

  @ApiPropertyOptional({
    description: 'Universal Product Code (barcode)',
    example: '012345678901',
    type: String,
  })
  @IsString()
  @IsOptional()
  upc?: string;

  @ApiProperty({
    description: 'Product name',
    example: 'Cabernet Sauvignon 2020',
    type: String,
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({
    description: 'Product description',
    example: 'Full-bodied red wine with notes of blackberry and oak',
    type: String,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'Product category',
    example: 'wine',
    enum: ['wine', 'beer', 'spirits', 'mixers', 'snacks'],
    type: String,
  })
  @IsString()
  @IsNotEmpty()
  category: string; // wine, beer, spirits, mixers, snacks

  // Liquor-specific
  @ApiPropertyOptional({
    description: 'Alcohol by volume percentage',
    example: 13.5,
    minimum: 0,
    type: Number,
  })
  @IsNumber()
  @IsOptional()
  @Min(0)
  abv?: number;

  @ApiPropertyOptional({
    description: 'Volume in milliliters',
    example: 750,
    minimum: 0,
    type: Number,
  })
  @IsNumber()
  @IsOptional()
  @Min(0)
  volumeMl?: number;

  @ApiPropertyOptional({
    description: 'Number of units per case',
    example: 12,
    minimum: 1,
    type: Number,
  })
  @IsNumber()
  @IsOptional()
  @Min(1)
  caseSize?: number;

  // Pricing
  @ApiProperty({
    description: 'Base retail price',
    example: 19.99,
    minimum: 0,
    type: Number,
  })
  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  basePrice: number;

  @ApiProperty({
    description: 'Cost price (wholesale)',
    example: 12.5,
    minimum: 0,
    type: Number,
  })
  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  cost: number;

  // Inventory
  @ApiPropertyOptional({
    description: 'Whether to track inventory for this product',
    example: true,
    type: Boolean,
  })
  @IsBoolean()
  @IsOptional()
  trackInventory?: boolean;

  // Compliance
  @ApiPropertyOptional({
    description: 'Whether age verification is required (alcohol products)',
    example: true,
    type: Boolean,
  })
  @IsBoolean()
  @IsOptional()
  ageRestricted?: boolean;
}

export class UpdateProductDto {
  @ApiPropertyOptional({
    description: 'Product SKU code',
    example: 'WINE-001',
    type: String,
  })
  @IsString()
  @IsOptional()
  sku?: string;

  @ApiPropertyOptional({
    description: 'Universal Product Code (barcode)',
    example: '012345678901',
    type: String,
  })
  @IsString()
  @IsOptional()
  upc?: string;

  @ApiPropertyOptional({
    description: 'Product name',
    example: 'Cabernet Sauvignon 2020',
    type: String,
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({
    description: 'Product description',
    example: 'Full-bodied red wine with notes of blackberry and oak',
    type: String,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: 'Product category',
    example: 'wine',
    enum: ['wine', 'beer', 'spirits', 'mixers', 'snacks'],
    type: String,
  })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiPropertyOptional({
    description: 'Alcohol by volume percentage',
    example: 13.5,
    minimum: 0,
    type: Number,
  })
  @IsNumber()
  @IsOptional()
  @Min(0)
  abv?: number;

  @ApiPropertyOptional({
    description: 'Volume in milliliters',
    example: 750,
    minimum: 0,
    type: Number,
  })
  @IsNumber()
  @IsOptional()
  @Min(0)
  volumeMl?: number;

  @ApiPropertyOptional({
    description: 'Number of units per case',
    example: 12,
    minimum: 1,
    type: Number,
  })
  @IsNumber()
  @IsOptional()
  @Min(1)
  caseSize?: number;

  @ApiPropertyOptional({
    description: 'Base retail price',
    example: 19.99,
    minimum: 0,
    type: Number,
  })
  @IsNumber()
  @IsOptional()
  @Min(0)
  basePrice?: number;

  @ApiPropertyOptional({
    description: 'Cost price (wholesale)',
    example: 12.5,
    minimum: 0,
    type: Number,
  })
  @IsNumber()
  @IsOptional()
  @Min(0)
  cost?: number;

  @ApiPropertyOptional({
    description: 'Whether to track inventory for this product',
    example: true,
    type: Boolean,
  })
  @IsBoolean()
  @IsOptional()
  trackInventory?: boolean;

  @ApiPropertyOptional({
    description: 'Whether age verification is required (alcohol products)',
    example: true,
    type: Boolean,
  })
  @IsBoolean()
  @IsOptional()
  ageRestricted?: boolean;
}

export class SearchProductDto {
  @ApiProperty({
    description: 'Search query string',
    example: 'cabernet',
    type: String,
  })
  @IsString()
  @IsNotEmpty()
  query: string;

  @ApiPropertyOptional({
    description: 'Filter by category',
    example: 'wine',
    type: String,
  })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiPropertyOptional({
    description: 'Maximum number of results',
    example: 20,
    minimum: 1,
    type: Number,
  })
  @IsNumber()
  @IsOptional()
  @Min(1)
  limit?: number;
}
