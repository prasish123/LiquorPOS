import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import axios from 'axios';

export interface NetworkStatus {
  isOnline: boolean;
  lastCheck: Date;
  consecutiveFailures: number;
  lastError?: string;
  services: {
    stripe: boolean;
    conexxus: boolean;
    internet: boolean;
  };
}

export interface ServiceHealthCheck {
  name: string;
  url: string;
  timeout: number;
  enabled: boolean;
}

/**
 * Network Status Monitoring Service
 * Monitors connectivity to external services and internet
 * Provides offline detection for resilience features
 */
@Injectable()
export class NetworkStatusService implements OnModuleInit {
  private readonly logger = new Logger(NetworkStatusService.name);
  
  private status: NetworkStatus = {
    isOnline: true,
    lastCheck: new Date(),
    consecutiveFailures: 0,
    services: {
      stripe: true,
      conexxus: true,
      internet: true,
    },
  };

  private listeners: Array<(status: NetworkStatus) => void> = [];

  // Service health check configurations
  private readonly healthChecks: ServiceHealthCheck[] = [
    {
      name: 'internet',
      url: 'https://www.google.com',
      timeout: 5000,
      enabled: true,
    },
    {
      name: 'stripe',
      url: 'https://api.stripe.com/healthcheck',
      timeout: 5000,
      enabled: !!process.env.STRIPE_SECRET_KEY,
    },
    {
      name: 'conexxus',
      url: process.env.CONEXXUS_API_URL
        ? `${process.env.CONEXXUS_API_URL}/api/v1/health`
        : '',
      timeout: 5000,
      enabled: !!(
        process.env.CONEXXUS_API_URL &&
        !process.env.CONEXXUS_API_URL.includes('example.com')
      ),
    },
  ];

  async onModuleInit() {
    this.logger.log('Network Status Service initialized');
    // Initial check
    await this.checkAllServices();
  }

  /**
   * Check connectivity to all services (runs every 30 seconds)
   */
  @Cron(CronExpression.EVERY_30_SECONDS)
  async checkAllServices(): Promise<void> {
    this.logger.debug('Checking network connectivity...');

    const results = await Promise.allSettled(
      this.healthChecks
        .filter((check) => check.enabled)
        .map((check) => this.checkService(check)),
    );

    // Update service statuses
    results.forEach((result, index) => {
      const serviceName = this.healthChecks.filter((c) => c.enabled)[index]
        .name as keyof NetworkStatus['services'];

      if (result.status === 'fulfilled' && result.value) {
        this.status.services[serviceName] = true;
      } else {
        this.status.services[serviceName] = false;
        if (result.status === 'rejected') {
          this.logger.warn(
            `Service ${serviceName} health check failed: ${result.reason}`,
          );
        }
      }
    });

    // Determine overall online status
    const previousOnlineStatus = this.status.isOnline;
    const isInternetAvailable = this.status.services.internet;

    if (!isInternetAvailable) {
      this.status.consecutiveFailures++;
      if (this.status.consecutiveFailures >= 2) {
        // Consider offline after 2 consecutive failures (1 minute)
        this.status.isOnline = false;
      }
    } else {
      this.status.consecutiveFailures = 0;
      this.status.isOnline = true;
      this.status.lastError = undefined;
    }

    this.status.lastCheck = new Date();

    // Notify listeners if status changed
    if (previousOnlineStatus !== this.status.isOnline) {
      if (this.status.isOnline) {
        this.logger.log('✅ Network status: ONLINE');
      } else {
        this.logger.warn('⚠️ Network status: OFFLINE');
      }
      this.notifyListeners();
    }

    // Log service statuses
    this.logger.debug('Service statuses:', this.status.services);
  }

  /**
   * Check connectivity to a specific service
   */
  private async checkService(check: ServiceHealthCheck): Promise<boolean> {
    if (!check.enabled || !check.url) {
      return false;
    }

    try {
      const response = await axios.get(check.url, {
        timeout: check.timeout,
        validateStatus: (status) => status < 500, // Accept any status < 500
        headers: {
          'User-Agent': 'POS-Omni-HealthCheck/1.0',
        },
      });

      return response.status < 500;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.debug(
        `Health check failed for ${check.name}: ${errorMessage}`,
      );
      return false;
    }
  }

  /**
   * Get current network status
   */
  getStatus(): NetworkStatus {
    return { ...this.status };
  }

  /**
   * Check if system is online
   */
  isOnline(): boolean {
    return this.status.isOnline;
  }

  /**
   * Check if a specific service is available
   */
  isServiceAvailable(service: keyof NetworkStatus['services']): boolean {
    return this.status.services[service];
  }

  /**
   * Check if Stripe is available
   */
  isStripeAvailable(): boolean {
    return this.status.services.stripe && this.status.isOnline;
  }

  /**
   * Check if Conexxus is available
   */
  isConexxusAvailable(): boolean {
    return this.status.services.conexxus && this.status.isOnline;
  }

  /**
   * Subscribe to network status changes
   */
  subscribe(listener: (status: NetworkStatus) => void): () => void {
    this.listeners.push(listener);

    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Notify all listeners of status change
   */
  private notifyListeners(): void {
    const status = this.getStatus();
    this.listeners.forEach((listener) => {
      try {
        listener(status);
      } catch (error) {
        this.logger.error(
          'Error notifying network status listener',
          error instanceof Error ? error.stack : undefined,
        );
      }
    });
  }

  /**
   * Force a network check (useful for testing or manual triggers)
   */
  async forceCheck(): Promise<NetworkStatus> {
    await this.checkAllServices();
    return this.getStatus();
  }

  /**
   * Manually set offline mode (useful for testing)
   */
  setOfflineMode(offline: boolean): void {
    const previousStatus = this.status.isOnline;
    this.status.isOnline = !offline;

    if (previousStatus !== this.status.isOnline) {
      this.logger.log(
        `Network status manually set to: ${this.status.isOnline ? 'ONLINE' : 'OFFLINE'}`,
      );
      this.notifyListeners();
    }
  }

  /**
   * Get health check configuration
   */
  getHealthChecks(): ServiceHealthCheck[] {
    return [...this.healthChecks];
  }
}

