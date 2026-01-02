import { Module } from '@nestjs/common';
import { WebhooksController } from './webhooks.controller';
import { WebhooksService } from './webhooks.service';
import { StripeWebhookService } from './stripe-webhook.service';
import { PrismaService } from '../prisma.service';
import { OrdersModule } from '../orders/orders.module';

@Module({
  imports: [OrdersModule],
  controllers: [WebhooksController],
  providers: [WebhooksService, StripeWebhookService, PrismaService],
  exports: [WebhooksService, StripeWebhookService],
})
export class WebhooksModule {}
