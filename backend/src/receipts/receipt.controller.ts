import { Controller, Get, Post, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ReceiptService } from './receipt.service';

@ApiTags('receipts')
@Controller('receipts')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ReceiptController {
  constructor(private receiptService: ReceiptService) {}

  @Post(':transactionId/generate')
  @ApiOperation({ summary: 'Generate receipt for transaction' })
  async generateReceipt(@Param('transactionId') transactionId: string) {
    const receiptText = await this.receiptService.generateReceipt(transactionId);
    return { receipt: receiptText };
  }

  @Get(':transactionId')
  @ApiOperation({ summary: 'Get receipt text' })
  async getReceipt(@Param('transactionId') transactionId: string) {
    const receiptText = await this.receiptService.reprintReceipt(transactionId);
    return { receipt: receiptText };
  }

  @Get(':transactionId/html')
  @ApiOperation({ summary: 'Get receipt HTML for browser printing' })
  async getReceiptHtml(@Param('transactionId') transactionId: string) {
    const html = await this.receiptService.getReceiptHtml(transactionId);
    return html;
  }

  @Post(':transactionId/print-console')
  @ApiOperation({ summary: 'Print receipt to console (development)' })
  async printToConsole(@Param('transactionId') transactionId: string) {
    await this.receiptService.printToConsole(transactionId);
    return { message: 'Receipt printed to console' };
  }
}
