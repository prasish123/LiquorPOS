import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { ConexxusService } from './conexxus.service';
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
  providers: [ConexxusService],
  exports: [ConexxusService],
})
export class ConexxusModule {}
