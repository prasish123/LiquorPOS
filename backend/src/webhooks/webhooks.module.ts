import { Module } from '@nestjs/common';
import { WebhooksController } from './webhooks.controller';
import { WebhooksService } from './webhooks.service';
import { StripeWebhookService } from './stripe-webhook.service';
import { DeliveryPlatformTransformerService } from './delivery-platform-transformer.service';
import { PrismaService } from '../prisma.service';
import { OrdersModule } from '../orders/orders.module';

@Module({
  imports: [OrdersModule],
  controllers: [WebhooksController],
  providers: [
    WebhooksService,
    StripeWebhookService,
    DeliveryPlatformTransformerService,
    PrismaService,
  ],
  exports: [WebhooksService, StripeWebhookService, DeliveryPlatformTransformerService],
})
export class WebhooksModule {}
