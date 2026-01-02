import { Controller, Get } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  PrismaHealthIndicator,
  HealthCheckResult,
  MemoryHealthIndicator,
  DiskHealthIndicator,
} from '@nestjs/terminus';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { RedisHealthIndicator } from './redis-health.indicator';
import { ConexxusHealthIndicator } from './conexxus-health.indicator';
import { EncryptionHealthIndicator } from './encryption-health.indicator';
import { PrismaService } from '../prisma.service';

/**
 * Health Check Controller
 *
 * Provides three types of health checks:
 * 1. /health - Comprehensive check of all dependencies
 * 2. /health/live - Liveness probe (is the app running?)
 * 3. /health/ready - Readiness probe (is the app ready to serve traffic?)
 */
@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private prismaHealth: PrismaHealthIndicator,
    private redisHealth: RedisHealthIndicator,
    private conexxusHealth: ConexxusHealthIndicator,
    private encryptionHealth: EncryptionHealthIndicator,
    private memoryHealth: MemoryHealthIndicator,
    private diskHealth: DiskHealthIndicator,
    private prisma: PrismaService,
  ) {}

  /**
   * Comprehensive health check - checks all dependencies
   * GET /health
   *
   * Use this for:
   * - Load balancer health checks
   * - Monitoring dashboards
   * - Detailed system status
   *
   * Checks:
   * - Database connectivity
   * - Redis cache
   * - Conexxus API (optional)
   * - Encryption service
   * - Memory usage
   * - Disk usage
   */
  @Get()
  @HealthCheck()
  @ApiOperation({
    summary: 'Comprehensive health check',
    description:
      'Check health of all system dependencies including database, cache, integrations, and system resources.',
  })
  @ApiResponse({
    status: 200,
    description: 'All systems healthy',
    schema: {
      example: {
        status: 'ok',
        info: {
          database: { status: 'up' },
          cache: { status: 'up' },
          conexxus: { status: 'up' },
          encryption: { status: 'up' },
          memory_heap: { status: 'up' },
          disk: { status: 'up' },
        },
        error: {},
        details: {},
      },
    },
  })
  @ApiResponse({
    status: 503,
    description: 'One or more systems unhealthy',
  })
  async check(): Promise<HealthCheckResult> {
    return this.health.check([
      // Critical: Database
      () => this.prismaHealth.pingCheck('database', this.prisma as any),

      // Important: Encryption (audit logs)
      () => this.encryptionHealth.isHealthy('encryption'),

      // Optional: Redis (graceful degradation)
      async () => {
        try {
          return await this.redisHealth.isHealthy('cache');
        } catch (error) {
          // Redis is optional - return degraded status instead of failing
          return {
            cache: {
              status: 'degraded' as const,
              message: 'Cache unavailable (performance degraded)',
            },
          } as any;
        }
      },

      // Optional: Conexxus API (integration)
      async () => {
        try {
          return await this.conexxusHealth.isHealthy('conexxus');
        } catch (error) {
          // Conexxus is optional - return degraded status
          return {
            conexxus: {
              status: 'degraded' as const,
              message: 'Conexxus API unavailable (sync disabled)',
            },
          } as any;
        }
      },

      // System: Memory usage
      () => this.memoryHealth.checkHeap('memory_heap', 300 * 1024 * 1024), // 300MB

      // System: Disk usage
      () =>
        this.diskHealth.checkStorage('disk', {
          path: '/',
          thresholdPercent: 0.9, // Alert at 90%
        }),
    ]);
  }

  /**
   * Liveness probe - checks if the application is alive
   * GET /health/live
   *
   * Use this for:
   * - Kubernetes liveness probe
   * - Container orchestration
   * - Restart decisions
   *
   * Returns 200 if:
   * - The application process is running
   * - The event loop is not blocked
   *
   * This endpoint should NEVER check external dependencies
   */
  @Get('live')
  @HealthCheck()
  @ApiOperation({
    summary: 'Liveness probe',
    description:
      'Check if the application is alive and running. Used for container orchestration restart decisions.',
  })
  @ApiResponse({
    status: 200,
    description: 'Application is alive',
    schema: {
      example: {
        status: 'ok',
        info: {
          app: {
            status: 'up',
            message: 'Application is running',
            uptime: 3600,
            timestamp: '2026-01-02T12:00:00.000Z',
          },
          memory_heap: { status: 'up' },
        },
      },
    },
  })
  @ApiResponse({
    status: 503,
    description: 'Application is not healthy',
  })
  checkLiveness(): Promise<HealthCheckResult> {
    return this.health.check([
      // Just check if the app is running
      async () => ({
        app: {
          status: 'up',
          message: 'Application is running',
          uptime: process.uptime(),
          timestamp: new Date().toISOString(),
        },
      }),

      // Check memory to detect memory leaks
      () => this.memoryHealth.checkHeap('memory_heap', 500 * 1024 * 1024), // 500MB
    ]);
  }

  /**
   * Readiness probe - checks if the application is ready to serve traffic
   * GET /health/ready
   *
   * Use this for:
   * - Kubernetes readiness probe
   * - Load balancer routing decisions
   * - Deployment verification
   *
   * Returns 200 if:
   * - Database is accessible
   * - Encryption service is working
   * - Application can serve requests
   *
   * Redis and Conexxus are optional (graceful degradation)
   */
  @Get('ready')
  @HealthCheck()
  @ApiOperation({
    summary: 'Readiness probe',
    description:
      'Check if the application is ready to serve traffic. Verifies critical dependencies are available.',
  })
  @ApiResponse({
    status: 200,
    description: 'Application is ready',
    schema: {
      example: {
        status: 'ok',
        info: {
          database: { status: 'up' },
          encryption: { status: 'up' },
          cache: { status: 'up' },
        },
      },
    },
  })
  @ApiResponse({
    status: 503,
    description: 'Application is not ready',
  })
  async checkReadiness(): Promise<HealthCheckResult> {
    return this.health.check([
      // Critical: Database must be accessible
      () => this.prismaHealth.pingCheck('database', this.prisma as any),

      // Critical: Encryption must work (for audit logs)
      () => this.encryptionHealth.isHealthy('encryption'),

      // Optional: Redis (we can operate without it)
      async () => {
        try {
          return await this.redisHealth.isHealthy('cache');
        } catch (error) {
          // Redis is down but we're still ready (degraded mode)
          return {
            cache: {
              status: 'degraded' as const,
              message: 'Running without cache (performance degraded)',
            },
          } as any;
        }
      },

      // Optional: Conexxus (we can operate without it)
      async () => {
        try {
          return await this.conexxusHealth.isHealthy('conexxus');
        } catch (error) {
          // Conexxus is down but we're still ready
          return {
            conexxus: {
              status: 'degraded' as const,
              message: 'Conexxus unavailable (sync disabled)',
            },
          } as any;
        }
      },
    ]);
  }

  /**
   * Connection pool metrics
   * GET /health/pool
   *
   * Returns detailed connection pool metrics
   * Useful for monitoring database connection usage
   */
  @Get('pool')
  @ApiOperation({
    summary: 'Connection pool metrics',
    description:
      'Get detailed connection pool metrics including active, idle, and total connections.',
  })
  @ApiResponse({
    status: 200,
    description: 'Connection pool metrics retrieved',
    schema: {
      example: {
        status: 'healthy',
        metrics: {
          activeConnections: 3,
          idleConnections: 7,
          waitingRequests: 0,
          totalConnections: 10,
          poolSize: 20,
        },
        config: {
          min: 2,
          max: 20,
          idleTimeout: 30000,
          connectionTimeout: 10000,
        },
        utilization: {
          percent: 50,
          status: 'normal',
        },
        timestamp: '2026-01-02T12:00:00.000Z',
      },
    },
  })
  async getPoolMetrics() {
    try {
      const metrics = await this.prisma.getPoolMetrics();
      const config = this.prisma.getPoolConfig();
      const isHealthy = await this.prisma.isPoolHealthy();

      const utilizationPercent =
        (metrics.totalConnections / metrics.poolSize) * 100;

      let utilizationStatus: 'normal' | 'warning' | 'critical';
      if (utilizationPercent < 70) {
        utilizationStatus = 'normal';
      } else if (utilizationPercent < 90) {
        utilizationStatus = 'warning';
      } else {
        utilizationStatus = 'critical';
      }

      return {
        status: isHealthy ? 'healthy' : 'degraded',
        metrics,
        config,
        utilization: {
          percent: parseFloat(utilizationPercent.toFixed(1)),
          status: utilizationStatus,
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        status: 'error',
        message:
          error instanceof Error ? error.message : 'Failed to get pool metrics',
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Detailed health status with metrics
   * GET /health/details
   *
   * Returns detailed information about all health indicators
   * Useful for debugging and monitoring
   */
  @Get('details')
  @ApiOperation({
    summary: 'Detailed health status',
    description:
      'Get detailed health information with system metrics and environment info.',
  })
  @ApiResponse({
    status: 200,
    description: 'Detailed health information retrieved',
    schema: {
      example: {
        status: 'ok',
        info: {},
        error: {},
        details: {},
        timestamp: '2026-01-02T12:00:00.000Z',
        uptime: 3600,
        memory: {
          rss: 50000000,
          heapTotal: 30000000,
          heapUsed: 20000000,
          external: 1000000,
        },
        environment: 'production',
        connectionPool: {
          activeConnections: 3,
          idleConnections: 7,
          totalConnections: 10,
          poolSize: 20,
          utilization: 50,
        },
      },
    },
  })
  async getDetails() {
    try {
      const healthResult = await this.check();
      const poolMetrics = await this.prisma.getPoolMetrics();
      const utilizationPercent =
        (poolMetrics.totalConnections / poolMetrics.poolSize) * 100;

      return {
        status: healthResult.status,
        info: healthResult.info,
        error: healthResult.error,
        details: healthResult.details,
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        environment: process.env.NODE_ENV || 'development',
        connectionPool: {
          ...poolMetrics,
          utilization: parseFloat(utilizationPercent.toFixed(1)),
        },
      };
    } catch (error) {
      return {
        status: 'error',
        message: error instanceof Error ? error.message : 'Health check failed',
        timestamp: new Date().toISOString(),
      };
    }
  }
}
