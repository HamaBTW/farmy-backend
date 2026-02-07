import Stripe from 'stripe';
import dotenv from 'dotenv';

dotenv.config();

if (!process.env.STRIPE_SECRET_KEY) {
    console.warn('⚠️ STRIPE_SECRET_KEY is not set in .env file');
}

export class StripeService {
    private stripe: Stripe;

    constructor() {
        this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder', {
            apiVersion: '2026-01-28.clover',
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
            { apiVersion: '2026-01-28.clover' }
        );
    }

    async createPaymentIntent(amount: number, currency: string = 'usd', customerId: string) {
        return await this.stripe.paymentIntents.create({
            amount: Math.round(amount * 100), // Convert to cents
            currency,
            customer: customerId,
            automatic_payment_methods: {
                enabled: true,
            },
        });
    }

    async createSetupIntent(customerId: string) {
        return await this.stripe.setupIntents.create({
            customer: customerId,
        });
    }

    async getSetupIntent(setupIntentId: string) {
        return await this.stripe.setupIntents.retrieve(setupIntentId);
    }
}

export const stripeService = new StripeService();
