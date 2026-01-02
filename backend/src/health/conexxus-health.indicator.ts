import { Injectable } from '@nestjs/common';
import {
  HealthIndicator,
  HealthIndicatorResult,
  HealthCheckError,
} from '@nestjs/terminus';
import { ConexxusHttpClient } from '../integrations/conexxus/conexxus-http.client';

/**
 * Health indicator for Conexxus API integration
 * Checks if the Conexxus API is reachable and responding
 */
@Injectable()
export class ConexxusHealthIndicator extends HealthIndicator {
  constructor(private readonly conexxusClient: ConexxusHttpClient) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      // Check if Conexxus is configured (optional integration)
      const isConfigured = !!(
        process.env.CONEXXUS_API_URL && process.env.CONEXXUS_API_KEY
      );

      if (!isConfigured) {
        // Return healthy status for optional integration that's not configured
        return this.getStatus(key, true, {
          status: 'disabled',
          message: 'Conexxus integration not configured (optional)',
        });
      }

      const isHealthy = await this.conexxusClient.healthCheck();

      const result = this.getStatus(key, isHealthy, {
        status: isHealthy ? 'up' : 'down',
        message: isHealthy
          ? 'Conexxus API is reachable'
          : 'Conexxus API is not responding',
      });

      if (isHealthy) {
        return result;
      }

      throw new HealthCheckError('Conexxus health check failed', result);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const result = this.getStatus(key, false, {
        status: 'down',
        message: `Conexxus API check failed: ${errorMessage}`,
      });

      throw new HealthCheckError('Conexxus health check failed', result);
    }
  }
}
