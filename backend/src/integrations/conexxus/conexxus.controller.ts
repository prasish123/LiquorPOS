import { Controller, Get, Post, HttpCode, HttpStatus } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiSecurity,
} from '@nestjs/swagger';
import { ConexxusService } from './conexxus.service';

/**
 * Conexxus Integration Controller
 * Provides endpoints for monitoring and manual control of Conexxus integration
 */
@ApiTags('integrations')
@Controller('integrations/conexxus')
export class ConexxusController {
  constructor(private readonly conexxusService: ConexxusService) {}

  /**
   * Get health status of Conexxus integration
   * GET /integrations/conexxus/health
   */
  @Get('health')
  @ApiOperation({
    summary: 'Get Conexxus health status',
    description:
      'Check the health and connectivity status of the Conexxus integration.',
  })
  @ApiResponse({
    status: 200,
    description: 'Health status retrieved',
    schema: {
      example: {
        status: 'healthy',
        isHealthy: true,
        lastSync: '2026-01-02T12:00:00.000Z',
        consecutiveFailures: 0,
      },
    },
  })
  async getHealth() {
    const health = await this.conexxusService.getHealthStatus();

    return {
      status: health.isHealthy ? 'healthy' : 'unhealthy',
      ...health,
    };
  }

  /**
   * Test connection to Conexxus API
   * GET /integrations/conexxus/test-connection
   */
  @Get('test-connection')
  @ApiOperation({
    summary: 'Test Conexxus connection',
    description: 'Test connectivity to the Conexxus API endpoint.',
  })
  @ApiResponse({
    status: 200,
    description: 'Connection test successful',
    schema: {
      example: {
        success: true,
        message: 'Connection successful',
        responseTime: 150,
      },
    },
  })
  @ApiResponse({
    status: 503,
    description: 'Connection test failed',
  })
  async testConnection() {
    return await this.conexxusService.testConnection();
  }

  /**
   * Get sync metrics
   * GET /integrations/conexxus/metrics
   */
  @Get('metrics')
  @ApiOperation({
    summary: 'Get sync metrics',
    description:
      'Retrieve synchronization metrics and history for the Conexxus integration.',
  })
  @ApiResponse({
    status: 200,
    description: 'Metrics retrieved successfully',
    schema: {
      example: {
        latest: {
          timestamp: '2026-01-02T12:00:00.000Z',
          duration: 2500,
          itemsSynced: 150,
          success: true,
        },
        history: [],
      },
    },
  })
  getMetrics() {
    return {
      latest: this.conexxusService.getLatestSyncMetrics(),
      history: this.conexxusService.getSyncMetrics(10),
    };
  }

  /**
   * Trigger manual inventory sync
   * POST /integrations/conexxus/sync
   */
  @Post('sync')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiSecurity('CSRF')
  @ApiOperation({
    summary: 'Trigger manual sync',
    description:
      'Manually trigger an inventory synchronization with Conexxus. Sync runs in the background.',
  })
  @ApiResponse({
    status: 202,
    description: 'Sync triggered successfully',
    schema: {
      example: {
        message: 'Sync triggered',
        status: 'processing',
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Invalid CSRF token',
  })
  async triggerSync() {
    // Start sync in background
    this.conexxusService.triggerManualSync().catch((error) => {
      // Error already logged in service
      console.error('Manual sync failed:', error);
    });

    return {
      message: 'Sync triggered',
      status: 'processing',
    };
  }
}
