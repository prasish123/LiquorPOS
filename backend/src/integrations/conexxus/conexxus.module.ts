import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { ConexxusService } from './conexxus.service';
import { ConexxusController } from './conexxus.controller';
import { ConexxusHttpClient } from './conexxus-http.client';
import { InventoryModule } from '../../inventory/inventory.module';
import { OrdersModule } from '../../orders/orders.module';
import { ProductsModule } from '../../products/products.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    InventoryModule,
    OrdersModule,
    ProductsModule,
  ],
  controllers: [ConexxusController],
  providers: [ConexxusService, ConexxusHttpClient],
  exports: [ConexxusService],
})
export class ConexxusModule {}
