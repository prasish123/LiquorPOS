import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { OrderOrchestrator } from './order-orchestrator';
import { InventoryAgent } from './agents/inventory.agent';
import { PricingAgent } from './agents/pricing.agent';
import { ComplianceAgent } from './agents/compliance.agent';
import { PaymentAgent } from './agents/payment.agent';
import { AuditService } from './audit.service';
import { PrismaService } from '../prisma.service';

@Module({
  imports: [EventEmitterModule.forRoot()],
  providers: [
    OrdersService,
    OrderOrchestrator,
    InventoryAgent,
    PricingAgent,
    ComplianceAgent,
    PaymentAgent,
    AuditService,
    PrismaService,
  ],
  controllers: [OrdersController],
  exports: [OrdersService],
})
export class OrdersModule { }
