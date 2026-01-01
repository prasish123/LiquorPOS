import { IsString, IsArray, IsEnum, IsOptional, IsBoolean, IsNumber, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateOrderDto {
    @IsString()
    locationId: string;

    @IsOptional()
    @IsString()
    terminalId?: string;

    @IsOptional()
    @IsString()
    employeeId?: string;

    @IsOptional()
    @IsString()
    customerId?: string;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => OrderItemDto)
    items: OrderItemDto[];

    // Payment
    @IsEnum(['cash', 'card', 'split'])
    paymentMethod: 'cash' | 'card' | 'split';

    // Source
    @IsEnum(['counter', 'web', 'uber_eats', 'doordash'])
    channel: 'counter' | 'web' | 'uber_eats' | 'doordash';

    // Compliance
    @IsOptional()
    @IsBoolean()
    ageVerified?: boolean;

    @IsOptional()
    @IsString()
    ageVerifiedBy?: string;

    @IsOptional()
    @IsBoolean()
    idScanned?: boolean;

    // POS Provided Totals (Source of Truth)
    @IsOptional()
    @IsNumber()
    @Min(0)
    subtotal?: number;

    @IsOptional()
    @IsNumber()
    @Min(0)
    tax?: number;

    @IsOptional()
    @IsNumber()
    @Min(0)
    total?: number;

    // Idempotency
    @IsString()
    idempotencyKey: string;
}

export class OrderItemDto {
    @IsString()
    sku: string;

    @IsNumber()
    @Min(1)
    quantity: number;

    @IsOptional()
    @IsNumber()
    @Min(0)
    discount?: number;

    @IsOptional()
    @IsNumber()
    @Min(0)
    priceAtSale?: number;
}

export class UpdateOrderDto {
    @IsOptional()
    @IsEnum(['completed', 'refunded', 'partial_refund'])
    paymentStatus?: 'completed' | 'refunded' | 'partial_refund';

    @IsOptional()
    @IsBoolean()
    syncedToCloud?: boolean;

    @IsOptional()
    @IsBoolean()
    syncedToBackOffice?: boolean;
}

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
