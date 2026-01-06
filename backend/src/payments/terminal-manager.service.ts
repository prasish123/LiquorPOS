import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { PaxTerminalAgent, PaxTerminalConfig, PaxTerminalStatus } from './pax-terminal.agent';
import { Cron, CronExpression } from '@nestjs/schedule';

/**
 * Terminal type
 */
export enum TerminalType {
  PAX = 'pax',
  INGENICO = 'ingenico',
  VERIFONE = 'verifone',
  VIRTUAL = 'virtual', // For testing/simulation
}

/**
 * Terminal configuration
 */
export interface TerminalConfig {
  id: string;
  name: string;
  type: TerminalType;
  locationId: string;
  enabled: boolean;
  ipAddress?: string;
  port?: number;
  serialNumber?: string;
  model?: string;
  firmwareVersion?: string;
  lastHeartbeat?: Date;
  metadata?: Record<string, any>;
}

/**
 * Terminal health status
 */
export interface TerminalHealth {
  terminalId: string;
  type: TerminalType;
  online: boolean;
  healthy: boolean;
  lastCheck: Date;
  lastHeartbeat?: Date;
  issues?: string[];
  details?: any;
}

/**
 * Terminal Manager Service
 *
 * Manages the lifecycle of payment terminals including:
 * - Terminal registration and configuration
 * - Health monitoring and status tracking
 * - Terminal discovery and auto-configuration
 * - Failover and redundancy
 * - Terminal assignment to POS stations
 *
 * Supports multiple terminal types:
 * - PAX terminals (A920, A80, S300, IM30)
 * - Ingenico terminals (future)
 * - Verifone terminals (future)
 * - Virtual terminals (testing)
 */
@Injectable()
export class TerminalManagerService implements OnModuleInit {
  private readonly logger = new Logger(TerminalManagerService.name);
  private terminals: Map<string, TerminalConfig> = new Map();
  private healthStatus: Map<string, TerminalHealth> = new Map();

  constructor(
    private readonly prisma: PrismaService,
    private readonly paxAgent: PaxTerminalAgent,
  ) {}

  async onModuleInit() {
    this.logger.log('Terminal Manager Service initializing...');

    // Load terminals from database
    await this.loadTerminalsFromDatabase();

    // Perform initial health check
    await this.performHealthCheck();

    this.logger.log(`Terminal Manager initialized with ${this.terminals.size} terminals`);
  }

  /**
   * Register a new terminal
   */
  async registerTerminal(config: TerminalConfig): Promise<void> {
    this.logger.log(`Registering terminal: ${config.id} (${config.type})`);

    // Validate configuration
    this.validateTerminalConfig(config);

    // Store in memory
    this.terminals.set(config.id, config);

    // Store in database
    await this.saveTerminalToDatabase(config);

    // Register with appropriate agent
    if (config.type === TerminalType.PAX && config.ipAddress && config.port) {
      const paxConfig: PaxTerminalConfig = {
        terminalId: config.id,
        ipAddress: config.ipAddress,
        port: config.port,
        timeout: 30000,
        enabled: config.enabled,
        locationId: config.locationId,
        serialNumber: config.serialNumber,
        model: config.model,
      };
      await this.paxAgent.registerTerminal(paxConfig);
    }

    // Perform initial health check
    await this.checkTerminalHealth(config.id);

    this.logger.log(`Terminal ${config.id} registered successfully`);
  }

  /**
   * Unregister a terminal
   */
  async unregisterTerminal(terminalId: string): Promise<void> {
    this.logger.log(`Unregistering terminal: ${terminalId}`);

    const terminal = this.terminals.get(terminalId);
    if (!terminal) {
      throw new Error(`Terminal ${terminalId} not found`);
    }

    // Unregister from appropriate agent
    if (terminal.type === TerminalType.PAX) {
      await this.paxAgent.unregisterTerminal(terminalId);
    }

    // Remove from memory
    this.terminals.delete(terminalId);
    this.healthStatus.delete(terminalId);

    // Mark as deleted in database (soft delete)
    await this.prisma.paymentTerminal.update({
      where: { id: terminalId },
      data: { enabled: false, deletedAt: new Date() },
    });

    this.logger.log(`Terminal ${terminalId} unregistered successfully`);
  }

  /**
   * Update terminal configuration
   */
  async updateTerminal(terminalId: string, updates: Partial<TerminalConfig>): Promise<void> {
    this.logger.log(`Updating terminal: ${terminalId}`);

    const terminal = this.terminals.get(terminalId);
    if (!terminal) {
      throw new Error(`Terminal ${terminalId} not found`);
    }

    // Merge updates
    const updatedConfig: TerminalConfig = {
      ...terminal,
      ...updates,
    };

    // Validate
    this.validateTerminalConfig(updatedConfig);

    // Update in memory
    this.terminals.set(terminalId, updatedConfig);

    // Update in database
    await this.saveTerminalToDatabase(updatedConfig);

    // If PAX terminal and connection details changed, re-register
    if (
      terminal.type === TerminalType.PAX &&
      (updates.ipAddress || updates.port || updates.enabled !== undefined)
    ) {
      await this.paxAgent.unregisterTerminal(terminalId);
      if (updatedConfig.enabled && updatedConfig.ipAddress && updatedConfig.port) {
        const paxConfig: PaxTerminalConfig = {
          terminalId: updatedConfig.id,
          ipAddress: updatedConfig.ipAddress,
          port: updatedConfig.port,
          timeout: 30000,
          enabled: updatedConfig.enabled,
          locationId: updatedConfig.locationId,
          serialNumber: updatedConfig.serialNumber,
          model: updatedConfig.model,
        };
        await this.paxAgent.registerTerminal(paxConfig);
      }
    }

    this.logger.log(`Terminal ${terminalId} updated successfully`);
  }

  /**
   * Get terminal by ID
   */
  getTerminal(terminalId: string): TerminalConfig | undefined {
    return this.terminals.get(terminalId);
  }

  /**
   * Get all terminals
   */
  getAllTerminals(): TerminalConfig[] {
    return Array.from(this.terminals.values());
  }

  /**
   * Get terminals by location
   */
  getTerminalsByLocation(locationId: string): TerminalConfig[] {
    return Array.from(this.terminals.values()).filter((t) => t.locationId === locationId);
  }

  /**
   * Get terminals by type
   */
  getTerminalsByType(type: TerminalType): TerminalConfig[] {
    return Array.from(this.terminals.values()).filter((t) => t.type === type);
  }

  /**
   * Get available terminals for a location
   */
  getAvailableTerminals(locationId: string): TerminalConfig[] {
    return Array.from(this.terminals.values()).filter(
      (t) => t.locationId === locationId && t.enabled,
    );
  }

  /**
   * Get terminal health status
   */
  getTerminalHealth(terminalId: string): TerminalHealth | undefined {
    return this.healthStatus.get(terminalId);
  }

  /**
   * Get health status for all terminals
   */
  getAllTerminalHealth(): TerminalHealth[] {
    return Array.from(this.healthStatus.values());
  }

  /**
   * Check health of a specific terminal
   */
  async checkTerminalHealth(terminalId: string): Promise<TerminalHealth> {
    const terminal = this.terminals.get(terminalId);
    if (!terminal) {
      throw new Error(`Terminal ${terminalId} not found`);
    }

    let health: TerminalHealth;

    try {
      if (terminal.type === TerminalType.PAX) {
        const status = await this.paxAgent.getTerminalStatus(terminalId);
        health = this.mapPaxStatusToHealth(status, terminal);
      } else if (terminal.type === TerminalType.VIRTUAL) {
        // Virtual terminals are always healthy
        health = {
          terminalId,
          type: terminal.type,
          online: true,
          healthy: true,
          lastCheck: new Date(),
          lastHeartbeat: new Date(),
        };
      } else {
        // Unsupported terminal type
        health = {
          terminalId,
          type: terminal.type,
          online: false,
          healthy: false,
          lastCheck: new Date(),
          issues: [`Terminal type ${terminal.type} not yet supported`],
        };
      }
    } catch (error) {
      this.logger.error(
        `Health check failed for terminal ${terminalId}`,
        error instanceof Error ? error.stack : undefined,
      );

      health = {
        terminalId,
        type: terminal.type,
        online: false,
        healthy: false,
        lastCheck: new Date(),
        issues: [error instanceof Error ? error.message : 'Unknown error'],
      };
    }

    // Store health status
    this.healthStatus.set(terminalId, health);

    return health;
  }

  /**
   * Perform health check on all terminals
   * Runs every 5 minutes via cron
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async performHealthCheck(): Promise<void> {
    this.logger.debug('Performing health check on all terminals');

    const terminals = Array.from(this.terminals.keys());
    const results = await Promise.allSettled(terminals.map((id) => this.checkTerminalHealth(id)));

    const healthy = results.filter((r) => r.status === 'fulfilled' && r.value.healthy).length;
    const unhealthy = results.filter((r) => r.status === 'fulfilled' && !r.value.healthy).length;
    const failed = results.filter((r) => r.status === 'rejected').length;

    this.logger.log(
      `Health check complete: ${healthy} healthy, ${unhealthy} unhealthy, ${failed} failed`,
    );
  }

  /**
   * Find best available terminal for a location
   */
  async findBestTerminal(
    locationId: string,
    preferredType?: TerminalType,
  ): Promise<TerminalConfig | null> {
    const terminals = this.getAvailableTerminals(locationId);

    if (terminals.length === 0) {
      return null;
    }

    // Filter by preferred type if specified
    let candidates = preferredType ? terminals.filter((t) => t.type === preferredType) : terminals;

    if (candidates.length === 0) {
      candidates = terminals; // Fallback to all available terminals
    }

    // Sort by health status (healthy first, then by last heartbeat)
    candidates.sort((a, b) => {
      const healthA = this.healthStatus.get(a.id);
      const healthB = this.healthStatus.get(b.id);

      if (!healthA && !healthB) return 0;
      if (!healthA) return 1;
      if (!healthB) return -1;

      if (healthA.healthy !== healthB.healthy) {
        return healthA.healthy ? -1 : 1;
      }

      const timeA = healthA.lastHeartbeat?.getTime() || 0;
      const timeB = healthB.lastHeartbeat?.getTime() || 0;
      return timeB - timeA;
    });

    return candidates[0] || null;
  }

  /**
   * Validate terminal configuration
   */
  private validateTerminalConfig(config: TerminalConfig): void {
    if (!config.id) {
      throw new Error('Terminal ID is required');
    }

    if (!config.name) {
      throw new Error('Terminal name is required');
    }

    if (!config.type) {
      throw new Error('Terminal type is required');
    }

    if (!config.locationId) {
      throw new Error('Location ID is required');
    }

    // Type-specific validation
    if (config.type === TerminalType.PAX) {
      if (!config.ipAddress) {
        throw new Error('IP address is required for PAX terminals');
      }
      if (!config.port) {
        throw new Error('Port is required for PAX terminals');
      }
    }
  }

  /**
   * Load terminals from database
   */
  private async loadTerminalsFromDatabase(): Promise<void> {
    try {
      const terminals = await this.prisma.paymentTerminal.findMany({
        where: { deletedAt: null },
      });

      for (const terminal of terminals) {
        const config: TerminalConfig = {
          id: terminal.id,
          name: terminal.name,
          type: terminal.type as TerminalType,
          locationId: terminal.locationId,
          enabled: terminal.enabled,
          ipAddress: terminal.ipAddress || undefined,
          port: terminal.port || undefined,
          serialNumber: terminal.serialNumber || undefined,
          model: terminal.model || undefined,
          firmwareVersion: terminal.firmwareVersion || undefined,
          lastHeartbeat: terminal.lastHeartbeat || undefined,
          metadata: terminal.metadata ? JSON.parse(terminal.metadata) : undefined,
        };

        this.terminals.set(config.id, config);

        // Register with appropriate agent
        if (config.type === TerminalType.PAX && config.ipAddress && config.port) {
          const paxConfig: PaxTerminalConfig = {
            terminalId: config.id,
            ipAddress: config.ipAddress,
            port: config.port,
            timeout: 30000,
            enabled: config.enabled,
            locationId: config.locationId,
            serialNumber: config.serialNumber,
            model: config.model,
          };
          await this.paxAgent.registerTerminal(paxConfig);
        }
      }

      this.logger.log(`Loaded ${terminals.length} terminals from database`);
    } catch (error) {
      this.logger.error(
        'Failed to load terminals from database',
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  /**
   * Save terminal to database
   */
  private async saveTerminalToDatabase(config: TerminalConfig): Promise<void> {
    await this.prisma.paymentTerminal.upsert({
      where: { id: config.id },
      create: {
        id: config.id,
        name: config.name,
        type: config.type,
        locationId: config.locationId,
        enabled: config.enabled,
        ipAddress: config.ipAddress,
        port: config.port,
        serialNumber: config.serialNumber,
        model: config.model,
        firmwareVersion: config.firmwareVersion,
        lastHeartbeat: config.lastHeartbeat,
        metadata: config.metadata ? JSON.stringify(config.metadata) : null,
      },
      update: {
        name: config.name,
        type: config.type,
        locationId: config.locationId,
        enabled: config.enabled,
        ipAddress: config.ipAddress,
        port: config.port,
        serialNumber: config.serialNumber,
        model: config.model,
        firmwareVersion: config.firmwareVersion,
        lastHeartbeat: config.lastHeartbeat,
        metadata: config.metadata ? JSON.stringify(config.metadata) : null,
      },
    });
  }

  /**
   * Map PAX status to health status
   */
  private mapPaxStatusToHealth(
    status: PaxTerminalStatus,
    terminal: TerminalConfig,
  ): TerminalHealth {
    const issues: string[] = [];

    if (status.paperStatus === 'low') {
      issues.push('Paper running low');
    } else if (status.paperStatus === 'out') {
      issues.push('Paper out');
    }

    if (status.batteryLevel !== undefined && status.batteryLevel < 20) {
      issues.push(`Battery low: ${status.batteryLevel}%`);
    }

    if (status.errors && status.errors.length > 0) {
      issues.push(...status.errors);
    }

    return {
      terminalId: terminal.id,
      type: terminal.type,
      online: status.online,
      healthy: status.online && issues.length === 0,
      lastCheck: new Date(),
      lastHeartbeat: status.lastHeartbeat,
      issues: issues.length > 0 ? issues : undefined,
      details: {
        firmwareVersion: status.firmwareVersion,
        batteryLevel: status.batteryLevel,
        paperStatus: status.paperStatus,
      },
    };
  }
}
