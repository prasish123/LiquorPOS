import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD, APP_FILTER } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AIModule } from './ai/ai.module';
import { ProductsModule } from './products/products.module';
import { OrdersModule } from './orders/orders.module';
import { InventoryModule } from './inventory/inventory.module';
import { CustomersModule } from './customers/customers.module';
import { LocationsModule } from './locations/locations.module';
import { ConexxusModule } from './integrations/conexxus/conexxus.module';
import { RedisModule } from './redis/redis.module';
import { AuthModule } from './auth/auth.module';
import { CommonModule } from './common/common.module';
import { HealthModule } from './health/health.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { MonitoringModule } from './monitoring/monitoring.module';
import { ReportingModule } from './reporting/reporting.module';
import { BackupModule } from './backup/backup.module';
import { ReceiptsModule } from './receipts/receipts.module';
import { PaymentsModule } from './payments/payments.module';
import { CorrelationIdMiddleware } from './common/correlation-id.middleware';
import { AppExceptionFilter } from './common/filters/app-exception.filter';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60000, // 60 seconds
        limit: 100, // 100 requests per minute - reasonable for POS operations
      },
      {
        name: 'strict',
        ttl: 60000, // 60 seconds
        limit: 5, // 5 requests per minute - for sensitive operations (login)
      },
      {
        name: 'orders',
        ttl: 60000, // 60 seconds
        limit: 30, // 30 orders per minute per terminal
      },
      {
        name: 'inventory',
        ttl: 60000, // 60 seconds
        limit: 50, // 50 inventory operations per minute
      },
    ]),
    CommonModule,
    RedisModule,
    HealthModule,
    WebhooksModule,
    MonitoringModule,
    ReportingModule,
    BackupModule,
    ReceiptsModule,
    PaymentsModule,
    AIModule,
    ProductsModule,
    OrdersModule,
    InventoryModule,
    CustomersModule,
    LocationsModule,
    ConexxusModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_FILTER,
      useClass: AppExceptionFilter,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(CorrelationIdMiddleware).forRoutes('*');
  }
}
