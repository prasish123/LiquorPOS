import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

export interface ReceiptData {
  transactionId: string;
  storeName: string;
  storeAddress: string;
  storeCity: string;
  storeState: string;
  storeZip: string;
  date: Date;
  cashierName: string;
  terminalId: string;
  items: Array<{
    name: string;
    quantity: number;
    unitPrice: number;
    total: number;
    priceOverridden?: boolean;
    originalPrice?: number;
    managerName?: string;
  }>;
  subtotal: number;
  tax: number;
  total: number;
  paymentMethod: string;
  cardType?: string;
  last4?: string;
  ageVerified: boolean;
  customFooter?: string;
}

@Injectable()
export class ReceiptService {
  constructor(private prisma: PrismaService) {}

  /**
   * Generate receipt for a transaction
   */
  async generateReceipt(transactionId: string): Promise<string> {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id: transactionId },
      include: {
        items: true,
        payments: true,
        location: true,
        priceOverrides: {
          include: {
            manager: true,
          },
        },
      },
    });

    if (!transaction) {
      throw new Error(`Transaction ${transactionId} not found`);
    }

    // Get employee name
    const employee = transaction.employeeId
      ? await this.prisma.user.findUnique({
          where: { id: transaction.employeeId },
        })
      : null;

    // Map items with override information
    const itemsWithOverrides = transaction.items.map((item) => {
      const override = transaction.priceOverrides.find((o) => o.itemId === item.id);

      return {
        name: item.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        total: item.total,
        priceOverridden: item.priceOverridden,
        originalPrice: item.originalPrice ?? undefined,
        managerName: override?.managerName,
      };
    });

    const receiptData: ReceiptData = {
      transactionId: transaction.id,
      storeName: transaction.location.name,
      storeAddress: transaction.location.address,
      storeCity: transaction.location.city,
      storeState: transaction.location.state,
      storeZip: transaction.location.zip,
      date: transaction.createdAt,
      cashierName: employee ? `${employee.firstName} ${employee.lastName}` : 'Unknown',
      terminalId: transaction.terminalId || 'N/A',
      items: itemsWithOverrides,
      subtotal: transaction.subtotal,
      tax: transaction.tax,
      total: transaction.total,
      paymentMethod: transaction.paymentMethod,
      cardType: transaction.payments[0]?.cardType ?? undefined,
      last4: transaction.payments[0]?.last4 ?? undefined,
      ageVerified: transaction.ageVerified,
      customFooter: transaction.location.receiptFooter || 'Thank you!',
    };

    const receiptText = this.formatReceiptText(receiptData);
    const receiptHtml = this.formatReceiptHtml(receiptData);

    // Save receipt to database
    await this.prisma.receipt.create({
      data: {
        transactionId: transaction.id,
        content: receiptText,
        htmlContent: receiptHtml,
      },
    });

    return receiptText;
  }

  /**
   * Format receipt as plain text (for console/thermal printers)
   */
  private formatReceiptText(data: ReceiptData): string {
    const width = 42; // 80mm thermal printer typical width
    const line = '='.repeat(width);
    const dash = '-'.repeat(width);

    const center = (text: string) => {
      const padding = Math.max(0, Math.floor((width - text.length) / 2));
      return ' '.repeat(padding) + text;
    };

    const leftRight = (left: string, right: string) => {
      const spaces = Math.max(1, width - left.length - right.length);
      return left + ' '.repeat(spaces) + right;
    };

    let receipt = '';
    receipt += line + '\n';
    receipt += center(data.storeName) + '\n';
    receipt += center(data.storeAddress) + '\n';
    receipt += center(`${data.storeCity}, ${data.storeState} ${data.storeZip}`) + '\n';
    receipt += line + '\n';
    receipt += '\n';
    receipt += `Date: ${data.date.toLocaleString('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    })}\n`;
    receipt += `Cashier: ${data.cashierName}\n`;
    receipt += `Terminal: ${data.terminalId}\n`;
    receipt += '\n';
    receipt += dash + '\n';

    // Items
    for (const item of data.items) {
      const itemLine = `${item.name.substring(0, 25).padEnd(25)} x${item.quantity}`;
      receipt += leftRight(itemLine, `$${item.total.toFixed(2)}`) + '\n';

      // Show price override if applicable
      if (item.priceOverridden && item.originalPrice && item.managerName) {
        receipt += `  Price Override: $${item.originalPrice.toFixed(2)} → $${item.unitPrice.toFixed(2)}\n`;
        receipt += `  (Manager: ${item.managerName})\n`;
      }
    }

    receipt += dash + '\n';
    receipt += leftRight('Subtotal:', `$${data.subtotal.toFixed(2)}`) + '\n';
    receipt +=
      leftRight(
        `Tax (${((data.tax / data.subtotal) * 100).toFixed(1)}%):`,
        `$${data.tax.toFixed(2)}`,
      ) + '\n';
    receipt += leftRight('Total:', `$${data.total.toFixed(2)}`) + '\n';
    receipt += '\n';

    // Payment
    let paymentLine = `Payment: ${data.paymentMethod}`;
    if (data.cardType && data.last4) {
      paymentLine += ` (${data.cardType} ****${data.last4})`;
    }
    receipt += paymentLine + '\n';

    // Age verification
    if (data.ageVerified) {
      receipt += '\n';
      receipt += center('✓ AGE VERIFIED') + '\n';
    }

    receipt += '\n';
    receipt += center(data.customFooter ?? 'Thank you!') + '\n';
    receipt += line + '\n';

    return receipt;
  }

  /**
   * Format receipt as HTML (for browser printing)
   */
  private formatReceiptHtml(data: ReceiptData): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Receipt - ${data.transactionId}</title>
  <style>
    @media print {
      body { margin: 0; }
      .no-print { display: none; }
    }
    body {
      font-family: 'Courier New', monospace;
      font-size: 12px;
      max-width: 80mm;
      margin: 0 auto;
      padding: 10px;
    }
    .center { text-align: center; }
    .line { border-top: 2px solid #000; margin: 5px 0; }
    .dash { border-top: 1px dashed #000; margin: 5px 0; }
    .row { display: flex; justify-content: space-between; }
    .bold { font-weight: bold; }
    .verified {
      background: #4CAF50;
      color: white;
      padding: 5px;
      margin: 10px 0;
      text-align: center;
      font-weight: bold;
    }
    .override {
      font-size: 10px;
      color: #666;
      margin-left: 10px;
    }
  </style>
</head>
<body>
  <div class="line"></div>
  <div class="center bold">${data.storeName}</div>
  <div class="center">${data.storeAddress}</div>
  <div class="center">${data.storeCity}, ${data.storeState} ${data.storeZip}</div>
  <div class="line"></div>
  
  <div>Date: ${data.date.toLocaleString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })}</div>
  <div>Cashier: ${data.cashierName}</div>
  <div>Terminal: ${data.terminalId}</div>
  
  <div class="dash"></div>
  
  ${data.items
    .map(
      (item) => `
    <div class="row">
      <span>${item.name} x${item.quantity}</span>
      <span>$${item.total.toFixed(2)}</span>
    </div>
    ${
      item.priceOverridden && item.originalPrice && item.managerName
        ? `<div class="override">Price Override: $${item.originalPrice.toFixed(2)} → $${item.unitPrice.toFixed(2)} (Manager: ${item.managerName})</div>`
        : ''
    }
  `,
    )
    .join('')}
  
  <div class="dash"></div>
  
  <div class="row">
    <span>Subtotal:</span>
    <span>$${data.subtotal.toFixed(2)}</span>
  </div>
  <div class="row">
    <span>Tax:</span>
    <span>$${data.tax.toFixed(2)}</span>
  </div>
  <div class="row bold">
    <span>Total:</span>
    <span>$${data.total.toFixed(2)}</span>
  </div>
  
  <div style="margin-top: 10px;">
    Payment: ${data.paymentMethod}${data.cardType && data.last4 ? ` (${data.cardType} ****${data.last4})` : ''}
  </div>
  
  ${data.ageVerified ? '<div class="verified">✓ AGE VERIFIED</div>' : ''}
  
  <div class="center" style="margin-top: 10px;">${data.customFooter}</div>
  <div class="line"></div>
  
  <div class="no-print" style="margin-top: 20px; text-align: center;">
    <button onclick="window.print()">Print Receipt</button>
    <button onclick="window.close()">Close</button>
  </div>
</body>
</html>
    `;
  }

  /**
   * Reprint existing receipt
   */
  async reprintReceipt(transactionId: string): Promise<string> {
    const receipt = await this.prisma.receipt.findUnique({
      where: { transactionId },
    });

    if (!receipt) {
      // Generate if doesn't exist
      return this.generateReceipt(transactionId);
    }

    // Update reprint count
    await this.prisma.receipt.update({
      where: { id: receipt.id },
      data: {
        reprintCount: { increment: 1 },
        lastReprintAt: new Date(),
      },
    });

    return receipt.content;
  }

  /**
   * Get HTML receipt for browser printing
   */
  async getReceiptHtml(transactionId: string): Promise<string> {
    const receipt = await this.prisma.receipt.findUnique({
      where: { transactionId },
    });

    if (!receipt || !receipt.htmlContent) {
      // Generate if doesn't exist
      await this.generateReceipt(transactionId);
      const newReceipt = await this.prisma.receipt.findUnique({
        where: { transactionId },
      });
      return newReceipt!.htmlContent!;
    }

    return receipt.htmlContent;
  }

  /**
   * Print receipt to console (for development/testing)
   */
  async printToConsole(transactionId: string): Promise<void> {
    const receiptText = await this.generateReceipt(transactionId);
    console.log('\n' + receiptText + '\n');
  }
}
