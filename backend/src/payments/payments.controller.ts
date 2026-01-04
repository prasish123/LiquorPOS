import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Logger,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PaymentRouterService, PaymentProcessor } from './payment-router.service';
import { PaxTerminalAgent } from './pax-terminal.agent';
import { TerminalManagerService, TerminalType } from './terminal-manager.service';
import {
  RegisterTerminalDto,
  UpdateTerminalDto,
  TerminalResponseDto,
  TerminalHealthResponseDto,
} from './dto/terminal.dto';
import {
  ProcessPaxTransactionDto,
  PaxTransactionResponseDto,
  CancelTransactionDto,
  VoidTransactionDto,
  RefundTransactionDto,
} from './dto/pax-transaction.dto';

@ApiTags('payments')
@ApiBearerAuth('JWT')
@Controller('payments')
@UseGuards(JwtAuthGuard)
export class PaymentsController {
  private readonly logger = new Logger(PaymentsController.name);

  constructor(
    private readonly paymentRouter: PaymentRouterService,
    private readonly paxAgent: PaxTerminalAgent,
    private readonly terminalManager: TerminalManagerService,
  ) {}

  // ============================================================================
  // Terminal Management Endpoints
  // ============================================================================

  @Post('terminals')
  @ApiOperation({
    summary: 'Register a new payment terminal',
    description: 'Register a new payment terminal (PAX, Ingenico, etc.) for a location',
  })
  @ApiResponse({
    status: 201,
    description: 'Terminal registered successfully',
    type: TerminalResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid terminal configuration' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async registerTerminal(
    @Body() dto: RegisterTerminalDto,
  ): Promise<TerminalResponseDto> {
    this.logger.log(`Registering terminal: ${dto.id}`);

    await this.terminalManager.registerTerminal({
      id: dto.id,
      name: dto.name,
      type: dto.type,
      locationId: dto.locationId,
      enabled: dto.enabled ?? true,
      ipAddress: dto.ipAddress,
      port: dto.port,
      serialNumber: dto.serialNumber,
      model: dto.model,
      metadata: dto.metadata,
    });

    const terminal = this.terminalManager.getTerminal(dto.id);
    if (!terminal) {
      throw new Error('Failed to register terminal');
    }

    return this.mapTerminalToResponse(terminal);
  }

  @Get('terminals')
  @ApiOperation({
    summary: 'Get all payment terminals',
    description: 'Retrieve list of all registered payment terminals',
  })
  @ApiQuery({
    name: 'locationId',
    required: false,
    description: 'Filter by location ID',
  })
  @ApiQuery({
    name: 'type',
    required: false,
    enum: TerminalType,
    description: 'Filter by terminal type',
  })
  @ApiResponse({
    status: 200,
    description: 'List of terminals',
    type: [TerminalResponseDto],
  })
  async getTerminals(
    @Query('locationId') locationId?: string,
    @Query('type') type?: TerminalType,
  ): Promise<TerminalResponseDto[]> {
    let terminals;

    if (locationId) {
      terminals = this.terminalManager.getTerminalsByLocation(locationId);
    } else if (type) {
      terminals = this.terminalManager.getTerminalsByType(type);
    } else {
      terminals = this.terminalManager.getAllTerminals();
    }

    return terminals.map((t) => this.mapTerminalToResponse(t));
  }

  @Get('terminals/:id')
  @ApiOperation({
    summary: 'Get terminal by ID',
    description: 'Retrieve details of a specific terminal',
  })
  @ApiParam({ name: 'id', description: 'Terminal ID' })
  @ApiResponse({
    status: 200,
    description: 'Terminal details',
    type: TerminalResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Terminal not found' })
  async getTerminal(@Param('id') id: string): Promise<TerminalResponseDto> {
    const terminal = this.terminalManager.getTerminal(id);
    if (!terminal) {
      throw new Error(`Terminal ${id} not found`);
    }

    return this.mapTerminalToResponse(terminal);
  }

  @Put('terminals/:id')
  @ApiOperation({
    summary: 'Update terminal configuration',
    description: 'Update configuration of an existing terminal',
  })
  @ApiParam({ name: 'id', description: 'Terminal ID' })
  @ApiResponse({
    status: 200,
    description: 'Terminal updated successfully',
    type: TerminalResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Terminal not found' })
  async updateTerminal(
    @Param('id') id: string,
    @Body() dto: UpdateTerminalDto,
  ): Promise<TerminalResponseDto> {
    this.logger.log(`Updating terminal: ${id}`);

    await this.terminalManager.updateTerminal(id, dto);

    const terminal = this.terminalManager.getTerminal(id);
    if (!terminal) {
      throw new Error(`Terminal ${id} not found`);
    }

    return this.mapTerminalToResponse(terminal);
  }

  @Delete('terminals/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Unregister a terminal',
    description: 'Remove a terminal from the system',
  })
  @ApiParam({ name: 'id', description: 'Terminal ID' })
  @ApiResponse({ status: 204, description: 'Terminal unregistered successfully' })
  @ApiResponse({ status: 404, description: 'Terminal not found' })
  async unregisterTerminal(@Param('id') id: string): Promise<void> {
    this.logger.log(`Unregistering terminal: ${id}`);
    await this.terminalManager.unregisterTerminal(id);
  }

  @Get('terminals/:id/health')
  @ApiOperation({
    summary: 'Get terminal health status',
    description: 'Check health and connectivity status of a terminal',
  })
  @ApiParam({ name: 'id', description: 'Terminal ID' })
  @ApiResponse({
    status: 200,
    description: 'Terminal health status',
    type: TerminalHealthResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Terminal not found' })
  async getTerminalHealth(
    @Param('id') id: string,
  ): Promise<TerminalHealthResponseDto> {
    const health = await this.terminalManager.checkTerminalHealth(id);
    return health;
  }

  @Get('terminals/health/all')
  @ApiOperation({
    summary: 'Get health status of all terminals',
    description: 'Retrieve health status for all registered terminals',
  })
  @ApiResponse({
    status: 200,
    description: 'Health status of all terminals',
    type: [TerminalHealthResponseDto],
  })
  async getAllTerminalHealth(): Promise<TerminalHealthResponseDto[]> {
    return this.terminalManager.getAllTerminalHealth();
  }

  // ============================================================================
  // PAX Transaction Endpoints
  // ============================================================================

  @Post('pax/transaction')
  @ApiOperation({
    summary: 'Process PAX transaction',
    description: 'Initiate a transaction on a PAX terminal (sale, refund, etc.)',
  })
  @ApiResponse({
    status: 200,
    description: 'Transaction processed',
    type: PaxTransactionResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid transaction request' })
  @ApiResponse({ status: 404, description: 'Terminal not found' })
  async processPaxTransaction(
    @Body() dto: ProcessPaxTransactionDto,
  ): Promise<PaxTransactionResponseDto> {
    this.logger.log(
      `Processing PAX ${dto.transactionType} transaction on terminal ${dto.terminalId}`,
    );

    const result = await this.paxAgent.processTransaction(dto.terminalId, {
      amount: dto.amount,
      transactionType: dto.transactionType,
      referenceNumber: dto.referenceNumber,
      invoiceNumber: dto.invoiceNumber,
      metadata: dto.metadata,
    });

    return result;
  }

  @Post('pax/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Cancel PAX transaction',
    description: 'Cancel an in-progress transaction on a PAX terminal',
  })
  @ApiResponse({ status: 200, description: 'Transaction cancelled' })
  @ApiResponse({ status: 404, description: 'Terminal not found' })
  async cancelPaxTransaction(@Body() dto: CancelTransactionDto): Promise<void> {
    this.logger.log(`Cancelling transaction on terminal ${dto.terminalId}`);
    await this.paxAgent.cancelTransaction(dto.terminalId);
  }

  @Post('pax/void')
  @ApiOperation({
    summary: 'Void PAX transaction',
    description: 'Void a previous transaction on a PAX terminal',
  })
  @ApiResponse({
    status: 200,
    description: 'Transaction voided',
    type: PaxTransactionResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid void request' })
  async voidPaxTransaction(
    @Body() dto: VoidTransactionDto,
  ): Promise<PaxTransactionResponseDto> {
    this.logger.log(
      `Voiding transaction ${dto.referenceNumber} on terminal ${dto.terminalId}`,
    );

    const result = await this.paxAgent.processTransaction(dto.terminalId, {
      amount: dto.amount,
      transactionType: 'void',
      referenceNumber: dto.referenceNumber,
    });

    return result;
  }

  @Post('pax/refund')
  @ApiOperation({
    summary: 'Refund PAX transaction',
    description: 'Process a refund on a PAX terminal',
  })
  @ApiResponse({
    status: 200,
    description: 'Refund processed',
    type: PaxTransactionResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid refund request' })
  async refundPaxTransaction(
    @Body() dto: RefundTransactionDto,
  ): Promise<PaxTransactionResponseDto> {
    this.logger.log(
      `Processing refund for transaction ${dto.referenceNumber} on terminal ${dto.terminalId}`,
    );

    const result = await this.paxAgent.processTransaction(dto.terminalId, {
      amount: dto.amount,
      transactionType: 'refund',
      referenceNumber: dto.referenceNumber,
      metadata: { reason: dto.reason },
    });

    return result;
  }

  // ============================================================================
  // Payment Router Endpoints
  // ============================================================================

  @Get('processors/health')
  @ApiOperation({
    summary: 'Get payment processor health',
    description: 'Check health status of all payment processors (Stripe, PAX, Offline)',
  })
  @ApiResponse({
    status: 200,
    description: 'Processor health status',
    schema: {
      example: {
        stripe: {
          available: true,
          lastCheck: '2026-01-03T12:00:00.000Z',
          details: { online: true },
        },
        pax: {
          available: false,
          lastCheck: '2026-01-03T12:00:00.000Z',
          details: { message: 'No PAX terminals registered' },
        },
        offline: {
          available: true,
          lastCheck: '2026-01-03T12:00:00.000Z',
          details: { enabled: true, maxTransactionAmount: 500 },
        },
      },
    },
  })
  async getProcessorHealth(): Promise<
    Record<PaymentProcessor, { available: boolean; lastCheck: Date; details?: any }>
  > {
    return await this.paymentRouter.getProcessorHealth();
  }

  @Get('processors/available')
  @ApiOperation({
    summary: 'Get available payment processors',
    description: 'Get list of available payment processors for a given request',
  })
  @ApiQuery({ name: 'locationId', required: true, description: 'Location ID' })
  @ApiQuery({ name: 'amount', required: true, description: 'Transaction amount' })
  @ApiQuery({
    name: 'method',
    required: true,
    enum: ['cash', 'card', 'split'],
    description: 'Payment method',
  })
  @ApiResponse({
    status: 200,
    description: 'List of available processors',
    schema: {
      example: ['stripe', 'offline'],
    },
  })
  async getAvailableProcessors(
    @Query('locationId') locationId: string,
    @Query('amount') amount: string,
    @Query('method') method: 'cash' | 'card' | 'split',
  ): Promise<PaymentProcessor[]> {
    return await this.paymentRouter.getAvailableProcessors({
      amount: parseFloat(amount),
      method,
      locationId,
    });
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private mapTerminalToResponse(terminal: any): TerminalResponseDto {
    return {
      id: terminal.id,
      name: terminal.name,
      type: terminal.type,
      locationId: terminal.locationId,
      enabled: terminal.enabled,
      ipAddress: terminal.ipAddress,
      port: terminal.port,
      serialNumber: terminal.serialNumber,
      model: terminal.model,
      firmwareVersion: terminal.firmwareVersion,
      lastHeartbeat: terminal.lastHeartbeat,
      metadata: terminal.metadata,
    };
  }
}

