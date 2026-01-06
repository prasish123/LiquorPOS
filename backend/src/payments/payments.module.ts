import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { PaymentsController } from './payments.controller';
import { PaymentRouterService } from './payment-router.service';
import { PaxTerminalAgent } from './pax-terminal.agent';
import { TerminalManagerService } from './terminal-manager.service';
import { PrismaService } from '../prisma.service';
import { PaymentAgent } from '../orders/agents/payment.agent';
import { OfflinePaymentAgent } from '../orders/agents/offline-payment.agent';
import { NetworkStatusService } from '../common/network-status.service';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [ScheduleModule.forRoot(), CommonModule],
  controllers: [PaymentsController],
  providers: [
    PaymentRouterService,
    PaxTerminalAgent,
    TerminalManagerService,
    PaymentAgent,
    OfflinePaymentAgent,
    NetworkStatusService,
    PrismaService,
  ],
  exports: [PaymentRouterService, PaxTerminalAgent, TerminalManagerService],
})
export class PaymentsModule {}
