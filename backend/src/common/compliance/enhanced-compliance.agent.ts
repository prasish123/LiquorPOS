import { Injectable, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { EncryptionService } from '../encryption.service';
import { OrderItemDto } from '../../orders/dto/order.dto';
import {
  getStateRegulation,
  isSaleAllowedNow,
  isValidIdType,
  StateRegulation,
} from './state-regulations';

export interface IDVerificationData {
  idType: string; // drivers_license, passport, etc.
  idNumber?: string; // Encrypted
  idState?: string;
  idExpiration?: Date;
  scanData?: string; // Encrypted scan data
  scanTimestamp?: Date;
  verificationMethod: 'manual' | 'scanner' | 'app';
}

export interface EnhancedComplianceResult {
  ageVerified: boolean;
  requiresAgeVerification: boolean;
  customerId?: string;
  customerAge?: number;
  stateCode: string;
  regulation: StateRegulation | null;
  saleAllowed: boolean;
  saleRestrictionReason?: string;
  idVerification?: IDVerificationData;
  warnings: string[];
}

export interface ComplianceReportData {
  transactionId: string;
  locationId: string;
  stateCode: string;
  timestamp: Date;
  ageVerified: boolean;
  idScanned: boolean;
  idType?: string;
  customerId?: string;
  customerAge?: number;
  employeeId?: string;
  productTypes: string[];
  totalAmount: number;
  complianceStatus: 'passed' | 'failed' | 'warning';
  violations: string[];
}

@Injectable()
export class EnhancedComplianceAgent {
  constructor(
    private prisma: PrismaService,
    private encryption: EncryptionService,
  ) {}

  /**
   * Comprehensive age and compliance verification
   */
  async verifyCompliance(
    items: OrderItemDto[],
    locationId: string,
    customerId?: string,
    ageVerified?: boolean,
    idVerification?: IDVerificationData,
  ): Promise<EnhancedComplianceResult> {
    const warnings: string[] = [];

    // Get location to determine state
    const location = await this.prisma.location.findUnique({
      where: { id: locationId },
    });

    if (!location) {
      throw new BadRequestException('Location not found');
    }

    const stateCode = location.state;
    const regulation = getStateRegulation(stateCode);

    if (!regulation) {
      warnings.push(`No specific regulations found for state: ${stateCode}`);
    }

    // Check if any items are age-restricted
    const ageRestrictedItems = await this.getAgeRestrictedItems(items);
    const requiresAgeVerification = ageRestrictedItems.length > 0;

    if (!requiresAgeVerification) {
      return {
        ageVerified: true,
        requiresAgeVerification: false,
        stateCode,
        regulation,
        saleAllowed: true,
        warnings,
      };
    }

    // Check time-based restrictions
    const productTypes = await this.getProductTypes(ageRestrictedItems);
    for (const productType of productTypes) {
      const saleCheck = isSaleAllowedNow(stateCode, productType as 'beer' | 'wine' | 'spirits');
      if (!saleCheck.allowed) {
        return {
          ageVerified: false,
          requiresAgeVerification: true,
          stateCode,
          regulation,
          saleAllowed: false,
          saleRestrictionReason: saleCheck.reason,
          warnings,
        };
      }
    }

    // Age verification required but not provided
    if (!ageVerified) {
      throw new ForbiddenException('Age verification required for alcohol purchases');
    }

    // Validate ID type if provided
    if (idVerification && regulation) {
      if (!isValidIdType(stateCode, idVerification.idType)) {
        warnings.push(
          `ID type '${idVerification.idType}' may not be acceptable in ${regulation.state}`,
        );
      }

      // Check if ID scanning is required
      if (regulation.requiresIdScan && idVerification.verificationMethod === 'manual') {
        warnings.push(`${regulation.state} requires ID scanning for alcohol sales`);
      }
    }

    // Verify customer age if customer ID provided
    let customerAge: number | undefined;
    if (customerId) {
      const customer = await this.prisma.customer.findUnique({
        where: { id: customerId },
      });

      if (customer && customer.dateOfBirth) {
        customerAge = this.calculateAge(customer.dateOfBirth);
        const minimumAge = regulation?.minimumAge || 21;

        if (customerAge < minimumAge) {
          throw new ForbiddenException(
            `Customer must be at least ${minimumAge} years old to purchase alcohol in ${stateCode}`,
          );
        }
      }
    }

    return {
      ageVerified: true,
      requiresAgeVerification: true,
      customerId,
      customerAge,
      stateCode,
      regulation,
      saleAllowed: true,
      idVerification,
      warnings,
    };
  }

  /**
   * Get age-restricted items from order
   */
  private async getAgeRestrictedItems(items: OrderItemDto[]): Promise<OrderItemDto[]> {
    const restrictedItems: OrderItemDto[] = [];

    for (const item of items) {
      const product = await this.prisma.product.findUnique({
        where: { sku: item.sku },
      });

      if (product?.ageRestricted) {
        restrictedItems.push(item);
      }
    }

    return restrictedItems;
  }

  /**
   * Get product types for compliance checking
   */
  private async getProductTypes(items: OrderItemDto[]): Promise<string[]> {
    const types = new Set<string>();

    for (const item of items) {
      const product = await this.prisma.product.findUnique({
        where: { sku: item.sku },
        select: { category: true },
      });

      if (product) {
        // Map category to product type
        if (product.category === 'beer') types.add('beer');
        else if (product.category === 'wine') types.add('wine');
        else if (product.category === 'spirits') types.add('spirits');
      }
    }

    return Array.from(types);
  }

  /**
   * Calculate age from date of birth
   */
  private calculateAge(dateOfBirth: Date): number {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    return age;
  }

  /**
   * Log comprehensive compliance event
   */
  async logComplianceEvent(reportData: ComplianceReportData): Promise<void> {
    const encryptedDetails = this.encryption.encrypt(
      JSON.stringify({
        customerId: reportData.customerId,
        customerAge: reportData.customerAge,
        idType: reportData.idType,
        productTypes: reportData.productTypes,
        violations: reportData.violations,
      }),
    );

    await this.prisma.auditLog.create({
      data: {
        eventType: 'COMPLIANCE_CHECK',
        userId: reportData.employeeId,
        action: reportData.complianceStatus.toUpperCase(),
        resourceId: reportData.transactionId,
        result: reportData.complianceStatus === 'passed' ? 'success' : 'failure',
        details: encryptedDetails,
      },
    });
  }

  /**
   * Generate compliance report for audits
   */
  async generateComplianceReport(
    locationId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<{
    summary: {
      totalTransactions: number;
      ageVerifiedTransactions: number;
      idScannedTransactions: number;
      violations: number;
    };
    details: ComplianceReportData[];
  }> {
    // Get all transactions in date range
    const transactions = await this.prisma.transaction.findMany({
      where: {
        locationId,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        items: true,
        customer: true,
      },
    });

    const location = await this.prisma.location.findUnique({
      where: { id: locationId },
    });

    const details: ComplianceReportData[] = [];
    let violations = 0;

    for (const transaction of transactions) {
      // Check if transaction involved age-restricted items
      const hasAgeRestrictedItems = await this.hasAgeRestrictedItems(
        transaction.items.map((item) => item.sku),
      );

      if (hasAgeRestrictedItems) {
        const violationList: string[] = [];

        // Check if age was verified
        if (!transaction.ageVerified) {
          violationList.push('Age not verified for restricted items');
          violations++;
        }

        // Check if ID was scanned where required
        const regulation = getStateRegulation(location?.state || 'FL');
        if (regulation?.requiresIdScan && !transaction.idScanned) {
          violationList.push('ID scanning required but not performed');
        }

        const productTypes = await this.getProductTypesFromSkus(
          transaction.items.map((item) => item.sku),
        );

        details.push({
          transactionId: transaction.id,
          locationId: transaction.locationId,
          stateCode: location?.state || 'FL',
          timestamp: transaction.createdAt,
          ageVerified: transaction.ageVerified,
          idScanned: transaction.idScanned,
          customerId: transaction.customerId || undefined,
          customerAge: transaction.customer?.dateOfBirth
            ? this.calculateAge(transaction.customer.dateOfBirth)
            : undefined,
          employeeId: transaction.employeeId || undefined,
          productTypes,
          totalAmount: transaction.total,
          complianceStatus: violationList.length > 0 ? 'failed' : 'passed',
          violations: violationList,
        });
      }
    }

    return {
      summary: {
        totalTransactions: transactions.length,
        ageVerifiedTransactions: transactions.filter((t) => t.ageVerified).length,
        idScannedTransactions: transactions.filter((t) => t.idScanned).length,
        violations,
      },
      details,
    };
  }

  /**
   * Check if SKUs contain age-restricted items
   */
  private async hasAgeRestrictedItems(skus: string[]): Promise<boolean> {
    const products = await this.prisma.product.findMany({
      where: {
        sku: { in: skus },
        ageRestricted: true,
      },
    });

    return products.length > 0;
  }

  /**
   * Get product types from SKUs
   */
  private async getProductTypesFromSkus(skus: string[]): Promise<string[]> {
    const products = await this.prisma.product.findMany({
      where: { sku: { in: skus } },
      select: { category: true },
    });

    const types = new Set<string>();
    products.forEach((p) => {
      if (['beer', 'wine', 'spirits'].includes(p.category)) {
        types.add(p.category);
      }
    });

    return Array.from(types);
  }

  /**
   * Validate state license
   */
  async validateStateLicense(locationId: string): Promise<{
    valid: boolean;
    expiresIn?: number; // days
    warnings: string[];
  }> {
    const location = await this.prisma.location.findUnique({
      where: { id: locationId },
    });

    if (!location) {
      return { valid: false, warnings: ['Location not found'] };
    }

    const warnings: string[] = [];

    if (!location.licenseNumber) {
      warnings.push('No license number on file');
      return { valid: false, warnings };
    }

    if (!location.licenseExpiry) {
      warnings.push('No license expiration date on file');
      return { valid: false, warnings };
    }

    const today = new Date();
    const expiryDate = new Date(location.licenseExpiry);
    const daysUntilExpiry = Math.floor(
      (expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (daysUntilExpiry < 0) {
      warnings.push('License has expired');
      return { valid: false, expiresIn: daysUntilExpiry, warnings };
    }

    if (daysUntilExpiry < 30) {
      warnings.push(`License expires in ${daysUntilExpiry} days - renewal required soon`);
    }

    return {
      valid: true,
      expiresIn: daysUntilExpiry,
      warnings,
    };
  }
}
