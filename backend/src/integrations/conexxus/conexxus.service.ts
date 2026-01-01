import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InventoryService } from '../../inventory/inventory.service';
import { OrdersService } from '../../orders/orders.service';
import { ProductsService } from '../../products/products.service';
// @ts-ignore
import { XMLParser } from 'fast-xml-parser';
import * as fs from 'fs/promises';
import * as path from 'path';

@Injectable()
export class ConexxusService {
    private readonly logger = new Logger(ConexxusService.name);
    private readonly samplePath = process.env.CONEXXUS_SAMPLE_PATH || path.join(process.cwd(), 'sample-files');

    constructor(
        private inventoryService: InventoryService,
        private ordersService: OrdersService,
        private productsService: ProductsService,
    ) { }

    /**
     * Sync inventory from Conexxus back-office system (ItemMaintenance.xml)
     * Runs every hour
     */
    @Cron(CronExpression.EVERY_HOUR)
    async syncInventory() {
        this.logger.log('Starting scheduled Conexxus inventory sync from ItemMaintenance.xml...');

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
                attributeNamePrefix: "@_"
            });
            const result = parser.parse(data);

            const maintenance = result['NAXML-MaintenanceRequest'];
            if (!maintenance || !maintenance['ItemMaintenance']) {
                this.logger.warn('Invalid NAXML format');
                return;
            }

            let items = maintenance['ItemMaintenance']['ITTDetail'];

            if (!items) {
                this.logger.warn('No items found in ItemMaintenance');
                return;
            }

            // Ensure array
            if (!Array.isArray(items)) {
                items = [items];
            }

            this.logger.log(`Found ${items.length} items to sync...`);
            let updatedCount = 0;

            for (const item of items) {
                try {
                    // Extract fields safely
                    // XML parser might return numbers for POSCode if they look like numbers
                    const sku = item.ItemCode?.POSCode?.toString();
                    // ITTData might be nested
                    const detail = item.ITTData;

                    if (!sku || !detail) continue;

                    const price = parseFloat(detail.RegularSellPrice);
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
                                category: `Conexxus-${catCode}`
                            });
                        }
                    } catch (e) {
                        // NotFoundException -> Create
                        await this.productsService.create({
                            sku,
                            name,
                            basePrice: !isNaN(price) ? price : 0,
                            category: `Conexxus-${catCode}`,
                            description: 'Imported from Conexxus NAXML',
                            cost: 0,
                            trackInventory: true,
                            ageRestricted: false // Default
                        });
                    }
                    updatedCount++;
                } catch (err) {
                    this.logger.warn(`Skipping item: ${err.message}`);
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
            const sales = await this.ordersService.getDailySummary(date);
            this.logger.log(`Generated sales report for ${date.toDateString()}. (Mock Push to ${process.env.CONEXXUS_API_URL || 'Conexxus'})`);
        } catch (error) {
            this.logger.error('Conexxus sales push failed:', error);
        }
    }
}
