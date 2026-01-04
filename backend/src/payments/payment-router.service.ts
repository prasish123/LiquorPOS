import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { PaymentAgent } from '../orders/agents/payment.agent';
import { OfflinePaymentAgent } from '../orders/agents/offline-payment.agent';
import { NetworkStatusService } from '../common/network-status.service';
import { TerminalManagerService } from './terminal-manager.service';
import { PaxTerminalAgent } from './pax-terminal.agent';

/**
 * Payment processor types supported by the system
 */
export enum PaymentProcessor {
  STRIPE = 'stripe',
  PAX = 'pax',
  OFFLINE = 'offline',
}

/**
 * Payment method types
 */
export type PaymentMethod = 'cash' | 'card' | 'split';

/**
 * Payment routing request
 */
export interface PaymentRoutingRequest {
  amount: number;
  method: PaymentMethod;
  locationId: string;
  terminalId?: string;
  metadata?: Record<string, any>;
  preferredProcessor?: PaymentProcessor;
}

/**
 * Payment routing result
 */
export interface PaymentRoutingResult {
  paymentId: string;
  processor: PaymentProcessor;
  method: PaymentMethod;
  amount: number;
  status: 'authorized' | 'captured' | 'failed' | 'offline_pending';
  processorId?: string;
  cardType?: string;
  last4?: string;
  errorMessage?: string;
  requiresOnlineCapture?: boolean;
  metadata?: Record<string, any>;
}

/**
 * Payment Router Service
 * 
 * Intelligently routes payment requests to the appropriate payment processor
 * based on:
 * - Payment method (cash, card)
 * - Network availability
 * - Terminal capabilities
 * - Processor availability
 * - Business rules and preferences
 * 
 * Routing Priority:
 * 1. Cash payments -> Always processed locally (captured immediately)
 * 2. Card payments with PAX terminal -> Route to PAX
 * 3. Card payments without PAX -> Route to Stripe
 * 4. Fallback to offline mode if network unavailable
 */
@Injectable()
export class PaymentRouterService {
  private readonly logger = new Logger(PaymentRouterService.name);

  constructor(
    private readonly paymentAgent: PaymentAgent,
    private readonly offlinePaymentAgent: OfflinePaymentAgent,
    private readonly networkStatus: NetworkStatusService,
    @Inject(forwardRef(() => TerminalManagerService))
    private readonly terminalManager: TerminalManagerService,
    @Inject(forwardRef(() => PaxTerminalAgent))
    private readonly paxAgent: PaxTerminalAgent,
  ) {
    this.logger.log('Payment Router Service initialized');
  }

  /**
   * Route payment to appropriate processor
   */
  async routePayment(
    request: PaymentRoutingRequest,
  ): Promise<PaymentRoutingResult> {
    this.logger.log(
      `Routing payment: ${request.method} payment of $${request.amount}`,
      {
        locationId: request.locationId,
        terminalId: request.terminalId,
        preferredProcessor: request.preferredProcessor,
      },
    );

    // Determine which processor to use
    const processor = await this.selectProcessor(request);

    this.logger.debug(`Selected processor: ${processor}`);

    try {
      // Route to the selected processor
      switch (processor) {
        case PaymentProcessor.STRIPE:
          return await this.routeToStripe(request);

        case PaymentProcessor.PAX:
          return await this.routeToPax(request);

        case PaymentProcessor.OFFLINE:
          return await this.routeToOffline(request);

        default:
          throw new Error(`Unknown payment processor: ${processor}`);
      }
    } catch (error) {
      this.logger.error(
        `Payment routing failed for processor ${processor}`,
        error instanceof Error ? error.stack : undefined,
      );

      // Attempt fallback to offline mode if primary processor fails
      if (processor !== PaymentProcessor.OFFLINE) {
        this.logger.warn('Attempting fallback to offline payment processing');
        return await this.routeToOffline(request);
      }

      throw error;
    }
  }

  /**
   * Select the appropriate payment processor based on request and system state
   */
  private async selectProcessor(
    request: PaymentRoutingRequest,
  ): Promise<PaymentProcessor> {
    // If preferred processor is specified and valid, try to use it
    if (request.preferredProcessor) {
      if (await this.isProcessorAvailable(request.preferredProcessor, request)) {
        return request.preferredProcessor;
      }
      this.logger.warn(
        `Preferred processor ${request.preferredProcessor} is not available, selecting alternative`,
      );
    }

    // Cash payments are always processed locally (no external processor needed)
    if (request.method === 'cash') {
      return this.networkStatus.isOnline()
        ? PaymentProcessor.STRIPE // Use Stripe agent for consistency (it handles cash)
        : PaymentProcessor.OFFLINE;
    }

    // For card payments, check terminal capabilities
    if (request.method === 'card') {
      // Check if PAX terminal is available for this terminal
      const hasPaxTerminal = await this.hasPaxTerminal(request.terminalId);

      if (hasPaxTerminal) {
        this.logger.debug('PAX terminal available, routing to PAX');
        return PaymentProcessor.PAX;
      }

      // No PAX terminal, use Stripe if available
      if (this.networkStatus.isStripeAvailable()) {
        this.logger.debug('Stripe available, routing to Stripe');
        return PaymentProcessor.STRIPE;
      }

      // Network unavailable, use offline mode
      this.logger.warn('Network unavailable, routing to offline mode');
      return PaymentProcessor.OFFLINE;
    }

    // Split payments - use Stripe or offline
    if (request.method === 'split') {
      return this.networkStatus.isStripeAvailable()
        ? PaymentProcessor.STRIPE
        : PaymentProcessor.OFFLINE;
    }

    // Default fallback
    return PaymentProcessor.OFFLINE;
  }

  /**
   * Check if a processor is available for the given request
   */
  private async isProcessorAvailable(
    processor: PaymentProcessor,
    request: PaymentRoutingRequest,
  ): Promise<boolean> {
    switch (processor) {
      case PaymentProcessor.STRIPE:
        return this.networkStatus.isStripeAvailable();

      case PaymentProcessor.PAX:
        return await this.hasPaxTerminal(request.terminalId);

      case PaymentProcessor.OFFLINE:
        const canProcess = await this.offlinePaymentAgent.canProcessOffline(
          request.amount,
          request.method === 'card' ? 'card' : 'cash',
          request.locationId,
        );
        return canProcess.allowed;

      default:
        return false;
    }
  }

  /**
   * Check if terminal has PAX device configured
   */
  private async hasPaxTerminal(terminalId?: string): Promise<boolean> {
    if (!terminalId) {
      return false;
    }

    const terminal = this.terminalManager.getTerminal(terminalId);
    if (!terminal) {
      return false;
    }

    // Check if terminal is PAX type and enabled
    if (terminal.type !== 'pax' || !terminal.enabled) {
      return false;
    }

    // Check terminal health
    const health = this.terminalManager.getTerminalHealth(terminalId);
    return health?.online && health?.healthy ? true : false;
  }

  /**
   * Route payment to Stripe processor
   */
  private async routeToStripe(
    request: PaymentRoutingRequest,
  ): Promise<PaymentRoutingResult> {
    this.logger.debug('Processing payment via Stripe');

    const result = await this.paymentAgent.authorize(
      request.amount,
      request.method,
      request.metadata,
    );

    return {
      paymentId: result.paymentId,
      processor: PaymentProcessor.STRIPE,
      method: request.method,
      amount: result.amount,
      status: result.status,
      processorId: result.processorId,
      cardType: result.cardType,
      last4: result.last4,
      errorMessage: result.errorMessage,
    };
  }

  /**
   * Route payment to PAX terminal
   */
  private async routeToPax(
    request: PaymentRoutingRequest,
  ): Promise<PaymentRoutingResult> {
    this.logger.debug('Processing payment via PAX terminal');

    if (!request.terminalId) {
      throw new Error('Terminal ID is required for PAX payments');
    }

    // Process transaction on PAX terminal
    const result = await this.paxAgent.processTransaction(request.terminalId, {
      amount: request.amount,
      transactionType: 'sale',
      metadata: request.metadata,
    });

    if (!result.success) {
      throw new Error(
        `PAX transaction failed: ${result.responseMessage} (${result.responseCode})`,
      );
    }

    return {
      paymentId: result.transactionId,
      processor: PaymentProcessor.PAX,
      method: request.method,
      amount: result.amount,
      status: 'captured', // PAX transactions are immediately captured
      processorId: result.referenceNumber,
      cardType: result.cardType,
      last4: result.last4,
      metadata: {
        authCode: result.authCode,
        responseCode: result.responseCode,
        terminalId: result.terminalId,
      },
    };
  }

  /**
   * Route payment to offline processor
   */
  private async routeToOffline(
    request: PaymentRoutingRequest,
  ): Promise<PaymentRoutingResult> {
    this.logger.debug('Processing payment via offline mode');

    const result = await this.offlinePaymentAgent.authorizeOffline(
      request.amount,
      request.method === 'card' ? 'card' : 'cash',
      request.locationId,
      {
        employeeId: request.metadata?.employeeId,
        terminalId: request.terminalId,
      },
    );

    return {
      paymentId: result.paymentId,
      processor: PaymentProcessor.OFFLINE,
      method: result.method,
      amount: result.amount,
      status: result.status,
      processorId: result.processorId,
      errorMessage: result.errorMessage,
      requiresOnlineCapture: result.requiresOnlineCapture,
      metadata: result.metadata,
    };
  }

  /**
   * Get available processors for a payment request
   */
  async getAvailableProcessors(
    request: PaymentRoutingRequest,
  ): Promise<PaymentProcessor[]> {
    const processors: PaymentProcessor[] = [];

    for (const processor of Object.values(PaymentProcessor)) {
      if (await this.isProcessorAvailable(processor, request)) {
        processors.push(processor);
      }
    }

    return processors;
  }

  /**
   * Get processor health status
   */
  async getProcessorHealth(): Promise<
    Record<
      PaymentProcessor,
      { available: boolean; lastCheck: Date; details?: any }
    >
  > {
    return {
      [PaymentProcessor.STRIPE]: {
        available: this.networkStatus.isStripeAvailable(),
        lastCheck: new Date(),
        details: {
          online: this.networkStatus.isOnline(),
        },
      },
      [PaymentProcessor.PAX]: {
        available: false, // TODO: Implement PAX health check
        lastCheck: new Date(),
        details: {
          message: 'PAX integration pending implementation',
        },
      },
      [PaymentProcessor.OFFLINE]: {
        available: this.offlinePaymentAgent.getConfig().enabled,
        lastCheck: new Date(),
        details: this.offlinePaymentAgent.getConfig(),
      },
    };
  }
}

