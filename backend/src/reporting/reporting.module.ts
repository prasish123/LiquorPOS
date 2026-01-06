import { Module } from '@nestjs/common';
import { ReportingController } from './reporting.controller';
import { ReportingService } from './reporting.service';
import { ExportService } from './export.service';
import { ReportCacheService } from './cache/report-cache.service';
import { QuickBooksService } from './integrations/quickbooks.service';
import { XeroService } from './integrations/xero.service';
import { PrismaService } from '../prisma.service';
import { RedisService } from '../redis/redis.service';

@Module({
  controllers: [ReportingController],
  providers: [
    ReportingService,
    ExportService,
    ReportCacheService,
    QuickBooksService,
    XeroService,
    PrismaService,
    RedisService,
  ],
  exports: [ReportingService, ExportService, QuickBooksService, XeroService],
})
export class ReportingModule {}
