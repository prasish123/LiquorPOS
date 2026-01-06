import { Module, Global } from '@nestjs/common';
import { EncryptionService } from './encryption.service';
import { ConfigValidationService } from './config-validation.service';
import { NetworkStatusService } from './network-status.service';
import { OfflineQueueService } from './offline-queue.service';
import { PrismaService } from '../prisma.service';

@Global()
@Module({
  providers: [
    ConfigValidationService,
    EncryptionService,
    NetworkStatusService,
    OfflineQueueService,
    PrismaService,
  ],
  exports: [ConfigValidationService, EncryptionService, NetworkStatusService, OfflineQueueService],
})
export class CommonModule {}
