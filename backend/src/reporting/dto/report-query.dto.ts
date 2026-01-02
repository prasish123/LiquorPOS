import { IsDateString, IsOptional, IsString, IsEnum, IsInt, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum ReportPeriod {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  YEARLY = 'yearly',
  CUSTOM = 'custom',
}

export enum ReportFormat {
  JSON = 'json',
  CSV = 'csv',
  EXCEL = 'excel',
  PDF = 'pdf',
}

export class ReportQueryDto {
  @ApiProperty({
    description: 'Start date for the report (ISO 8601)',
    example: '2026-01-01T00:00:00Z',
  })
  @IsDateString()
  startDate: string;

  @ApiProperty({
    description: 'End date for the report (ISO 8601)',
    example: '2026-01-31T23:59:59Z',
  })
  @IsDateString()
  endDate: string;

  @ApiPropertyOptional({
    description: 'Location ID to filter by',
    example: 'loc_123',
  })
  @IsOptional()
  @IsString()
  locationId?: string;

  @ApiPropertyOptional({
    description: 'Report period granularity',
    enum: ReportPeriod,
    default: ReportPeriod.DAILY,
  })
  @IsOptional()
  @IsEnum(ReportPeriod)
  period?: ReportPeriod;

  @ApiPropertyOptional({
    description: 'Export format',
    enum: ReportFormat,
    default: ReportFormat.JSON,
  })
  @IsOptional()
  @IsEnum(ReportFormat)
  format?: ReportFormat;
}

export class ProductReportQueryDto extends ReportQueryDto {
  @ApiPropertyOptional({
    description: 'Limit number of products returned',
    example: 10,
    default: 10,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  limit?: number;

  @ApiPropertyOptional({
    description: 'Product category to filter by',
    example: 'WINE',
  })
  @IsOptional()
  @IsString()
  category?: string;
}

export class EmployeeReportQueryDto extends ReportQueryDto {
  @ApiPropertyOptional({
    description: 'Employee ID to filter by',
    example: 'emp_123',
  })
  @IsOptional()
  @IsString()
  employeeId?: string;
}

