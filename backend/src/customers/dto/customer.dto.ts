import { IsString, IsEmail, IsBoolean, IsNumber, IsNotEmpty, IsOptional, IsDateString, Min } from 'class-validator';

export class CreateCustomerDto {
    @IsEmail()
    @IsOptional()
    email?: string;

    @IsString()
    @IsOptional()
    phone?: string;

    @IsString()
    @IsNotEmpty()
    firstName: string;

    @IsString()
    @IsNotEmpty()
    lastName: string;

    @IsBoolean()
    @IsOptional()
    ageVerified?: boolean;

    @IsDateString()
    @IsOptional()
    dateOfBirth?: string;

    @IsString()
    @IsOptional()
    idScanUrl?: string;
}

export class UpdateCustomerDto {
    @IsEmail()
    @IsOptional()
    email?: string;

    @IsString()
    @IsOptional()
    phone?: string;

    @IsString()
    @IsOptional()
    firstName?: string;

    @IsString()
    @IsOptional()
    lastName?: string;

    @IsBoolean()
    @IsOptional()
    ageVerified?: boolean;

    @IsDateString()
    @IsOptional()
    dateOfBirth?: string;

    @IsString()
    @IsOptional()
    idScanUrl?: string;
}

export class UpdateLoyaltyPointsDto {
    @IsNumber()
    @IsNotEmpty()
    points: number; // Can be positive or negative

    @IsString()
    @IsOptional()
    reason?: string; // e.g., "purchase", "birthday", "correction"
}

export class SearchCustomerDto {
    @IsString()
    @IsNotEmpty()
    query: string; // Search by email, phone, or name

    @IsNumber()
    @IsOptional()
    @Min(1)
    limit?: number;
}
