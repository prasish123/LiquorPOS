import { IsString, IsNotEmpty, IsOptional, IsDateString } from 'class-validator';

export class CreateLocationDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  address: string;

  @IsString()
  @IsNotEmpty()
  city: string;

  @IsString()
  @IsNotEmpty()
  state: string;

  @IsString()
  @IsNotEmpty()
  zip: string;

  @IsString()
  @IsOptional()
  licenseNumber?: string;

  @IsDateString()
  @IsOptional()
  licenseExpiry?: string;
}

export class UpdateLocationDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  city?: string;

  @IsString()
  @IsOptional()
  state?: string;

  @IsString()
  @IsOptional()
  zip?: string;

  @IsString()
  @IsOptional()
  licenseNumber?: string;

  @IsDateString()
  @IsOptional()
  licenseExpiry?: string;
}
