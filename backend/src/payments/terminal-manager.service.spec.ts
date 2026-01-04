import { Test, TestingModule } from '@nestjs/testing';
import { TerminalManagerService, TerminalType } from './terminal-manager.service';
import { PrismaService } from '../prisma.service';
import { PaxTerminalAgent } from './pax-terminal.agent';

describe('TerminalManagerService', () => {
  let service: TerminalManagerService;
  let prisma: jest.Mocked<PrismaService>;
  let paxAgent: jest.Mocked<PaxTerminalAgent>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TerminalManagerService,
        {
          provide: PrismaService,
          useValue: {
            paymentTerminal: {
              findMany: jest.fn().mockResolvedValue([]),
              upsert: jest.fn(),
              update: jest.fn(),
            },
          },
        },
        {
          provide: PaxTerminalAgent,
          useValue: {
            registerTerminal: jest.fn(),
            unregisterTerminal: jest.fn(),
            getTerminalStatus: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<TerminalManagerService>(TerminalManagerService);
    prisma = module.get(PrismaService);
    paxAgent = module.get(PaxTerminalAgent);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('registerTerminal', () => {
    it('should register a PAX terminal', async () => {
      paxAgent.getTerminalStatus.mockResolvedValue({
        terminalId: 'term-001',
        online: true,
        lastHeartbeat: new Date(),
      });

      await service.registerTerminal({
        id: 'term-001',
        name: 'Counter 1',
        type: TerminalType.PAX,
        locationId: 'loc-001',
        enabled: true,
        ipAddress: '192.168.1.100',
        port: 10009,
      });

      expect(paxAgent.registerTerminal).toHaveBeenCalled();
      expect(prisma.paymentTerminal.upsert).toHaveBeenCalled();
    });

    it('should register a virtual terminal', async () => {
      await service.registerTerminal({
        id: 'term-002',
        name: 'Virtual Terminal',
        type: TerminalType.VIRTUAL,
        locationId: 'loc-001',
        enabled: true,
      });

      expect(prisma.paymentTerminal.upsert).toHaveBeenCalled();
    });

    it('should reject invalid terminal configuration', async () => {
      await expect(
        service.registerTerminal({
          id: '',
          name: 'Counter 1',
          type: TerminalType.PAX,
          locationId: 'loc-001',
          enabled: true,
        }),
      ).rejects.toThrow('Terminal ID is required');
    });

    it('should reject PAX terminal without IP address', async () => {
      await expect(
        service.registerTerminal({
          id: 'term-001',
          name: 'Counter 1',
          type: TerminalType.PAX,
          locationId: 'loc-001',
          enabled: true,
        }),
      ).rejects.toThrow('IP address is required for PAX terminals');
    });
  });

  describe('getTerminal', () => {
    it('should return terminal by ID', async () => {
      await service.registerTerminal({
        id: 'term-001',
        name: 'Counter 1',
        type: TerminalType.VIRTUAL,
        locationId: 'loc-001',
        enabled: true,
      });

      const terminal = service.getTerminal('term-001');
      expect(terminal).toBeDefined();
      expect(terminal?.id).toBe('term-001');
    });

    it('should return undefined for non-existent terminal', () => {
      const terminal = service.getTerminal('term-999');
      expect(terminal).toBeUndefined();
    });
  });

  describe('getTerminalsByLocation', () => {
    it('should return terminals for a location', async () => {
      await service.registerTerminal({
        id: 'term-001',
        name: 'Counter 1',
        type: TerminalType.VIRTUAL,
        locationId: 'loc-001',
        enabled: true,
      });

      await service.registerTerminal({
        id: 'term-002',
        name: 'Counter 2',
        type: TerminalType.VIRTUAL,
        locationId: 'loc-001',
        enabled: true,
      });

      await service.registerTerminal({
        id: 'term-003',
        name: 'Counter 3',
        type: TerminalType.VIRTUAL,
        locationId: 'loc-002',
        enabled: true,
      });

      const terminals = service.getTerminalsByLocation('loc-001');
      expect(terminals).toHaveLength(2);
    });
  });

  describe('getTerminalsByType', () => {
    it('should return terminals by type', async () => {
      paxAgent.getTerminalStatus.mockResolvedValue({
        terminalId: 'term-001',
        online: true,
        lastHeartbeat: new Date(),
      });

      await service.registerTerminal({
        id: 'term-001',
        name: 'PAX Terminal',
        type: TerminalType.PAX,
        locationId: 'loc-001',
        enabled: true,
        ipAddress: '192.168.1.100',
        port: 10009,
      });

      await service.registerTerminal({
        id: 'term-002',
        name: 'Virtual Terminal',
        type: TerminalType.VIRTUAL,
        locationId: 'loc-001',
        enabled: true,
      });

      const paxTerminals = service.getTerminalsByType(TerminalType.PAX);
      expect(paxTerminals).toHaveLength(1);
      expect(paxTerminals[0].type).toBe(TerminalType.PAX);
    });
  });

  describe('getAvailableTerminals', () => {
    it('should return only enabled terminals', async () => {
      await service.registerTerminal({
        id: 'term-001',
        name: 'Counter 1',
        type: TerminalType.VIRTUAL,
        locationId: 'loc-001',
        enabled: true,
      });

      await service.registerTerminal({
        id: 'term-002',
        name: 'Counter 2',
        type: TerminalType.VIRTUAL,
        locationId: 'loc-001',
        enabled: false,
      });

      const available = service.getAvailableTerminals('loc-001');
      expect(available).toHaveLength(1);
      expect(available[0].id).toBe('term-001');
    });
  });

  describe('updateTerminal', () => {
    it('should update terminal configuration', async () => {
      await service.registerTerminal({
        id: 'term-001',
        name: 'Counter 1',
        type: TerminalType.VIRTUAL,
        locationId: 'loc-001',
        enabled: true,
      });

      await service.updateTerminal('term-001', {
        name: 'Counter 1 - Updated',
        enabled: false,
      });

      const terminal = service.getTerminal('term-001');
      expect(terminal?.name).toBe('Counter 1 - Updated');
      expect(terminal?.enabled).toBe(false);
    });

    it('should throw error for non-existent terminal', async () => {
      await expect(
        service.updateTerminal('term-999', { name: 'Updated' }),
      ).rejects.toThrow('Terminal term-999 not found');
    });
  });

  describe('unregisterTerminal', () => {
    it('should unregister a terminal', async () => {
      await service.registerTerminal({
        id: 'term-001',
        name: 'Counter 1',
        type: TerminalType.VIRTUAL,
        locationId: 'loc-001',
        enabled: true,
      });

      await service.unregisterTerminal('term-001');

      const terminal = service.getTerminal('term-001');
      expect(terminal).toBeUndefined();
    });

    it('should throw error for non-existent terminal', async () => {
      await expect(service.unregisterTerminal('term-999')).rejects.toThrow(
        'Terminal term-999 not found',
      );
    });
  });

  describe('checkTerminalHealth', () => {
    it('should check health of virtual terminal', async () => {
      await service.registerTerminal({
        id: 'term-001',
        name: 'Virtual Terminal',
        type: TerminalType.VIRTUAL,
        locationId: 'loc-001',
        enabled: true,
      });

      const health = await service.checkTerminalHealth('term-001');
      expect(health.online).toBe(true);
      expect(health.healthy).toBe(true);
    });

    it('should check health of PAX terminal', async () => {
      paxAgent.getTerminalStatus.mockResolvedValue({
        terminalId: 'term-001',
        online: true,
        lastHeartbeat: new Date(),
        firmwareVersion: '1.2.3',
        batteryLevel: 85,
        paperStatus: 'ok',
      });

      await service.registerTerminal({
        id: 'term-001',
        name: 'PAX Terminal',
        type: TerminalType.PAX,
        locationId: 'loc-001',
        enabled: true,
        ipAddress: '192.168.1.100',
        port: 10009,
      });

      const health = await service.checkTerminalHealth('term-001');
      expect(health.online).toBe(true);
      expect(health.healthy).toBe(true);
      expect(health.details?.firmwareVersion).toBe('1.2.3');
    });
  });

  describe('findBestTerminal', () => {
    it('should find best available terminal', async () => {
      await service.registerTerminal({
        id: 'term-001',
        name: 'Counter 1',
        type: TerminalType.VIRTUAL,
        locationId: 'loc-001',
        enabled: true,
      });

      await service.registerTerminal({
        id: 'term-002',
        name: 'Counter 2',
        type: TerminalType.VIRTUAL,
        locationId: 'loc-001',
        enabled: false,
      });

      const best = await service.findBestTerminal('loc-001');
      expect(best).toBeDefined();
      expect(best?.id).toBe('term-001');
    });

    it('should prefer specified terminal type', async () => {
      paxAgent.getTerminalStatus.mockResolvedValue({
        terminalId: 'term-001',
        online: true,
        lastHeartbeat: new Date(),
      });

      await service.registerTerminal({
        id: 'term-001',
        name: 'PAX Terminal',
        type: TerminalType.PAX,
        locationId: 'loc-001',
        enabled: true,
        ipAddress: '192.168.1.100',
        port: 10009,
      });

      await service.registerTerminal({
        id: 'term-002',
        name: 'Virtual Terminal',
        type: TerminalType.VIRTUAL,
        locationId: 'loc-001',
        enabled: true,
      });

      const best = await service.findBestTerminal('loc-001', TerminalType.PAX);
      expect(best).toBeDefined();
      expect(best?.type).toBe(TerminalType.PAX);
    });

    it('should return null when no terminals available', async () => {
      const best = await service.findBestTerminal('loc-999');
      expect(best).toBeNull();
    });
  });
});

