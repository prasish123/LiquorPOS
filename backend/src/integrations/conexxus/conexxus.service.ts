import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InventoryService } from '../../inventory/inventory.service';
import { OrdersService } from '../../orders/orders.service';
import { ProductsService } from '../../products/products.service';
// @ts-expect-error - fast-xml-parser does not have types
import { XMLParser } from 'fast-xml-parser';
import * as fs from 'fs/promises';
import * as path from 'path';

interface NAXMLItem {
  ItemCode?: {
    POSCode?: string | number;
  };
  ITTData?: {
    RegularSellPrice?: string | number;
    Description?: string;
    MerchandiseCode?: string | number;
  };
}

interface NAXMLMaintenance {
  ItemMaintenance?: {
    ITTDetail?: NAXMLItem | NAXMLItem[];
  };
}

interface NAXMLResult {
  'NAXML-MaintenanceRequest'?: NAXMLMaintenance;
}

@Injectable()
export class ConexxusService {
  private readonly logger = new Logger(ConexxusService.name);
  private readonly samplePath =
    process.env.CONEXXUS_SAMPLE_PATH ||
    path.join(process.cwd(), 'sample-files');

  constructor(
    private inventoryService: InventoryService,
    private ordersService: OrdersService,
    private productsService: ProductsService,
  ) {}

  /**
   * Sync inventory from Conexxus back-office system (ItemMaintenance.xml)
   * Runs every hour
   */
  @Cron(CronExpression.EVERY_HOUR)
  async syncInventory() {
    this.logger.log(
      'Starting scheduled Conexxus inventory sync from ItemMaintenance.xml...',
    );

    try {
      const filePath = path.join(this.samplePath, 'ItemMaintenance.xml');

      // Check if file exists
      try {
        await fs.access(filePath);
      } catch {
        this.logger.warn(`Sample file not found at ${filePath}`);
        return;
      }

      const data = await fs.readFile(filePath, 'utf-8');

      const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: '@_',
      }) as { parse: (data: string) => NAXMLResult };
      const result = parser.parse(data);

      const maintenance = result['NAXML-MaintenanceRequest'];
      if (!maintenance || !maintenance['ItemMaintenance']) {
        this.logger.warn('Invalid NAXML format');
        return;
      }

      const items = maintenance['ItemMaintenance']['ITTDetail'];

      if (!items) {
        this.logger.warn('No items found in ItemMaintenance');
        return;
      }

      // Ensure array
      const itemsArray: NAXMLItem[] = Array.isArray(items) ? items : [items];

      this.logger.log(`Found ${itemsArray.length} items to sync...`);
      let updatedCount = 0;

      for (const item of itemsArray) {
        try {
          // Extract fields safely
          // XML parser might return numbers for POSCode if they look like numbers
          const sku = item.ItemCode?.POSCode?.toString();
          // ITTData might be nested
          const detail = item.ITTData;

          if (!sku || !detail) continue;

          const priceValue = detail.RegularSellPrice;
          const price =
            typeof priceValue === 'number'
              ? priceValue
              : parseFloat(String(priceValue || '0'));
          const name = detail.Description;
          const catCode = detail.MerchandiseCode;

          if (!name) continue;

          // Upsert Product - MUST AWAIT
          try {
            const product = await this.productsService.findBySku(sku);
            // Update
            if (product) {
              await this.productsService.update(product.id, {
                name: name,
                basePrice: !isNaN(price) ? price : product.basePrice,
                category: `Conexxus-${String(catCode)}`,
              });
            }
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
          } catch (_err) {
            // NotFoundException -> Create
            await this.productsService.create({
              sku,
              name,
              basePrice: !isNaN(price) ? price : 0,
              category: `Conexxus-${String(catCode)}`,
              description: 'Imported from Conexxus NAXML',
              cost: 0,
              trackInventory: true,
              ageRestricted: false, // Default
            });
          }
          updatedCount++;
        } catch (err) {
          const errorMessage =
            err instanceof Error ? err.message : 'Unknown error';
          this.logger.warn(`Skipping item: ${errorMessage}`);
        }
      }

      this.logger.log(`Conexxus Sync Complete. IDs Processed: ${updatedCount}`);
    } catch (error) {
      this.logger.error('Conexxus inventory sync failed:', error);
    }
  }

  /**
   * Push daily sales to Conexxus
   * Runs daily at 11:30 PM
   */
  @Cron('0 30 23 * * *')
  async pushSales(date: Date = new Date()) {
    this.logger.log('Starting scheduled daily sales push to Conexxus...');

    try {
      // Real implementation would generate NAXML-POSJournal
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const _sales = await this.ordersService.getDailySummary(date);
      this.logger.log(
        `Generated sales report for ${date.toDateString()}. (Mock Push to ${process.env.CONEXXUS_API_URL || 'Conexxus'})`,
      );
    } catch (error) {
      this.logger.error('Conexxus sales push failed:', error);
    }
  }
}
