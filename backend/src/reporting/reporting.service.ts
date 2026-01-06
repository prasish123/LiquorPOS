import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import {
  ReportQueryDto,
  ProductReportQueryDto,
  EmployeeReportQueryDto,
} from './dto/report-query.dto';
import {
  DailySalesReportDto,
  SalesSummaryDto,
  ProductPerformanceDto,
  InventoryReportDto,
  EmployeePerformanceDto,
  ReportMetadataDto,
} from './dto/report-response.dto';

@Injectable()
export class ReportingService {
  private readonly logger = new Logger(ReportingService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generate daily sales report
   */
  async getDailySalesReport(query: ReportQueryDto): Promise<DailySalesReportDto> {
    const startDate = new Date(query.startDate);
    const endDate = new Date(query.endDate);

    this.logger.log(`Generating daily sales report from ${startDate} to ${endDate}`);

    // Build where clause
    const where: any = {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
      status: 'completed',
    };

    if (query.locationId) {
      where.locationId = query.locationId;
    }

    // Get all transactions for the period
    const transactions = await this.prisma.transaction.findMany({
      where,
      include: {
        items: true,
        payments: true,
      },
    });

    // Calculate summary metrics
    const summary = this.calculateSalesSummary(transactions);

    // Calculate sales by hour
    const salesByHour = this.calculateSalesByHour(transactions);

    // Calculate payment method breakdown
    const paymentMethods = this.calculatePaymentMethodBreakdown(transactions);

    // Calculate top categories
    const topCategories = this.calculateTopCategories(transactions);

    return {
      date: startDate.toISOString().split('T')[0],
      summary,
      salesByHour,
      paymentMethods,
      topCategories,
    };
  }

  /**
   * Generate sales summary for a period
   */
  async getSalesSummary(query: ReportQueryDto): Promise<SalesSummaryDto> {
    const startDate = new Date(query.startDate);
    const endDate = new Date(query.endDate);

    const where: any = {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
      status: 'completed',
    };

    if (query.locationId) {
      where.locationId = query.locationId;
    }

    const transactions = await this.prisma.transaction.findMany({
      where,
      include: {
        items: true,
      },
    });

    return this.calculateSalesSummary(transactions);
  }

  /**
   * Get best-selling products
   */
  async getTopProducts(query: ProductReportQueryDto): Promise<ProductPerformanceDto[]> {
    const startDate = new Date(query.startDate);
    const endDate = new Date(query.endDate);
    const limit = query.limit || 10;

    this.logger.log(`Generating top ${limit} products report`);

    // Get transaction items
    const transactionItems = await this.prisma.transactionItem.findMany({
      where: {
        transaction: {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
          paymentStatus: 'completed',
          ...(query.locationId && { locationId: query.locationId }),
        },
      },
    });

    // Aggregate by SKU
    const skuMap = new Map<string, any>();

    for (const item of transactionItems) {
      const sku = item.sku;
      if (!skuMap.has(sku)) {
        skuMap.set(sku, {
          sku,
          name: item.name,
          unitsSold: 0,
          totalRevenue: 0,
          prices: [],
        });
      }

      const data = skuMap.get(sku);
      data.unitsSold += item.quantity;
      data.totalRevenue += item.total;
      data.prices.push(item.unitPrice);
    }

    // Get product details for each SKU
    const skus = Array.from(skuMap.keys());
    const products = await this.prisma.product.findMany({
      where: { sku: { in: skus } },
      include: {
        inventory: query.locationId ? { where: { locationId: query.locationId } } : true,
      },
    });

    // Build product map
    const productBySku = new Map(products.map((p) => [p.sku, p]));

    // Calculate metrics and convert to array
    const topProducts: ProductPerformanceDto[] = Array.from(skuMap.entries())
      .map(([sku, data]) => {
        const product = productBySku.get(sku);
        const averagePrice =
          data.prices.reduce((a: number, b: number) => a + b, 0) / data.prices.length;
        const currentStock =
          product?.inventory.reduce((sum: number, inv: any) => sum + inv.quantity, 0) || 0;
        const profitMargin = 0; // TODO: Calculate from product cost

        // Calculate turnover rate (units sold / average stock)
        const averageStock = currentStock + data.unitsSold / 2; // Simple approximation
        const turnoverRate = averageStock > 0 ? data.unitsSold / averageStock : 0;

        return {
          productId: product?.id || sku,
          productName: data.name,
          sku,
          category: product?.category || 'UNKNOWN',
          unitsSold: data.unitsSold,
          totalRevenue: data.totalRevenue,
          averagePrice,
          profitMargin,
          currentStock,
          turnoverRate,
        };
      })
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, limit);

    return topProducts;
  }

  /**
   * Generate inventory report
   */
  async getInventoryReport(query: ReportQueryDto): Promise<InventoryReportDto> {
    this.logger.log('Generating inventory report');

    const where: any = {};
    if (query.locationId) {
      where.locationId = query.locationId;
    }

    // Get all inventory items
    const inventory = await this.prisma.inventory.findMany({
      where,
      include: {
        product: true,
      },
    });

    // Calculate total value
    const totalValue = inventory.reduce(
      (sum, item) => sum + item.quantity * item.product.basePrice,
      0,
    );

    const totalItems = inventory.reduce((sum, item) => sum + item.quantity, 0);

    // Find low stock items (below threshold of 10)
    const lowStockThreshold = 10;
    const lowStockItems = inventory
      .filter((item) => item.quantity <= lowStockThreshold)
      .map((item) => ({
        productId: item.productId,
        name: item.product.name,
        sku: item.product.sku,
        currentStock: item.quantity,
        reorderLevel: lowStockThreshold,
      }));

    // Find out of stock items
    const outOfStockCount = inventory.filter((item) => item.quantity === 0).length;

    // Get sales data for turnover calculation
    const startDate = new Date(query.startDate);
    const endDate = new Date(query.endDate);
    const daysDiff = Math.max(1, (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

    const transactionItems = await this.prisma.transactionItem.findMany({
      where: {
        transaction: {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
          paymentStatus: 'completed',
          ...(query.locationId && { locationId: query.locationId }),
        },
      },
      select: {
        sku: true,
        quantity: true,
      },
    });

    // Calculate sales by SKU
    const salesMap = new Map<string, number>();
    for (const item of transactionItems) {
      salesMap.set(item.sku, (salesMap.get(item.sku) || 0) + item.quantity);
    }

    // Map SKU to productId
    const skuToProductId = new Map(inventory.map((inv) => [inv.product.sku, inv.productId]));

    // Find slow moving items (no sales in last 30+ days)
    const slowMovingItems = inventory
      .filter((item) => {
        const sales = salesMap.get(item.product.sku) || 0;
        return sales === 0 && item.quantity > 0;
      })
      .slice(0, 20)
      .map((item) => ({
        productId: item.productId,
        name: item.product.name,
        sku: item.product.sku,
        daysSinceLastSale: Math.floor(daysDiff),
        currentStock: item.quantity,
      }));

    // Calculate category breakdown
    const categoryMap = new Map<string, any>();
    for (const item of inventory) {
      const category = item.product.category;
      if (!categoryMap.has(category)) {
        categoryMap.set(category, {
          category,
          itemCount: 0,
          totalValue: 0,
          totalSales: 0,
          totalStock: 0,
        });
      }
      const data = categoryMap.get(category);
      data.itemCount++;
      data.totalValue += item.quantity * item.product.basePrice;
      data.totalStock += item.quantity;
      data.totalSales += salesMap.get(item.product.sku) || 0;
    }

    const categoryBreakdown = Array.from(categoryMap.values()).map((data) => ({
      category: data.category,
      itemCount: data.itemCount,
      totalValue: data.totalValue,
      averageTurnover: data.totalStock > 0 ? data.totalSales / data.totalStock : 0,
    }));

    // Calculate average turnover rate
    const totalSales = Array.from(salesMap.values()).reduce((sum, qty) => sum + qty, 0);
    const averageTurnoverRate = totalItems > 0 ? totalSales / totalItems : 0;

    return {
      totalValue,
      totalItems,
      lowStockCount: lowStockItems.length,
      outOfStockCount,
      averageTurnoverRate,
      lowStockItems,
      slowMovingItems,
      categoryBreakdown,
    };
  }

  /**
   * Generate employee performance report
   */
  async getEmployeePerformance(query: EmployeeReportQueryDto): Promise<EmployeePerformanceDto[]> {
    const startDate = new Date(query.startDate);
    const endDate = new Date(query.endDate);

    this.logger.log('Generating employee performance report');

    const where: any = {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
      paymentStatus: 'completed',
      employeeId: { not: null },
    };

    if (query.locationId) {
      where.locationId = query.locationId;
    }

    if (query.employeeId) {
      where.employeeId = query.employeeId;
    }

    const transactions = await this.prisma.transaction.findMany({
      where,
      include: {
        items: true,
      },
    });

    // Group by employee
    const employeeMap = new Map<string, any>();

    for (const transaction of transactions) {
      const employeeId = transaction.employeeId!;
      if (!employeeMap.has(employeeId)) {
        employeeMap.set(employeeId, {
          employeeId,
          transactions: [],
          totalRevenue: 0,
        });
      }

      const data = employeeMap.get(employeeId);
      data.transactions.push(transaction);
      data.totalRevenue += transaction.total;
    }

    // Calculate metrics for each employee
    const performance: EmployeePerformanceDto[] = [];

    for (const [employeeId, data] of employeeMap.entries()) {
      const transactionsProcessed = data.transactions.length;
      const totalRevenue = data.totalRevenue;
      const averageTransactionValue = totalRevenue / transactionsProcessed;

      // Calculate hours worked (simplified - assumes 8 hour days)
      const daysDiff = Math.max(
        1,
        (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
      );
      const hoursWorked = Math.min(daysDiff * 8, 160); // Cap at 160 hours/month

      performance.push({
        employeeId,
        employeeName: `Employee ${employeeId}`, // TODO: Get from user table
        transactionsProcessed,
        totalRevenue,
        averageTransactionValue,
        hoursWorked,
        revenuePerHour: totalRevenue / hoursWorked,
        transactionsPerHour: transactionsProcessed / hoursWorked,
      });
    }

    return performance.sort((a, b) => b.totalRevenue - a.totalRevenue);
  }

  /**
   * Get report metadata
   */
  getReportMetadata(
    query: ReportQueryDto,
    reportType: string,
    dataPoints: number,
  ): ReportMetadataDto {
    return {
      generatedAt: new Date(),
      periodStart: new Date(query.startDate),
      periodEnd: new Date(query.endDate),
      locationId: query.locationId,
      reportType,
      dataPoints,
    };
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  private calculateSalesSummary(transactions: any[]): SalesSummaryDto {
    const totalRevenue = transactions.reduce((sum, t) => sum + t.total, 0);
    const totalTransactions = transactions.length;
    const averageTransactionValue = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;
    const totalItemsSold = transactions.reduce(
      (sum, t) => sum + t.items.reduce((s: number, i: any) => s + i.quantity, 0),
      0,
    );
    const totalTax = transactions.reduce((sum, t) => sum + t.tax, 0);
    const totalDiscounts = transactions.reduce((sum, t) => sum + (t.discount || 0), 0);
    const netRevenue = totalRevenue - totalDiscounts;

    return {
      totalRevenue,
      totalTransactions,
      averageTransactionValue,
      totalItemsSold,
      totalTax,
      totalDiscounts,
      netRevenue,
    };
  }

  private calculateSalesByHour(transactions: any[]): Record<string, number> {
    const hourlyData: Record<string, number> = {};

    for (let hour = 0; hour < 24; hour++) {
      hourlyData[hour.toString().padStart(2, '0')] = 0;
    }

    for (const transaction of transactions) {
      const hour = new Date(transaction.createdAt).getHours();
      hourlyData[hour.toString().padStart(2, '0')] += transaction.total;
    }

    return hourlyData;
  }

  private calculatePaymentMethodBreakdown(
    transactions: any[],
  ): Record<string, { count: number; amount: number }> {
    const methods: Record<string, { count: number; amount: number }> = {};

    for (const transaction of transactions) {
      for (const payment of transaction.payments || []) {
        const method = payment.method;
        if (!methods[method]) {
          methods[method] = { count: 0, amount: 0 };
        }
        methods[method].count++;
        methods[method].amount += payment.amount;
      }
    }

    return methods;
  }

  private calculateTopCategories(
    transactions: any[],
  ): Array<{ category: string; revenue: number; quantity: number }> {
    const categoryMap = new Map<string, { revenue: number; quantity: number }>();

    for (const transaction of transactions) {
      for (const item of transaction.items) {
        const category = 'GENERAL'; // TODO: Get category from product lookup by SKU
        if (!categoryMap.has(category)) {
          categoryMap.set(category, { revenue: 0, quantity: 0 });
        }
        const data = categoryMap.get(category)!;
        data.revenue += item.total;
        data.quantity += item.quantity;
      }
    }

    return Array.from(categoryMap.entries())
      .map(([category, data]) => ({
        category,
        revenue: data.revenue,
        quantity: data.quantity,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);
  }
}
