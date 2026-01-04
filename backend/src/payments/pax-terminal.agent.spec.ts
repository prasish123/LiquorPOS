import { Test, TestingModule } from '@nestjs/testing';
import { PaxTerminalAgent, PaxTerminalConfig } from './pax-terminal.agent';
import { PrismaService } from '../prisma.service';

describe('PaxTerminalAgent', () => {
  let agent: PaxTerminalAgent;
  let prisma: jest.Mocked<PrismaService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaxTerminalAgent,
        {
          provide: PrismaService,
          useValue: {
            eventLog: {
              create: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    agent = module.get<PaxTerminalAgent>(PaxTerminalAgent);
    prisma = module.get(PrismaService);
  });

  it('should be defined', () => {
    expect(agent).toBeDefined();
  });

  describe('registerTerminal', () => {
    it('should register a valid PAX terminal', async () => {
      const config: PaxTerminalConfig = {
        terminalId: 'term-001',
        ipAddress: '192.168.1.100',
        port: 10009,
        timeout: 30000,
        enabled: true,
        locationId: 'loc-001',
        serialNumber: 'PAX-A920-12345',
        model: 'A920Pro',
      };

      await expect(agent.registerTerminal(config)).resolves.not.toThrow();
    });

    it('should reject invalid terminal configuration', async () => {
      const config: PaxTerminalConfig = {
        terminalId: '',
        ipAddress: '192.168.1.100',
        port: 10009,
        timeout: 30000,
        enabled: true,
        locationId: 'loc-001',
      };

      await expect(agent.registerTerminal(config)).rejects.toThrow(
        'Terminal ID is required',
      );
    });

    it('should reject invalid IP address', async () => {
      const config: PaxTerminalConfig = {
        terminalId: 'term-001',
        ipAddress: 'invalid-ip',
        port: 10009,
        timeout: 30000,
        enabled: true,
        locationId: 'loc-001',
      };

      await expect(agent.registerTerminal(config)).rejects.toThrow(
        'Invalid IP address format',
      );
    });

    it('should reject invalid port', async () => {
      const config: PaxTerminalConfig = {
        terminalId: 'term-001',
        ipAddress: '192.168.1.100',
        port: 99999,
        timeout: 30000,
        enabled: true,
        locationId: 'loc-001',
      };

      await expect(agent.registerTerminal(config)).rejects.toThrow(
        'Invalid port number',
      );
    });
  });

  describe('unregisterTerminal', () => {
    it('should unregister a terminal', async () => {
      const config: PaxTerminalConfig = {
        terminalId: 'term-001',
        ipAddress: '192.168.1.100',
        port: 10009,
        timeout: 30000,
        enabled: true,
        locationId: 'loc-001',
      };

      await agent.registerTerminal(config);
      await expect(agent.unregisterTerminal('term-001')).resolves.not.toThrow();
    });
  });

  describe('getRegisteredTerminals', () => {
    it('should return list of registered terminals', async () => {
      const config1: PaxTerminalConfig = {
        terminalId: 'term-001',
        ipAddress: '192.168.1.100',
        port: 10009,
        timeout: 30000,
        enabled: true,
        locationId: 'loc-001',
      };

      const config2: PaxTerminalConfig = {
        terminalId: 'term-002',
        ipAddress: '192.168.1.101',
        port: 10009,
        timeout: 30000,
        enabled: true,
        locationId: 'loc-001',
      };

      await agent.registerTerminal(config1);
      await agent.registerTerminal(config2);

      const terminals = agent.getRegisteredTerminals();
      expect(terminals).toHaveLength(2);
      expect(terminals.find((t) => t.terminalId === 'term-001')).toBeDefined();
      expect(terminals.find((t) => t.terminalId === 'term-002')).toBeDefined();
    });
  });

  describe('processTransaction', () => {
    it('should throw error for unregistered terminal', async () => {
      await expect(
        agent.processTransaction('term-999', {
          amount: 50.0,
          transactionType: 'sale',
        }),
      ).rejects.toThrow('Terminal term-999 not registered');
    });

    it('should throw error for disabled terminal', async () => {
      const config: PaxTerminalConfig = {
        terminalId: 'term-001',
        ipAddress: '192.168.1.100',
        port: 10009,
        timeout: 30000,
        enabled: false,
        locationId: 'loc-001',
      };

      await agent.registerTerminal(config);

      await expect(
        agent.processTransaction('term-001', {
          amount: 50.0,
          transactionType: 'sale',
        }),
      ).rejects.toThrow('Terminal term-001 is disabled');
    });
  });

  describe('getTerminalStatus', () => {
    it('should throw error for unregistered terminal', async () => {
      await expect(agent.getTerminalStatus('term-999')).rejects.toThrow(
        'Terminal term-999 not registered',
      );
    });
  });

  describe('cancelTransaction', () => {
    it('should attempt to cancel transaction', async () => {
      const config: PaxTerminalConfig = {
        terminalId: 'term-001',
        ipAddress: '192.168.1.100',
        port: 10009,
        timeout: 30000,
        enabled: true,
        locationId: 'loc-001',
      };

      await agent.registerTerminal(config);

      // This will fail because terminal is not actually connected
      // but it should attempt the operation
      await expect(agent.cancelTransaction('term-001')).rejects.toThrow();
    });
  });
});

