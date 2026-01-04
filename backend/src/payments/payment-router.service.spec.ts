import { Test, TestingModule } from '@nestjs/testing';
import { PaymentRouterService, PaymentProcessor } from './payment-router.service';
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
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentRouterService,
        {
          provide: PaymentAgent,
          useValue: {
            authorize: jest.fn(),
          },
        },
        {
          provide: OfflinePaymentAgent,
          useValue: {
            authorizeOffline: jest.fn(),
            canProcessOffline: jest.fn(),
            getConfig: jest.fn(),
          },
        },
        {
          provide: NetworkStatusService,
          useValue: {
            isOnline: jest.fn(),
            isStripeAvailable: jest.fn(),
          },
        },
        {
          provide: TerminalManagerService,
          useValue: {
            getTerminal: jest.fn(),
            getTerminalHealth: jest.fn(),
          },
        },
        {
          provide: PaxTerminalAgent,
          useValue: {
            processTransaction: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<PaymentRouterService>(PaymentRouterService);
    paymentAgent = module.get(PaymentAgent);
    offlinePaymentAgent = module.get(OfflinePaymentAgent);
    networkStatus = module.get(NetworkStatusService);
    terminalManager = module.get(TerminalManagerService);
    paxAgent = module.get(PaxTerminalAgent);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('routePayment - Cash', () => {
    it('should route cash payment to Stripe when online', async () => {
      networkStatus.isOnline.mockReturnValue(true);
      paymentAgent.authorize.mockResolvedValue({
        paymentId: 'pay-123',
        method: 'cash',
        amount: 50.0,
        status: 'captured',
      });

      const result = await service.routePayment({
        amount: 50.0,
        method: 'cash',
        locationId: 'loc-001',
      });

      expect(result.processor).toBe(PaymentProcessor.STRIPE);
      expect(result.status).toBe('captured');
      expect(paymentAgent.authorize).toHaveBeenCalledWith(50.0, 'cash', undefined);
    });

    it('should route cash payment to offline when offline', async () => {
      networkStatus.isOnline.mockReturnValue(false);
      offlinePaymentAgent.authorizeOffline.mockResolvedValue({
        paymentId: 'pay-123',
        method: 'cash',
        amount: 50.0,
        status: 'captured',
        offlineMode: true,
        requiresOnlineCapture: false,
      });

      const result = await service.routePayment({
        amount: 50.0,
        method: 'cash',
        locationId: 'loc-001',
      });

      expect(result.processor).toBe(PaymentProcessor.OFFLINE);
      expect(result.status).toBe('captured');
    });
  });

  describe('routePayment - Card with PAX', () => {
    it('should route card payment to PAX when terminal available', async () => {
      networkStatus.isStripeAvailable.mockReturnValue(true);
      terminalManager.getTerminal.mockReturnValue({
        id: 'term-001',
        name: 'Counter 1',
        type: 'pax',
        locationId: 'loc-001',
        enabled: true,
        ipAddress: '192.168.1.100',
        port: 10009,
      });
      terminalManager.getTerminalHealth.mockReturnValue({
        terminalId: 'term-001',
        type: 'pax',
        online: true,
        healthy: true,
        lastCheck: new Date(),
      });
      paxAgent.processTransaction.mockResolvedValue({
        success: true,
        transactionId: 'txn-123',
        referenceNumber: 'ref-123',
        amount: 100.0,
        cardType: 'Visa',
        last4: '4242',
        authCode: '123456',
        responseCode: '000000',
        responseMessage: 'APPROVED',
        timestamp: new Date(),
        terminalId: 'term-001',
      });

      const result = await service.routePayment({
        amount: 100.0,
        method: 'card',
        locationId: 'loc-001',
        terminalId: 'term-001',
      });

      expect(result.processor).toBe(PaymentProcessor.PAX);
      expect(result.status).toBe('captured');
      expect(result.cardType).toBe('Visa');
      expect(result.last4).toBe('4242');
      expect(paxAgent.processTransaction).toHaveBeenCalledWith('term-001', {
        amount: 100.0,
        transactionType: 'sale',
        metadata: undefined,
      });
    });

    it('should fallback to Stripe when PAX terminal unavailable', async () => {
      networkStatus.isStripeAvailable.mockReturnValue(true);
      terminalManager.getTerminal.mockReturnValue(undefined);
      paymentAgent.authorize.mockResolvedValue({
        paymentId: 'pay-123',
        method: 'card',
        amount: 100.0,
        status: 'authorized',
        processorId: 'pi_123',
      });

      const result = await service.routePayment({
        amount: 100.0,
        method: 'card',
        locationId: 'loc-001',
        terminalId: 'term-001',
      });

      expect(result.processor).toBe(PaymentProcessor.STRIPE);
      expect(paymentAgent.authorize).toHaveBeenCalled();
    });
  });

  describe('routePayment - Preferred Processor', () => {
    it('should use preferred processor when available', async () => {
      networkStatus.isStripeAvailable.mockReturnValue(true);
      paymentAgent.authorize.mockResolvedValue({
        paymentId: 'pay-123',
        method: 'card',
        amount: 75.0,
        status: 'authorized',
        processorId: 'pi_123',
      });

      const result = await service.routePayment({
        amount: 75.0,
        method: 'card',
        locationId: 'loc-001',
        preferredProcessor: PaymentProcessor.STRIPE,
      });

      expect(result.processor).toBe(PaymentProcessor.STRIPE);
    });

    it('should fallback when preferred processor unavailable', async () => {
      networkStatus.isStripeAvailable.mockReturnValue(false);
      offlinePaymentAgent.canProcessOffline.mockResolvedValue({
        allowed: true,
      });
      offlinePaymentAgent.authorizeOffline.mockResolvedValue({
        paymentId: 'pay-123',
        method: 'card',
        amount: 75.0,
        status: 'offline_pending',
        offlineMode: true,
        requiresOnlineCapture: true,
      });

      const result = await service.routePayment({
        amount: 75.0,
        method: 'card',
        locationId: 'loc-001',
        preferredProcessor: PaymentProcessor.STRIPE,
      });

      expect(result.processor).toBe(PaymentProcessor.OFFLINE);
    });
  });

  describe('getAvailableProcessors', () => {
    it('should return all available processors', async () => {
      networkStatus.isStripeAvailable.mockReturnValue(true);
      terminalManager.getTerminal.mockReturnValue({
        id: 'term-001',
        name: 'Counter 1',
        type: 'pax',
        locationId: 'loc-001',
        enabled: true,
        ipAddress: '192.168.1.100',
        port: 10009,
      });
      terminalManager.getTerminalHealth.mockReturnValue({
        terminalId: 'term-001',
        type: 'pax',
        online: true,
        healthy: true,
        lastCheck: new Date(),
      });
      offlinePaymentAgent.canProcessOffline.mockResolvedValue({
        allowed: true,
      });

      const processors = await service.getAvailableProcessors({
        amount: 50.0,
        method: 'card',
        locationId: 'loc-001',
        terminalId: 'term-001',
      });

      expect(processors).toContain(PaymentProcessor.STRIPE);
      expect(processors).toContain(PaymentProcessor.PAX);
      expect(processors).toContain(PaymentProcessor.OFFLINE);
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
        requireManagerApproval: false,
        allowedPaymentMethods: ['cash', 'card'],
      });

      const health = await service.getProcessorHealth();

      expect(health[PaymentProcessor.STRIPE]).toBeDefined();
      expect(health[PaymentProcessor.STRIPE].available).toBe(true);
      expect(health[PaymentProcessor.PAX]).toBeDefined();
      expect(health[PaymentProcessor.OFFLINE]).toBeDefined();
      expect(health[PaymentProcessor.OFFLINE].available).toBe(true);
    });
  });
});

