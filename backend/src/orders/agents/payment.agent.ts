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

        // Real Stripe integration required for card payments
        if (!process.env.STRIPE_SECRET_KEY) {
            throw new Error(
                'STRIPE_SECRET_KEY environment variable is required for card payments. ' +
                'Mock payments have been removed for production security.'
            );
        }

        // TODO: Implement real Stripe payment intent
        // const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
        // const paymentIntent = await stripe.paymentIntents.create({
        //     amount: Math.round(amount * 100), // Convert to cents
        //     currency: 'usd',
        //     automatic_payment_methods: { enabled: true },
        // });
        // return {
        //     paymentId,
        //     method,
        //     amount,
        //     status: 'authorized',
        //     processorId: paymentIntent.id,
        // };

        throw new Error('Real Stripe integration not yet implemented. Please configure Stripe.');
    }

    /**
     * Capture authorized payment
     */
    async capture(paymentId: string, processorId?: string): Promise<void> {
        // TODO: Implement Stripe capture
        // const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
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
        // const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
        // if (payment.status === 'authorized') {
        //   await stripe.paymentIntents.cancel(payment.processorId);
        // } else if (payment.status === 'captured') {
        //   await stripe.refunds.create({ payment_intent: payment.processorId });
        // }
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
