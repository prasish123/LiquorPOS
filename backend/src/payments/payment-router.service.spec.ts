import { Test, TestingModule } from '@nestjs/testing';
import {
  PaymentRouterService,
  PaymentProcessor,
  PaymentRoutingRequest,
} from './payment-router.service';
import { PaymentAgent } from '../orders/agents/payment.agent';
import { OfflinePaymentAgent } from '../orders/agents/offline-payment.agent';
import { NetworkStatusService } from '../common/network-status.service';
import { TerminalManagerService } from './terminal-manager.service';
import { PaxTerminalAgent } from './pax-terminal.agent';

describe('PaymentRouterService', () => {
  let service: PaymentRouterService;
  let paymentAgent: jest.Mocked<PaymentAgent>;
  let offlinePaymentAgent: jest.Mocked<OfflinePaymentAgent>;
  let networkStatus: jest.Mocked<NetworkStatusService>;
  let terminalManager: jest.Mocked<TerminalManagerService>;
  let paxAgent: jest.Mocked<PaxTerminalAgent>;

  beforeEach(async () => {
    const mockPaymentAgent = {
      authorize: jest.fn(),
    };

    const mockOfflinePaymentAgent = {
      authorizeOffline: jest.fn(),
      canProcessOffline: jest.fn(),
      getConfig: jest.fn(),
    };

    const mockNetworkStatus = {
      isOnline: jest.fn(),
      isStripeAvailable: jest.fn(),
    };

    const mockTerminalManager = {
      getTerminal: jest.fn(),
      getTerminalHealth: jest.fn(),
    };

    const mockPaxAgent = {
      processTransaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentRouterService,
        { provide: PaymentAgent, useValue: mockPaymentAgent },
        { provide: OfflinePaymentAgent, useValue: mockOfflinePaymentAgent },
        { provide: NetworkStatusService, useValue: mockNetworkStatus },
        { provide: TerminalManagerService, useValue: mockTerminalManager },
        { provide: PaxTerminalAgent, useValue: mockPaxAgent },
      ],
    }).compile();

    service = module.get<PaymentRouterService>(PaymentRouterService);
    paymentAgent = module.get(PaymentAgent);
    offlinePaymentAgent = module.get(OfflinePaymentAgent);
    networkStatus = module.get(NetworkStatusService);
    terminalManager = module.get(TerminalManagerService);
    paxAgent = module.get(PaxTerminalAgent);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('routePayment - Cash Payments', () => {
    it('should route cash payment to Stripe when online', async () => {
      const request: PaymentRoutingRequest = {
        amount: 50.0,
        method: 'cash',
        locationId: 'loc-1',
      };

      networkStatus.isOnline.mockReturnValue(true);
      paymentAgent.authorize.mockResolvedValue({
        paymentId: 'pay-1',
        method: 'cash',
        amount: 50.0,
        status: 'captured',
      });

      const result = await service.routePayment(request);

      expect(result).toEqual({
        paymentId: 'pay-1',
        processor: PaymentProcessor.STRIPE,
        method: 'cash',
        amount: 50.0,
        status: 'captured',
        processorId: undefined,
        cardType: undefined,
        last4: undefined,
        errorMessage: undefined,
      });

      expect(paymentAgent.authorize).toHaveBeenCalledWith(50.0, 'cash', undefined);
    });

    it('should route cash payment to offline when network unavailable', async () => {
      const request: PaymentRoutingRequest = {
        amount: 30.0,
        method: 'cash',
        locationId: 'loc-1',
      };

      networkStatus.isOnline.mockReturnValue(false);
      offlinePaymentAgent.authorizeOffline.mockResolvedValue({
        paymentId: 'pay-offline-1',
        method: 'cash',
        amount: 30.0,
        status: 'captured',
        offlineMode: true,
      });

      const result = await service.routePayment(request);

      expect(result.processor).toBe(PaymentProcessor.OFFLINE);
      expect(result.method).toBe('cash');
      expect(result.amount).toBe(30.0);
      expect(offlinePaymentAgent.authorizeOffline).toHaveBeenCalled();
    });
  });

  describe('routePayment - Card Payments', () => {
    it('should route card payment to PAX when terminal available', async () => {
      const request: PaymentRoutingRequest = {
        amount: 100.0,
        method: 'card',
        locationId: 'loc-1',
        terminalId: 'term-1',
      };

      terminalManager.getTerminal.mockReturnValue({
        id: 'term-1',
        type: 'pax',
        enabled: true,
        locationId: 'loc-1',
      } as any);

      terminalManager.getTerminalHealth.mockReturnValue({
        online: true,
        healthy: true,
      } as any);

      paxAgent.processTransaction.mockResolvedValue({
        success: true,
        transactionId: 'pax-txn-1',
        amount: 100.0,
        referenceNumber: 'REF-123',
        cardType: 'Visa',
        last4: '4242',
        authCode: 'AUTH-456',
        responseCode: '00',
        responseMessage: 'Approved',
        terminalId: 'term-1',
      });

      const result = await service.routePayment(request);

      expect(result).toEqual({
        paymentId: 'pax-txn-1',
        processor: PaymentProcessor.PAX,
        method: 'card',
        amount: 100.0,
        status: 'captured',
        processorId: 'REF-123',
        cardType: 'Visa',
        last4: '4242',
        metadata: {
          authCode: 'AUTH-456',
          responseCode: '00',
          terminalId: 'term-1',
        },
      });

      expect(paxAgent.processTransaction).toHaveBeenCalledWith('term-1', {
        amount: 100.0,
        transactionType: 'sale',
        metadata: undefined,
      });
    });

    it('should route card payment to Stripe when no PAX terminal', async () => {
      const request: PaymentRoutingRequest = {
        amount: 75.0,
        method: 'card',
        locationId: 'loc-1',
      };

      networkStatus.isStripeAvailable.mockReturnValue(true);
      paymentAgent.authorize.mockResolvedValue({
        paymentId: 'pay-2',
        method: 'card',
        amount: 75.0,
        status: 'authorized',
        processorId: 'pi_test_123',
      });

      const result = await service.routePayment(request);

      expect(result.processor).toBe(PaymentProcessor.STRIPE);
      expect(result.method).toBe('card');
      expect(result.amount).toBe(75.0);
      expect(result.status).toBe('authorized');
      expect(paymentAgent.authorize).toHaveBeenCalledWith(75.0, 'card', undefined);
    });

    it('should route card payment to offline when Stripe unavailable', async () => {
      const request: PaymentRoutingRequest = {
        amount: 50.0,
        method: 'card',
        locationId: 'loc-1',
      };

      networkStatus.isStripeAvailable.mockReturnValue(false);
      offlinePaymentAgent.authorizeOffline.mockResolvedValue({
        paymentId: 'pay-offline-2',
        method: 'card',
        amount: 50.0,
        status: 'authorized',
        offlineMode: true,
        requiresOnlineCapture: true,
      });

      const result = await service.routePayment(request);

      expect(result.processor).toBe(PaymentProcessor.OFFLINE);
      expect(result.requiresOnlineCapture).toBe(true);
      expect(offlinePaymentAgent.authorizeOffline).toHaveBeenCalled();
    });
  });

  describe('routePayment - Preferred Processor', () => {
    it('should use preferred processor when available', async () => {
      const request: PaymentRoutingRequest = {
        amount: 100.0,
        method: 'card',
        locationId: 'loc-1',
        preferredProcessor: PaymentProcessor.STRIPE,
      };

      networkStatus.isStripeAvailable.mockReturnValue(true);
      paymentAgent.authorize.mockResolvedValue({
        paymentId: 'pay-3',
        method: 'card',
        amount: 100.0,
        status: 'authorized',
      });

      const result = await service.routePayment(request);

      expect(result.processor).toBe(PaymentProcessor.STRIPE);
      expect(paymentAgent.authorize).toHaveBeenCalled();
    });

    it('should fallback when preferred processor unavailable', async () => {
      const request: PaymentRoutingRequest = {
        amount: 100.0,
        method: 'card',
        locationId: 'loc-1',
        preferredProcessor: PaymentProcessor.PAX,
        terminalId: 'term-1',
      };

      // PAX terminal not available
      terminalManager.getTerminal.mockReturnValue(null);

      // Fallback to Stripe
      networkStatus.isStripeAvailable.mockReturnValue(true);
      paymentAgent.authorize.mockResolvedValue({
        paymentId: 'pay-4',
        method: 'card',
        amount: 100.0,
        status: 'authorized',
      });

      const result = await service.routePayment(request);

      expect(result.processor).toBe(PaymentProcessor.STRIPE);
    });
  });

  describe('routePayment - Error Handling', () => {
    it('should fallback to offline when primary processor fails', async () => {
      const request: PaymentRoutingRequest = {
        amount: 100.0,
        method: 'card',
        locationId: 'loc-1',
      };

      networkStatus.isStripeAvailable.mockReturnValue(true);
      paymentAgent.authorize.mockRejectedValue(new Error('Stripe API error'));

      offlinePaymentAgent.authorizeOffline.mockResolvedValue({
        paymentId: 'pay-offline-3',
        method: 'card',
        amount: 100.0,
        status: 'authorized',
        offlineMode: true,
        requiresOnlineCapture: true,
      });

      const result = await service.routePayment(request);

      expect(result.processor).toBe(PaymentProcessor.OFFLINE);
      expect(result.requiresOnlineCapture).toBe(true);
      expect(offlinePaymentAgent.authorizeOffline).toHaveBeenCalled();
    });

    it('should throw error when all processors fail', async () => {
      const request: PaymentRoutingRequest = {
        amount: 100.0,
        method: 'card',
        locationId: 'loc-1',
      };

      networkStatus.isStripeAvailable.mockReturnValue(true);
      paymentAgent.authorize.mockRejectedValue(new Error('Stripe failed'));
      offlinePaymentAgent.authorizeOffline.mockRejectedValue(new Error('Offline failed'));

      await expect(service.routePayment(request)).rejects.toThrow('Offline failed');
    });

    it('should throw error when PAX transaction fails', async () => {
      const request: PaymentRoutingRequest = {
        amount: 100.0,
        method: 'card',
        locationId: 'loc-1',
        terminalId: 'term-1',
      };

      terminalManager.getTerminal.mockReturnValue({
        id: 'term-1',
        type: 'pax',
        enabled: true,
      } as any);

      terminalManager.getTerminalHealth.mockReturnValue({
        online: true,
        healthy: true,
      } as any);

      paxAgent.processTransaction.mockResolvedValue({
        success: false,
        responseCode: '05',
        responseMessage: 'Card declined',
      } as any);

      offlinePaymentAgent.authorizeOffline.mockResolvedValue({
        paymentId: 'pay-offline-4',
        method: 'card',
        amount: 100.0,
        status: 'authorized',
        offlineMode: true,
      });

      const result = await service.routePayment(request);

      // Should fallback to offline
      expect(result.processor).toBe(PaymentProcessor.OFFLINE);
    });
  });

  describe('getAvailableProcessors', () => {
    it('should return all available processors', async () => {
      const request: PaymentRoutingRequest = {
        amount: 100.0,
        method: 'card',
        locationId: 'loc-1',
        terminalId: 'term-1',
      };

      networkStatus.isStripeAvailable.mockReturnValue(true);

      terminalManager.getTerminal.mockReturnValue({
        id: 'term-1',
        type: 'pax',
        enabled: true,
      } as any);

      terminalManager.getTerminalHealth.mockReturnValue({
        online: true,
        healthy: true,
      } as any);

      offlinePaymentAgent.canProcessOffline.mockResolvedValue({
        allowed: true,
        reason: 'Within limits',
      });

      const processors = await service.getAvailableProcessors(request);

      expect(processors).toContain(PaymentProcessor.STRIPE);
      expect(processors).toContain(PaymentProcessor.PAX);
      expect(processors).toContain(PaymentProcessor.OFFLINE);
    });

    it('should return only offline when network unavailable', async () => {
      const request: PaymentRoutingRequest = {
        amount: 50.0,
        method: 'cash',
        locationId: 'loc-1',
      };

      networkStatus.isStripeAvailable.mockReturnValue(false);

      offlinePaymentAgent.canProcessOffline.mockResolvedValue({
        allowed: true,
        reason: 'Within limits',
      });

      const processors = await service.getAvailableProcessors(request);

      expect(processors).toEqual([PaymentProcessor.OFFLINE]);
    });
  });

  describe('getProcessorHealth', () => {
    it('should return health status for all processors', async () => {
      networkStatus.isStripeAvailable.mockReturnValue(true);
      networkStatus.isOnline.mockReturnValue(true);

      offlinePaymentAgent.getConfig.mockReturnValue({
        enabled: true,
        maxTransactionAmount: 500,
        maxDailyTotal: 5000,
      } as any);

      const health = await service.getProcessorHealth();

      expect(health[PaymentProcessor.STRIPE]).toEqual({
        available: true,
        lastCheck: expect.any(Date),
        details: {
          online: true,
        },
      });

      expect(health[PaymentProcessor.OFFLINE]).toEqual({
        available: true,
        lastCheck: expect.any(Date),
        details: {
          enabled: true,
          maxTransactionAmount: 500,
          maxDailyTotal: 5000,
        },
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing terminal ID for PAX', async () => {
      const request: PaymentRoutingRequest = {
        amount: 100.0,
        method: 'card',
        locationId: 'loc-1',
        // No terminalId provided
      };

      networkStatus.isStripeAvailable.mockReturnValue(true);
      paymentAgent.authorize.mockResolvedValue({
        paymentId: 'pay-5',
        method: 'card',
        amount: 100.0,
        status: 'authorized',
      });

      const result = await service.routePayment(request);

      // Should route to Stripe since no terminal ID
      expect(result.processor).toBe(PaymentProcessor.STRIPE);
    });

    it('should handle disabled PAX terminal', async () => {
      const request: PaymentRoutingRequest = {
        amount: 100.0,
        method: 'card',
        locationId: 'loc-1',
        terminalId: 'term-1',
      };

      terminalManager.getTerminal.mockReturnValue({
        id: 'term-1',
        type: 'pax',
        enabled: false, // Disabled
      } as any);

      networkStatus.isStripeAvailable.mockReturnValue(true);
      paymentAgent.authorize.mockResolvedValue({
        paymentId: 'pay-6',
        method: 'card',
        amount: 100.0,
        status: 'authorized',
      });

      const result = await service.routePayment(request);

      // Should route to Stripe since terminal disabled
      expect(result.processor).toBe(PaymentProcessor.STRIPE);
    });

    it('should handle unhealthy PAX terminal', async () => {
      const request: PaymentRoutingRequest = {
        amount: 100.0,
        method: 'card',
        locationId: 'loc-1',
        terminalId: 'term-1',
      };

      terminalManager.getTerminal.mockReturnValue({
        id: 'term-1',
        type: 'pax',
        enabled: true,
      } as any);

      terminalManager.getTerminalHealth.mockReturnValue({
        online: false, // Unhealthy
        healthy: false,
      } as any);

      networkStatus.isStripeAvailable.mockReturnValue(true);
      paymentAgent.authorize.mockResolvedValue({
        paymentId: 'pay-7',
        method: 'card',
        amount: 100.0,
        status: 'authorized',
      });

      const result = await service.routePayment(request);

      // Should route to Stripe since terminal unhealthy
      expect(result.processor).toBe(PaymentProcessor.STRIPE);
    });

    it('should handle split payment method', async () => {
      const request: PaymentRoutingRequest = {
        amount: 100.0,
        method: 'split',
        locationId: 'loc-1',
      };

      networkStatus.isStripeAvailable.mockReturnValue(true);
      paymentAgent.authorize.mockResolvedValue({
        paymentId: 'pay-8',
        method: 'split',
        amount: 100.0,
        status: 'authorized',
      });

      const result = await service.routePayment(request);

      expect(result.processor).toBe(PaymentProcessor.STRIPE);
      expect(result.method).toBe('split');
    });

    it('should pass metadata to processors', async () => {
      const request: PaymentRoutingRequest = {
        amount: 100.0,
        method: 'card',
        locationId: 'loc-1',
        metadata: {
          employeeId: 'emp-1',
          customerId: 'cust-1',
        },
      };

      networkStatus.isStripeAvailable.mockReturnValue(true);
      paymentAgent.authorize.mockResolvedValue({
        paymentId: 'pay-9',
        method: 'card',
        amount: 100.0,
        status: 'authorized',
      });

      await service.routePayment(request);

      expect(paymentAgent.authorize).toHaveBeenCalledWith(100.0, 'card', {
        employeeId: 'emp-1',
        customerId: 'cust-1',
      });
    });
  });
});
