import { Module } from '@nestjs/common';
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

@Module({
  imports: [RedisModule, AIModule, ProductsModule, OrdersModule, InventoryModule, CustomersModule, LocationsModule, ConexxusModule, AuthModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
