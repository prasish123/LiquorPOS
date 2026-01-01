import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { EncryptionService } from '../common/encryption.service';

export interface AuditContext {
    userId?: string;
    ipAddress?: string;
    userAgent?: string;
}

@Injectable()
export class AuditService {
    constructor(
        private prisma: PrismaService,
        private encryption: EncryptionService,
    ) { }

    /**
     * Log order creation attempt
     */
    async logOrderCreation(
        orderId: string,
        result: 'success' | 'failure',
        context: AuditContext,
        details?: any,
    ): Promise<void> {
        await this.prisma.auditLog.create({
            data: {
                eventType: 'ORDER_CREATION',
                userId: context.userId,
                action: 'create_order',
                resourceId: orderId,
                ipAddress: context.ipAddress,
                userAgent: context.userAgent,
                result,
                details: details ? this.encryption.encrypt(JSON.stringify(details)) : null,
            },
        });
    }

    /**
     * Log payment processing
     */
    async logPaymentProcessing(
        transactionId: string,
        paymentMethod: string,
        amount: number,
        result: 'success' | 'failure',
        context: AuditContext,
        details?: any,
    ): Promise<void> {
        await this.prisma.auditLog.create({
            data: {
                eventType: 'PAYMENT_PROCESSING',
                userId: context.userId,
                action: `process_payment_${paymentMethod}`,
                resourceId: transactionId,
                ipAddress: context.ipAddress,
                userAgent: context.userAgent,
                result,
                details: this.encryption.encrypt(JSON.stringify({
                    amount,
                    paymentMethod,
                    ...details,
                })),
            },
        });
    }

    /**
     * Log compliance event (age verification)
     */
    async logComplianceEvent(
        transactionId: string,
        customerId: string | undefined,
        ageVerified: boolean,
        verifiedBy: string | undefined,
        context: AuditContext,
    ): Promise<void> {
        await this.prisma.auditLog.create({
            data: {
                eventType: 'AGE_VERIFICATION',
                userId: context.userId,
                action: 'verify_age',
                resourceId: transactionId,
                ipAddress: context.ipAddress,
                userAgent: context.userAgent,
                result: ageVerified ? 'success' : 'failure',
                details: this.encryption.encrypt(JSON.stringify({
                    customerId,
                    verifiedBy,
                    ageVerified,
                })),
            },
        });
    }

    /**
     * Log idempotency key usage
     */
    async logIdempotencyCheck(
        idempotencyKey: string,
        isDuplicate: boolean,
        transactionId: string,
        context: AuditContext,
    ): Promise<void> {
        await this.prisma.auditLog.create({
            data: {
                eventType: 'IDEMPOTENCY_CHECK',
                userId: context.userId,
                action: isDuplicate ? 'duplicate_request_blocked' : 'new_request_processed',
                resourceId: transactionId,
                ipAddress: context.ipAddress,
                userAgent: context.userAgent,
                result: 'success',
                details: this.encryption.encrypt(JSON.stringify({
                    idempotencyKey,
                    isDuplicate,
                })),
            },
        });
    }
}
