import {
  IsString,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsIP,
  Min,
  Max,
  IsNotEmpty,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TerminalType } from '../terminal-manager.service';

/**
 * Register Terminal DTO
 * Used to register a new payment terminal
 */
export class RegisterTerminalDto {
  @ApiProperty({
    description: 'Unique terminal ID',
    example: 'term-001',
  })
  @IsString()
  @IsNotEmpty()
  id: string;

  @ApiProperty({
    description: 'Terminal name',
    example: 'Counter 1 - PAX A920',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Terminal type',
    enum: TerminalType,
    example: TerminalType.PAX,
  })
  @IsEnum(TerminalType)
  type: TerminalType;

  @ApiProperty({
    description: 'Location ID where terminal is installed',
    example: 'loc-001',
  })
  @IsString()
  @IsNotEmpty()
  locationId: string;

  @ApiPropertyOptional({
    description: 'Terminal IP address (required for network terminals)',
    example: '192.168.1.100',
  })
  @IsOptional()
  @IsIP()
  ipAddress?: string;

  @ApiPropertyOptional({
    description: 'Terminal port (required for network terminals)',
    example: 10009,
    minimum: 1,
    maximum: 65535,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(65535)
  port?: number;

  @ApiPropertyOptional({
    description: 'Terminal serial number',
    example: 'PAX-A920-12345',
  })
  @IsOptional()
  @IsString()
  serialNumber?: string;

  @ApiPropertyOptional({
    description: 'Terminal model',
    example: 'A920Pro',
  })
  @IsOptional()
  @IsString()
  model?: string;

  @ApiPropertyOptional({
    description: 'Whether terminal is enabled',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional({
    description: 'Additional metadata (JSON object)',
    example: { location: 'Front counter', notes: 'Primary terminal' },
  })
  @IsOptional()
  metadata?: Record<string, any>;
}

/**
 * Update Terminal DTO
 * Used to update terminal configuration
 */
export class UpdateTerminalDto {
  @ApiPropertyOptional({
    description: 'Terminal name',
    example: 'Counter 1 - PAX A920',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description: 'Terminal IP address',
    example: '192.168.1.100',
  })
  @IsOptional()
  @IsIP()
  ipAddress?: string;

  @ApiPropertyOptional({
    description: 'Terminal port',
    example: 10009,
    minimum: 1,
    maximum: 65535,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(65535)
  port?: number;

  @ApiPropertyOptional({
    description: 'Whether terminal is enabled',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional({
    description: 'Firmware version',
    example: '1.2.3',
  })
  @IsOptional()
  @IsString()
  firmwareVersion?: string;

  @ApiPropertyOptional({
    description: 'Additional metadata (JSON object)',
    example: { location: 'Front counter', notes: 'Primary terminal' },
  })
  @IsOptional()
  metadata?: Record<string, any>;
}

/**
 * Terminal Response DTO
 * Response containing terminal information
 */
export class TerminalResponseDto {
  @ApiProperty({
    description: 'Terminal ID',
    example: 'term-001',
  })
  id: string;

  @ApiProperty({
    description: 'Terminal name',
    example: 'Counter 1 - PAX A920',
  })
  name: string;

  @ApiProperty({
    description: 'Terminal type',
    enum: TerminalType,
    example: TerminalType.PAX,
  })
  type: TerminalType;

  @ApiProperty({
    description: 'Location ID',
    example: 'loc-001',
  })
  locationId: string;

  @ApiProperty({
    description: 'Whether terminal is enabled',
    example: true,
  })
  enabled: boolean;

  @ApiPropertyOptional({
    description: 'Terminal IP address',
    example: '192.168.1.100',
  })
  ipAddress?: string;

  @ApiPropertyOptional({
    description: 'Terminal port',
    example: 10009,
  })
  port?: number;

  @ApiPropertyOptional({
    description: 'Terminal serial number',
    example: 'PAX-A920-12345',
  })
  serialNumber?: string;

  @ApiPropertyOptional({
    description: 'Terminal model',
    example: 'A920Pro',
  })
  model?: string;

  @ApiPropertyOptional({
    description: 'Firmware version',
    example: '1.2.3',
  })
  firmwareVersion?: string;

  @ApiPropertyOptional({
    description: 'Last heartbeat timestamp',
    example: '2026-01-03T12:00:00.000Z',
  })
  lastHeartbeat?: Date;

  @ApiPropertyOptional({
    description: 'Additional metadata',
    example: { location: 'Front counter' },
  })
  metadata?: Record<string, any>;
}

/**
 * Terminal Health Response DTO
 * Response containing terminal health status
 */
export class TerminalHealthResponseDto {
  @ApiProperty({
    description: 'Terminal ID',
    example: 'term-001',
  })
  terminalId: string;

  @ApiProperty({
    description: 'Terminal type',
    enum: TerminalType,
    example: TerminalType.PAX,
  })
  type: TerminalType;

  @ApiProperty({
    description: 'Whether terminal is online',
    example: true,
  })
  online: boolean;

  @ApiProperty({
    description: 'Whether terminal is healthy',
    example: true,
  })
  healthy: boolean;

  @ApiProperty({
    description: 'Last health check timestamp',
    example: '2026-01-03T12:00:00.000Z',
  })
  lastCheck: Date;

  @ApiPropertyOptional({
    description: 'Last heartbeat timestamp',
    example: '2026-01-03T12:00:00.000Z',
  })
  lastHeartbeat?: Date;

  @ApiPropertyOptional({
    description: 'List of issues or warnings',
    example: ['Paper running low', 'Battery at 15%'],
  })
  issues?: string[];

  @ApiPropertyOptional({
    description: 'Additional health details',
    example: {
      firmwareVersion: '1.2.3',
      batteryLevel: 85,
      paperStatus: 'ok',
    },
  })
  details?: any;
}
