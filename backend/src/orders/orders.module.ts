import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { OrderOrchestrator } from './order-orchestrator';
import { InventoryAgent } from './agents/inventory.agent';
import { PricingAgent } from './agents/pricing.agent';
import { ComplianceAgent } from './agents/compliance.agent';
import { PaymentAgent } from './agents/payment.agent';
import { OfflinePaymentAgent } from './agents/offline-payment.agent';
import { AuditService } from './audit.service';
import { PriceOverrideService } from './price-override.service';
import { PriceOverrideController } from './price-override.controller';
import { PrismaService } from '../prisma.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [EventEmitterModule.forRoot(), AuthModule],
  providers: [
    OrdersService,
    OrderOrchestrator,
    InventoryAgent,
    PricingAgent,
    ComplianceAgent,
    PaymentAgent,
    OfflinePaymentAgent,
    AuditService,
    PriceOverrideService,
    PrismaService,
  ],
  controllers: [OrdersController, PriceOverrideController],
  exports: [OrdersService, OrderOrchestrator, PriceOverrideService],
})
export class OrdersModule {}
