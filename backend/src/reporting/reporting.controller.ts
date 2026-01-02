import { Controller, Get, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ReportingService } from './reporting.service';
import { ExportService } from './export.service';
import {
  ReportQueryDto,
  ProductReportQueryDto,
  EmployeeReportQueryDto,
  ReportFormat,
} from './dto/report-query.dto';
import {
  DailySalesReportDto,
  SalesSummaryDto,
  ProductPerformanceDto,
  InventoryReportDto,
  EmployeePerformanceDto,
} from './dto/report-response.dto';

@ApiTags('reporting')
@Controller('reporting')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ReportingController {
  constructor(
    private readonly reportingService: ReportingService,
    private readonly exportService: ExportService,
  ) {}

  /**
   * Get daily sales report
   * GET /reporting/sales/daily
   */
  @Get('sales/daily')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get daily sales report',
    description:
      'Generate a comprehensive daily sales report including revenue, transactions, hourly breakdown, and payment methods.',
  })
  @ApiResponse({
    status: 200,
    description: 'Daily sales report generated successfully',
    type: DailySalesReportDto,
  })
  async getDailySalesReport(@Query() query: ReportQueryDto): Promise<DailySalesReportDto> {
    return this.reportingService.getDailySalesReport(query);
  }

  /**
   * Get sales summary
   * GET /reporting/sales/summary
   */
  @Get('sales/summary')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get sales summary',
    description: 'Get aggregated sales metrics for a specified period.',
  })
  @ApiResponse({
    status: 200,
    description: 'Sales summary generated successfully',
    type: SalesSummaryDto,
  })
  async getSalesSummary(@Query() query: ReportQueryDto): Promise<SalesSummaryDto> {
    return this.reportingService.getSalesSummary(query);
  }

  /**
   * Get top selling products
   * GET /reporting/products/top
   */
  @Get('products/top')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get top selling products',
    description:
      'Get best-selling products ranked by revenue, with performance metrics including turnover rate and profit margin.',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of products to return (default: 10)',
  })
  @ApiResponse({
    status: 200,
    description: 'Top products report generated successfully',
    type: [ProductPerformanceDto],
  })
  async getTopProducts(
    @Query() query: ProductReportQueryDto,
  ): Promise<ProductPerformanceDto[]> {
    return this.reportingService.getTopProducts(query);
  }

  /**
   * Get inventory report
   * GET /reporting/inventory
   */
  @Get('inventory')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get inventory report',
    description:
      'Generate comprehensive inventory report including stock levels, turnover rates, low stock alerts, and slow-moving items.',
  })
  @ApiResponse({
    status: 200,
    description: 'Inventory report generated successfully',
    type: InventoryReportDto,
  })
  async getInventoryReport(@Query() query: ReportQueryDto): Promise<InventoryReportDto> {
    return this.reportingService.getInventoryReport(query);
  }

  /**
   * Get employee performance report
   * GET /reporting/employees/performance
   */
  @Get('employees/performance')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get employee performance report',
    description:
      'Generate employee performance metrics including transactions processed, revenue generated, and productivity rates.',
  })
  @ApiResponse({
    status: 200,
    description: 'Employee performance report generated successfully',
    type: [EmployeePerformanceDto],
  })
  async getEmployeePerformance(
    @Query() query: EmployeeReportQueryDto,
  ): Promise<EmployeePerformanceDto[]> {
    return this.reportingService.getEmployeePerformance(query);
  }

  /**
   * Export sales report
   * GET /reporting/export/sales
   */
  @Get('export/sales')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Export sales report',
    description: 'Export sales report in specified format (CSV, Excel, PDF).',
  })
  @ApiQuery({
    name: 'format',
    required: false,
    enum: ReportFormat,
    description: 'Export format (default: CSV)',
  })
  @ApiResponse({
    status: 200,
    description: 'Sales report exported successfully',
  })
  async exportSalesReport(@Query() query: ReportQueryDto): Promise<any> {
    const report = await this.reportingService.getDailySalesReport(query);
    const format = query.format || ReportFormat.CSV;

    switch (format) {
      case ReportFormat.CSV:
        return this.exportService.exportToCSV(report, 'sales-report');
      case ReportFormat.EXCEL:
        return this.exportService.exportToExcel(report, 'sales-report');
      case ReportFormat.PDF:
        return this.exportService.exportToPDF(report, 'sales-report');
      default:
        return report;
    }
  }

  /**
   * Export inventory report
   * GET /reporting/export/inventory
   */
  @Get('export/inventory')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Export inventory report',
    description: 'Export inventory report in specified format (CSV, Excel, PDF).',
  })
  @ApiResponse({
    status: 200,
    description: 'Inventory report exported successfully',
  })
  async exportInventoryReport(@Query() query: ReportQueryDto): Promise<any> {
    const report = await this.reportingService.getInventoryReport(query);
    const format = query.format || ReportFormat.CSV;

    switch (format) {
      case ReportFormat.CSV:
        return this.exportService.exportToCSV(report, 'inventory-report');
      case ReportFormat.EXCEL:
        return this.exportService.exportToExcel(report, 'inventory-report');
      case ReportFormat.PDF:
        return this.exportService.exportToPDF(report, 'inventory-report');
      default:
        return report;
    }
  }
}

