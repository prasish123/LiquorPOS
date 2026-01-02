import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { ConexxusService } from './conexxus.service';
import { ConexxusController } from './conexxus.controller';
import { ConexxusHttpClient } from './conexxus-http.client';
import { ConexxusOfflineService } from './conexxus-offline.service';
import { InventoryModule } from '../../inventory/inventory.module';
import { OrdersModule } from '../../orders/orders.module';
import { ProductsModule } from '../../products/products.module';
import { PrismaService } from '../../prisma.service';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    InventoryModule,
    OrdersModule,
    ProductsModule,
  ],
  controllers: [ConexxusController],
  providers: [
    ConexxusService,
    ConexxusHttpClient,
    ConexxusOfflineService,
    PrismaService,
  ],
  exports: [ConexxusService, ConexxusOfflineService],
})
export class ConexxusModule {}
