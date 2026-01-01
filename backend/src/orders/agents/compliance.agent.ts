import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { EncryptionService } from '../../common/encryption.service';
import { OrderItemDto } from '../dto/order.dto';

export interface ComplianceResult {
    ageVerified: boolean;
    requiresAgeVerification: boolean;
    customerId?: string;
    customerAge?: number;
}

@Injectable()
export class ComplianceAgent {
    // Minimum age for alcohol purchase in Florida
    private readonly MINIMUM_AGE = 21;

    constructor(
        private prisma: PrismaService,
        private encryption: EncryptionService,
    ) { }

    /**
     * Verify age compliance for alcohol purchases
     */
    async verifyAge(
        items: OrderItemDto[],
        customerId?: string,
        ageVerified?: boolean,
    ): Promise<ComplianceResult> {
        // Check if any items are age-restricted
        const requiresAgeVerification = await this.requiresAgeCheck(items);

        if (!requiresAgeVerification) {
            return {
                ageVerified: true,
                requiresAgeVerification: false,
            };
        }

        // If age verification is required but not provided
        if (!ageVerified) {
            throw new ForbiddenException(
                'Age verification required for alcohol purchases',
            );
        }

        // If customer ID is provided, verify their age on record
        if (customerId) {
            const customer = await this.prisma.customer.findUnique({
                where: { id: customerId },
            });

            if (customer && customer.dateOfBirth) {
                const age = this.calculateAge(customer.dateOfBirth);

                if (age < this.MINIMUM_AGE) {
                    throw new ForbiddenException(
                        `Customer must be at least ${this.MINIMUM_AGE} years old to purchase alcohol`,
                    );
                }

                return {
                    ageVerified: true,
                    requiresAgeVerification: true,
                    customerId,
                    customerAge: age,
                };
            }
        }

        // Age verified by cashier but no customer record
        return {
            ageVerified: true,
            requiresAgeVerification: true,
        };
    }

    /**
     * Check if any items require age verification
     */
    private async requiresAgeCheck(items: OrderItemDto[]): Promise<boolean> {
        for (const item of items) {
            const product = await this.prisma.product.findUnique({
                where: { sku: item.sku },
            });

            if (product?.ageRestricted) {
                return true;
            }
        }

        return false;
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
     * Log compliance event for audit trail
     */
    async logComplianceEvent(
        transactionId: string,
        customerId: string | undefined,
        ageVerified: boolean,
        employeeId: string | undefined,
    ): Promise<void> {
        await this.prisma.auditLog.create({
            data: {
                eventType: 'AGE_VERIFICATION',
                userId: employeeId,
                action: ageVerified ? 'VERIFIED' : 'FAILED',
                resourceId: transactionId,
                result: ageVerified ? 'success' : 'failure',
                details: this.encryption.encrypt(JSON.stringify({ customerId })),
            },
        });
    }
}
