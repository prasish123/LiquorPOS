import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { PinAuthService } from '../auth/pin-auth.service';
import { AuditService } from './audit.service';
import { OverrideReason } from '@prisma/client';

export interface PriceOverrideRequest {
  transactionId: string;
  itemSku: string;
  originalPrice: number;
  overridePrice: number;
  reason: OverrideReason;
  reasonNotes?: string;
  managerPin: string;
  cashierId?: string;
  terminalId?: string;
}

export interface PriceOverrideResponse {
  overrideId: string;
  approved: boolean;
  managerName: string;
  newPrice: number;
}

@Injectable()
export class PriceOverrideService {
  constructor(
    private prisma: PrismaService,
    private pinAuth: PinAuthService,
    private auditService: AuditService,
  ) {}

  /**
   * Request price override with manager PIN
   */
  async requestOverride(request: PriceOverrideRequest): Promise<PriceOverrideResponse> {
    // Step 1: Authenticate manager by PIN
    const manager = await this.pinAuth.authenticateByPin(request.managerPin);

    // Step 2: Validate manager role
    const isManager = await this.pinAuth.validateManagerRole(manager.userId);
    if (!isManager) {
      throw new ForbiddenException('Only managers and admins can override prices');
    }

    // Step 3: Validate override amount (prevent abuse)
    const discountPercent =
      ((request.originalPrice - request.overridePrice) / request.originalPrice) * 100;

    // Warn if discount > 50% (but still allow)
    if (discountPercent > 50) {
      console.warn(
        `Large price override: ${discountPercent.toFixed(1)}% discount by ${manager.firstName} ${manager.lastName}`,
      );
    }

    // Prevent negative prices
    if (request.overridePrice < 0) {
      throw new Error('Override price cannot be negative');
    }

    // Step 4: Get transaction and verify it exists
    const transaction = await this.prisma.transaction.findUnique({
      where: { id: request.transactionId },
      include: { items: true },
    });

    if (!transaction) {
      throw new Error(`Transaction ${request.transactionId} not found`);
    }

    // Find the item in the transaction
    const item = transaction.items.find((i) => i.sku === request.itemSku);
    if (!item) {
      throw new Error(`Item ${request.itemSku} not found in transaction`);
    }

    // Step 5: Get cashier name for audit trail
    let cashierName = 'Unknown';
    if (request.cashierId) {
      const cashier = await this.prisma.user.findUnique({
        where: { id: request.cashierId },
      });
      if (cashier) {
        cashierName = `${cashier.firstName} ${cashier.lastName}`;
      }
    }

    // Step 6: Create price override record
    const override = await this.prisma.priceOverride.create({
      data: {
        transactionId: request.transactionId,
        itemId: item.id,
        originalPrice: request.originalPrice,
        overridePrice: request.overridePrice,
        reason: request.reason,
        reasonNotes: request.reasonNotes,
        managerId: manager.userId,
        managerName: `${manager.firstName} ${manager.lastName}`,
        cashierId: request.cashierId,
        cashierName,
        terminalId: request.terminalId,
      },
    });

    // Step 7: Update transaction item with new price
    const priceDifference = request.originalPrice - request.overridePrice;
    const newItemTotal = request.overridePrice * item.quantity;

    await this.prisma.transactionItem.update({
      where: { id: item.id },
      data: {
        originalPrice: request.originalPrice,
        unitPrice: request.overridePrice,
        priceOverridden: true,
        total: newItemTotal,
      },
    });

    // Step 8: Update transaction totals
    const newSubtotal = transaction.subtotal - priceDifference * item.quantity;
    const newTax = newSubtotal * (transaction.tax / transaction.subtotal); // Proportional tax
    const newTotal = newSubtotal + newTax;

    await this.prisma.transaction.update({
      where: { id: request.transactionId },
      data: {
        subtotal: newSubtotal,
        tax: newTax,
        total: newTotal,
      },
    });

    // Step 9: Log to immutable audit trail
    await this.auditService.logPriceOverride(
      request.transactionId,
      item.sku,
      request.originalPrice,
      request.overridePrice,
      request.reason,
      manager.userId,
      request.cashierId,
      {
        userId: manager.userId,
        ipAddress: undefined, // Set by controller
        userAgent: undefined,
      },
    );

    return {
      overrideId: override.id,
      approved: true,
      managerName: override.managerName,
      newPrice: request.overridePrice,
    };
  }

  /**
   * Get all overrides for a transaction
   */
  async getTransactionOverrides(transactionId: string) {
    return await this.prisma.priceOverride.findMany({
      where: { transactionId },
      orderBy: { approvedAt: 'desc' },
    });
  }

  /**
   * Get override statistics for manager
   */
  async getManagerOverrideStats(managerId: string, days: number = 30) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const overrides = await this.prisma.priceOverride.findMany({
      where: {
        managerId,
        approvedAt: { gte: since },
      },
    });

    const totalOverrides = overrides.length;
    const totalDiscount = overrides.reduce(
      (sum, o) => sum + (o.originalPrice - o.overridePrice),
      0,
    );

    const reasonBreakdown = overrides.reduce(
      (acc, o) => {
        acc[o.reason] = (acc[o.reason] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    return {
      totalOverrides,
      totalDiscount,
      averageDiscount: totalOverrides > 0 ? totalDiscount / totalOverrides : 0,
      reasonBreakdown,
    };
  }
}
