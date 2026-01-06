import { Controller, Get } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  TypeOrmHealthIndicator,
  MemoryHealthIndicator,
  DiskHealthIndicator,
} from '@nestjs/terminus';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PrismaHealthIndicator } from './prisma.health';
import { RedisHealthIndicator } from './redis.health';
import { BackupHealthIndicator } from './backup.health';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private prisma: PrismaHealthIndicator,
    private redis: RedisHealthIndicator,
    private memory: MemoryHealthIndicator,
    private disk: DiskHealthIndicator,
    private backup: BackupHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  @ApiOperation({ summary: 'Health check' })
  check() {
    // Use C:\ for Windows, / for Linux/Mac
    const diskPath = process.platform === 'win32' ? 'C:\\' : '/';

    return this.health.check([
      () => this.prisma.isHealthy('database'),
      () => this.redis.isHealthy('redis'),
      () => this.memory.checkHeap('memory_heap', 300 * 1024 * 1024), // 300MB
      () => this.memory.checkRSS('memory_rss', 500 * 1024 * 1024), // 500MB
      () =>
        this.disk.checkStorage('disk', {
          path: diskPath,
          thresholdPercent: 0.9,
        }),
      () => this.backup.isHealthy('backup'),
    ]);
  }

  @Get('backup')
  @HealthCheck()
  @ApiOperation({ summary: 'Backup health check' })
  checkBackup() {
    return this.health.check([() => this.backup.isHealthy('backup')]);
  }

  /**
   * Kubernetes readiness probe
   * Returns 200 when app is ready to receive traffic
   * Checks critical dependencies: database and Redis
   */
  @Get('ready')
  @HealthCheck()
  @ApiOperation({
    summary: 'Readiness probe for Kubernetes',
    description:
      'Checks if application is ready to receive traffic. Returns 200 when ready, 503 when not ready.',
  })
  checkReadiness() {
    return this.health.check([
      () => this.prisma.isHealthy('database'),
      () => this.redis.isHealthy('redis'),
    ]);
  }

  /**
   * Kubernetes liveness probe
   * Returns 200 when app is alive and responsive
   * Lightweight check - only verifies process is not deadlocked
   */
  @Get('live')
  @HealthCheck()
  @ApiOperation({
    summary: 'Liveness probe for Kubernetes',
    description:
      'Checks if application is alive and responsive. Returns 200 when alive, 503 when deadlocked.',
  })
  checkLiveness() {
    return this.health.check([
      () => this.memory.checkHeap('memory_heap', 500 * 1024 * 1024), // 500MB - higher threshold for liveness
    ]);
  }

  /**
   * Database-specific health check
   * Returns connection pool metrics
   */
  @Get('db')
  @HealthCheck()
  @ApiOperation({
    summary: 'Database health check',
    description: 'Detailed database health including connection pool metrics.',
  })
  checkDatabase() {
    return this.health.check([() => this.prisma.isHealthy('database')]);
  }

  /**
   * Redis-specific health check
   * Returns cache metrics
   */
  @Get('redis')
  @HealthCheck()
  @ApiOperation({
    summary: 'Redis health check',
    description: 'Detailed Redis health including cache metrics.',
  })
  checkRedis() {
    return this.health.check([() => this.redis.isHealthy('redis')]);
  }
}
