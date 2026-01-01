import { IsString, IsNumber, IsNotEmpty, IsOptional, Min } from 'class-validator';

export class CreateInventoryDto {
    @IsString()
    @IsNotEmpty()
    productId: string;

    @IsString()
    @IsNotEmpty()
    locationId: string;

    @IsNumber()
    @Min(0)
    quantity: number;

    @IsNumber()
    @IsOptional()
    @Min(0)
    reserved?: number;

    @IsNumber()
    @IsOptional()
    @Min(0)
    reorderPoint?: number;
}

export class UpdateInventoryDto {
    @IsNumber()
    @IsOptional()
    @Min(0)
    quantity?: number;

    @IsNumber()
    @IsOptional()
    @Min(0)
    reserved?: number;

    @IsNumber()
    @IsOptional()
    @Min(0)
    reorderPoint?: number;
}

export class AdjustInventoryDto {
    @IsString()
    @IsNotEmpty()
    productId: string;

    @IsString()
    @IsNotEmpty()
    locationId: string;

    @IsNumber()
    @IsNotEmpty()
    adjustment: number; // Can be positive or negative

    @IsString()
    @IsOptional()
    reason?: string; // e.g., "restock", "damage", "theft", "correction"
}
