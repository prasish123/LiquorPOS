import { ApiProperty } from '@nestjs/swagger';

export class SalesSummaryDto {
  @ApiProperty({ description: 'Total revenue', example: 15420.50 })
  totalRevenue: number;

  @ApiProperty({ description: 'Total transactions', example: 145 })
  totalTransactions: number;

  @ApiProperty({ description: 'Average transaction value', example: 106.35 })
  averageTransactionValue: number;

  @ApiProperty({ description: 'Total items sold', example: 387 })
  totalItemsSold: number;

  @ApiProperty({ description: 'Total tax collected', example: 1234.56 })
  totalTax: number;

  @ApiProperty({ description: 'Total discounts given', example: 234.50 })
  totalDiscounts: number;

  @ApiProperty({ description: 'Net revenue (after discounts)', example: 15186.00 })
  netRevenue: number;
}

export class DailySalesReportDto {
  @ApiProperty({ description: 'Report date', example: '2026-01-15' })
  date: string;

  @ApiProperty({ type: SalesSummaryDto })
  summary: SalesSummaryDto;

  @ApiProperty({ description: 'Sales by hour' })
  salesByHour: Record<string, number>;

  @ApiProperty({ description: 'Payment method breakdown' })
  paymentMethods: Record<string, { count: number; amount: number }>;

  @ApiProperty({ description: 'Top selling categories', isArray: true })
  topCategories: Array<{ category: string; revenue: number; quantity: number }>;
}

export class ProductPerformanceDto {
  @ApiProperty({ description: 'Product ID', example: 'prod_123' })
  productId: string;

  @ApiProperty({ description: 'Product name', example: 'Cabernet Sauvignon 2020' })
  productName: string;

  @ApiProperty({ description: 'SKU', example: 'WIN-CAB-2020' })
  sku: string;

  @ApiProperty({ description: 'Category', example: 'WINE' })
  category: string;

  @ApiProperty({ description: 'Units sold', example: 45 })
  unitsSold: number;

  @ApiProperty({ description: 'Total revenue', example: 2250.00 })
  totalRevenue: number;

  @ApiProperty({ description: 'Average selling price', example: 50.00 })
  averagePrice: number;

  @ApiProperty({ description: 'Profit margin percentage', example: 35.5 })
  profitMargin: number;

  @ApiProperty({ description: 'Current stock level', example: 120 })
  currentStock: number;

  @ApiProperty({ description: 'Stock turnover rate', example: 0.375 })
  turnoverRate: number;
}

export class InventoryReportDto {
  @ApiProperty({ description: 'Total inventory value', example: 125000.00 })
  totalValue: number;

  @ApiProperty({ description: 'Total items in stock', example: 2500 })
  totalItems: number;

  @ApiProperty({ description: 'Low stock items count', example: 15 })
  lowStockCount: number;

  @ApiProperty({ description: 'Out of stock items count', example: 3 })
  outOfStockCount: number;

  @ApiProperty({ description: 'Average turnover rate', example: 0.42 })
  averageTurnoverRate: number;

  @ApiProperty({ description: 'Low stock items', isArray: true })
  lowStockItems: Array<{
    productId: string;
    name: string;
    sku: string;
    currentStock: number;
    reorderLevel: number;
  }>;

  @ApiProperty({ description: 'Slow moving items', isArray: true })
  slowMovingItems: Array<{
    productId: string;
    name: string;
    sku: string;
    daysSinceLastSale: number;
    currentStock: number;
  }>;

  @ApiProperty({ description: 'Inventory by category', isArray: true })
  categoryBreakdown: Array<{
    category: string;
    itemCount: number;
    totalValue: number;
    averageTurnover: number;
  }>;
}

export class EmployeePerformanceDto {
  @ApiProperty({ description: 'Employee ID', example: 'emp_123' })
  employeeId: string;

  @ApiProperty({ description: 'Employee name', example: 'John Doe' })
  employeeName: string;

  @ApiProperty({ description: 'Total transactions processed', example: 145 })
  transactionsProcessed: number;

  @ApiProperty({ description: 'Total revenue generated', example: 15420.50 })
  totalRevenue: number;

  @ApiProperty({ description: 'Average transaction value', example: 106.35 })
  averageTransactionValue: number;

  @ApiProperty({ description: 'Hours worked', example: 40 })
  hoursWorked: number;

  @ApiProperty({ description: 'Revenue per hour', example: 385.51 })
  revenuePerHour: number;

  @ApiProperty({ description: 'Transactions per hour', example: 3.63 })
  transactionsPerHour: number;

  @ApiProperty({ description: 'Customer satisfaction score', example: 4.5 })
  satisfactionScore?: number;
}

export class ReportMetadataDto {
  @ApiProperty({ description: 'Report generation timestamp' })
  generatedAt: Date;

  @ApiProperty({ description: 'Report period start' })
  periodStart: Date;

  @ApiProperty({ description: 'Report period end' })
  periodEnd: Date;

  @ApiProperty({ description: 'Location ID if filtered' })
  locationId?: string;

  @ApiProperty({ description: 'Report type' })
  reportType: string;

  @ApiProperty({ description: 'Data points count' })
  dataPoints: number;
}

