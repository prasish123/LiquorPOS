import { Module } from '@nestjs/common';
import { EnhancedComplianceAgent } from './enhanced-compliance.agent';
import { IDScannerService } from './id-scanner.interface';
import { PrismaService } from '../../prisma.service';
import { EncryptionService } from '../encryption.service';

@Module({
  providers: [
    EnhancedComplianceAgent,
    IDScannerService,
    PrismaService,
    EncryptionService,
  ],
  exports: [EnhancedComplianceAgent, IDScannerService],
})
export class ComplianceModule {}

