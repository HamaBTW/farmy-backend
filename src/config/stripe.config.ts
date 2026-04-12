import Stripe from 'stripe';
import dotenv from 'dotenv';

dotenv.config();

const stripeSecretKey = process.env.STRIPE_SECRET_KEY || 'sk_test_dummy';
const stripeApiVersion = process.env.STRIPE_API_VERSION || '2024-04-10';

export const stripe = new Stripe(stripeSecretKey, {
    apiVersion: stripeApiVersion as any,
});
