import Stripe from 'stripe';
import dotenv from 'dotenv';

dotenv.config();

if (!process.env.STRIPE_SECRET_KEY) {
    console.warn('⚠️ STRIPE_SECRET_KEY is not set in .env file');
}

const stripeApiVersion = process.env.STRIPE_API_VERSION || '2024-04-10';

export class StripeService {
    private stripe: Stripe;

    constructor() {
        this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder', {
            apiVersion: stripeApiVersion as any,
        });
    }

    async createCustomer(email: string, name?: string) {
        return await this.stripe.customers.create({
            email,
            name,
        });
    }

    async getCustomer(customerId: string) {
        return await this.stripe.customers.retrieve(customerId);
    }

    async getPaymentMethod(paymentMethodId: string) {
        return await this.stripe.paymentMethods.retrieve(paymentMethodId);
    }

    async createEphemeralKey(customerId: string) {
        return await this.stripe.ephemeralKeys.create(
            { customer: customerId },
            { apiVersion: stripeApiVersion as any }
        );
    }

    async createPaymentIntent(
        amount: number,
        currency: string = 'usd',
        customerId: string,
        metadata?: Record<string, string>,
        idempotencyKey?: string
    ) {
        return await this.stripe.paymentIntents.create(
            {
                amount: Math.round(amount * 100), // Convert to cents
                currency,
                customer: customerId,
                automatic_payment_methods: {
                    enabled: true,
                },
                metadata: metadata || {},
            },
            idempotencyKey ? { idempotencyKey } : undefined
        );
    }

    async retrievePaymentIntent(paymentIntentId: string) {
        return await this.stripe.paymentIntents.retrieve(paymentIntentId);
    }

    constructWebhookEvent(payload: string | Buffer, sig: string, secret: string) {
        return this.stripe.webhooks.constructEvent(payload, sig, secret);
    }

    async createSetupIntent(customerId: string) {
        return await this.stripe.setupIntents.create({
            customer: customerId,
            automatic_payment_methods: {
                enabled: true,
            },
        });
    }

    async chargeSavedCard(amount: number, currency: string = 'usd', customerId: string, paymentMethodId: string) {
        return await this.stripe.paymentIntents.create({
            amount: Math.round(amount * 100),
            currency,
            customer: customerId,
            payment_method: paymentMethodId,
            off_session: true, // Indicates the customer is not present (for subscriptions/saved cards)
            confirm: true, // Immediately confirm the payment
        });
    }

    async getSetupIntent(setupIntentId: string) {
        return await this.stripe.setupIntents.retrieve(setupIntentId);
    }
}

export const stripeService = new StripeService();
