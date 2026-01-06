import { IsString, IsEnum, IsOptional, IsNumber, Min, IsNotEmpty } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Transaction types supported by PAX terminals
 */
export enum PaxTransactionType {
  SALE = 'sale',
  REFUND = 'refund',
  VOID = 'void',
  AUTH = 'auth',
  CAPTURE = 'capture',
}

/**
 * Process PAX Transaction DTO
 * Used to initiate a transaction on a PAX terminal
 */
export class ProcessPaxTransactionDto {
  @ApiProperty({
    description: 'Terminal ID to process transaction on',
    example: 'term-001',
  })
  @IsString()
  @IsNotEmpty()
  terminalId: string;

  @ApiProperty({
    description: 'Transaction amount in dollars',
    example: 42.99,
    minimum: 0.01,
  })
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiProperty({
    description: 'Transaction type',
    enum: PaxTransactionType,
    example: PaxTransactionType.SALE,
  })
  @IsEnum(PaxTransactionType)
  transactionType: PaxTransactionType;

  @ApiPropertyOptional({
    description: 'Reference number for the transaction',
    example: '20260103120000001',
  })
  @IsOptional()
  @IsString()
  referenceNumber?: string;

  @ApiPropertyOptional({
    description: 'Invoice number',
    example: 'INV-001',
  })
  @IsOptional()
  @IsString()
  invoiceNumber?: string;

  @ApiPropertyOptional({
    description: 'Additional metadata',
    example: { orderId: 'order-123', employeeId: 'emp-001' },
  })
  @IsOptional()
  metadata?: Record<string, any>;
}

/**
 * PAX Transaction Response DTO
 * Response from a PAX transaction
 */
export class PaxTransactionResponseDto {
  @ApiProperty({
    description: 'Whether transaction was successful',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Unique transaction ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  transactionId: string;

  @ApiProperty({
    description: 'Reference number',
    example: '20260103120000001',
  })
  referenceNumber: string;

  @ApiProperty({
    description: 'Transaction amount',
    example: 42.99,
  })
  amount: number;

  @ApiPropertyOptional({
    description: 'Card type',
    example: 'Visa',
  })
  cardType?: string;

  @ApiPropertyOptional({
    description: 'Last 4 digits of card',
    example: '4242',
  })
  last4?: string;

  @ApiPropertyOptional({
    description: 'Authorization code',
    example: '123456',
  })
  authCode?: string;

  @ApiProperty({
    description: 'Response code from terminal',
    example: '000000',
  })
  responseCode: string;

  @ApiProperty({
    description: 'Response message from terminal',
    example: 'APPROVED',
  })
  responseMessage: string;

  @ApiProperty({
    description: 'Transaction timestamp',
    example: '2026-01-03T12:00:00.000Z',
  })
  timestamp: Date;

  @ApiProperty({
    description: 'Terminal ID that processed the transaction',
    example: 'term-001',
  })
  terminalId: string;
}

/**
 * Cancel Transaction DTO
 * Used to cancel an in-progress transaction
 */
export class CancelTransactionDto {
  @ApiProperty({
    description: 'Terminal ID to cancel transaction on',
    example: 'term-001',
  })
  @IsString()
  @IsNotEmpty()
  terminalId: string;
}

/**
 * Void Transaction DTO
 * Used to void a previous transaction
 */
export class VoidTransactionDto {
  @ApiProperty({
    description: 'Terminal ID',
    example: 'term-001',
  })
  @IsString()
  @IsNotEmpty()
  terminalId: string;

  @ApiProperty({
    description: 'Reference number of transaction to void',
    example: '20260103120000001',
  })
  @IsString()
  @IsNotEmpty()
  referenceNumber: string;

  @ApiProperty({
    description: 'Original transaction amount',
    example: 42.99,
  })
  @IsNumber()
  @Min(0.01)
  amount: number;
}

/**
 * Refund Transaction DTO
 * Used to refund a previous transaction
 */
export class RefundTransactionDto {
  @ApiProperty({
    description: 'Terminal ID',
    example: 'term-001',
  })
  @IsString()
  @IsNotEmpty()
  terminalId: string;

  @ApiProperty({
    description: 'Reference number of transaction to refund',
    example: '20260103120000001',
  })
  @IsString()
  @IsNotEmpty()
  referenceNumber: string;

  @ApiProperty({
    description: 'Refund amount',
    example: 42.99,
  })
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiPropertyOptional({
    description: 'Reason for refund',
    example: 'Customer request',
  })
  @IsOptional()
  @IsString()
  reason?: string;
}
