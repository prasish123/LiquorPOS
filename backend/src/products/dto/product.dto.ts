import { IsString, IsNumber, IsBoolean, IsOptional, IsNotEmpty, Min } from 'class-validator';

export class CreateProductDto {
    @IsString()
    @IsNotEmpty()
    sku: string;

    @IsString()
    @IsOptional()
    upc?: string;

    @IsString()
    @IsNotEmpty()
    name: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsString()
    @IsNotEmpty()
    category: string; // wine, beer, spirits, mixers, snacks

    // Liquor-specific
    @IsNumber()
    @IsOptional()
    @Min(0)
    abv?: number;

    @IsNumber()
    @IsOptional()
    @Min(0)
    volumeMl?: number;

    @IsNumber()
    @IsOptional()
    @Min(1)
    caseSize?: number;

    // Pricing
    @IsNumber()
    @IsNotEmpty()
    @Min(0)
    basePrice: number;

    @IsNumber()
    @IsNotEmpty()
    @Min(0)
    cost: number;

    // Inventory
    @IsBoolean()
    @IsOptional()
    trackInventory?: boolean;

    // Compliance
    @IsBoolean()
    @IsOptional()
    ageRestricted?: boolean;
}

export class UpdateProductDto {
    @IsString()
    @IsOptional()
    sku?: string;

    @IsString()
    @IsOptional()
    upc?: string;

    @IsString()
    @IsOptional()
    name?: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsString()
    @IsOptional()
    category?: string;

    @IsNumber()
    @IsOptional()
    @Min(0)
    abv?: number;

    @IsNumber()
    @IsOptional()
    @Min(0)
    volumeMl?: number;

    @IsNumber()
    @IsOptional()
    @Min(1)
    caseSize?: number;

    @IsNumber()
    @IsOptional()
    @Min(0)
    basePrice?: number;

    @IsNumber()
    @IsOptional()
    @Min(0)
    cost?: number;

    @IsBoolean()
    @IsOptional()
    trackInventory?: boolean;

    @IsBoolean()
    @IsOptional()
    ageRestricted?: boolean;
}

export class SearchProductDto {
    @IsString()
    @IsNotEmpty()
    query: string;

    @IsString()
    @IsOptional()
    category?: string;

    @IsNumber()
    @IsOptional()
    @Min(1)
    limit?: number;
}
