import { Module } from '@nestjs/common';
import { ReceiptService } from './receipt.service';
import { ReceiptController } from './receipt.controller';
import { PrismaService } from '../prisma.service';

@Module({
  providers: [ReceiptService, PrismaService],
  controllers: [ReceiptController],
  exports: [ReceiptService],
})
export class ReceiptsModule {}
