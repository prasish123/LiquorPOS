import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

export interface PaymentResult {
    paymentId: string;
    method: string;
    amount: number;
    status: 'authorized' | 'captured' | 'failed';
    processorId?: string;
}

@Injectable()
export class PaymentAgent {
    constructor(private prisma: PrismaService) { }

    /**
     * Authorize payment
     * TODO: Integrate with Stripe in next iteration
     */
    async authorize(
        amount: number,
        method: 'cash' | 'card' | 'split',
    ): Promise<PaymentResult> {
        const paymentId = crypto.randomUUID();

        // For cash, immediately mark as captured
        if (method === 'cash') {
            return {
                paymentId,
                method,
                amount,
                status: 'captured',
            };
        }

        // For card, simulate authorization
        // TODO: Replace with actual Stripe integration
        const mockAuthorization = await this.mockStripeAuthorize(amount);

        return {
            paymentId,
            method,
            amount,
            status: mockAuthorization.success ? 'authorized' : 'failed',
            processorId: mockAuthorization.processorId,
        };
    }

    /**
     * Capture authorized payment
     */
    async capture(paymentId: string, processorId?: string): Promise<void> {
        // TODO: Implement Stripe capture
        // await stripe.paymentIntents.capture(processorId);
    }

    /**
     * Void/cancel payment (compensation)
     */
    async void(payment: PaymentResult): Promise<void> {
        if (payment.method === 'cash') {
            // No action needed for cash
            return;
        }

        // TODO: Implement Stripe void/refund
        // if (payment.status === 'authorized') {
        //   await stripe.paymentIntents.cancel(payment.processorId);
        // } else if (payment.status === 'captured') {
        //   await stripe.refunds.create({ payment_intent: payment.processorId });
        // }
    }

    /**
     * Mock Stripe authorization (temporary)
     */
    private async mockStripeAuthorize(amount: number): Promise<{
        success: boolean;
        processorId: string;
    }> {
        // Simulate 95% success rate
        const success = Math.random() > 0.05;

        return {
            success,
            processorId: success ? `pi_mock_${crypto.randomUUID()}` : '',
        };
    }

    /**
     * Create payment record in database
     */
    async createPaymentRecord(
        transactionId: string,
        payment: PaymentResult,
    ): Promise<void> {
        await this.prisma.payment.create({
            data: {
                transactionId,
                method: payment.method,
                amount: payment.amount,
                status: payment.status,
                processorId: payment.processorId,
            },
        });
    }
}
