import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health.controller';
import { RedisHealthIndicator } from './redis-health.indicator';
import { ConexxusHealthIndicator } from './conexxus-health.indicator';
import { EncryptionHealthIndicator } from './encryption-health.indicator';
import { BackupHealthIndicator } from './backup.health';
import { RedisModule } from '../redis/redis.module';
import { BackupModule } from '../backup/backup.module';
import { PrismaService } from '../prisma.service';
import { ConexxusHttpClient } from '../integrations/conexxus/conexxus-http.client';
import { EncryptionService } from '../common/encryption.service';

@Module({
  imports: [TerminusModule, RedisModule, BackupModule],
  controllers: [HealthController],
  providers: [
    RedisHealthIndicator,
    ConexxusHealthIndicator,
    EncryptionHealthIndicator,
    BackupHealthIndicator,
    PrismaService,
    ConexxusHttpClient,
    EncryptionService,
  ],
})
export class HealthModule {}
