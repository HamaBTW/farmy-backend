import { Request, Response } from 'express';
import { stripe } from '../../config/stripe.config.js';
import { subscriptionService } from '../../services/v1/subscription.service.js';
import Stripe from 'stripe';

export class StripeWebhookController {
    async handleWebhook(req: Request, res: Response) {
        const sig = req.headers['stripe-signature'];
        const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

        if (!endpointSecret) {
            console.error('STRIPE_WEBHOOK_SECRET is not configured. Webhook ignored in Dev Mode (return 200).');
            // If in dev and no secret, just process the json directly (Not secure, but sometimes useful for dev without CLI)
            // However, production requires it. We'll return 200 so Stripe doesn't retry unnecessarily if not configured.
            return res.status(200).send('Webhook secret not configured');
        }

        let event: Stripe.Event;

        try {
            event = stripe.webhooks.constructEvent(req.body, sig as string, endpointSecret);
        } catch (err: any) {
            console.error('Webhook signature verification failed.', err.message);
            return res.status(400).send(`Webhook Error: ${err.message}`);
        }

        switch (event.type) {
            case 'payment_intent.succeeded': {
                const paymentIntent = event.data.object as Stripe.PaymentIntent;
                try {
                    await subscriptionService.handleStripeWebhookSuccess(paymentIntent.id, paymentIntent.metadata);
                } catch (e: any) {
                    console.error('Error handling webhook success logic:', e.message);
                    return res.status(500).json({ error: 'Internal Server Error' });
                }
                break;
            }

            case 'invoice.paid': {
                const invoice = event.data.object as any;
                try {
                    if (invoice.payment_intent && typeof invoice.payment_intent === 'string') {
                        const pi = await stripe.paymentIntents.retrieve(invoice.payment_intent);
                        await subscriptionService.handleStripeWebhookSuccess(pi.id, pi.metadata as any);
                    }
                } catch (e: any) {
                    console.error('Error handling invoice.paid:', e.message);
                }
                break;
            }

            case 'customer.subscription.deleted': {
                const subscription = event.data.object as Stripe.Subscription;
                try {
                    await subscriptionService.handleSubscriptionCancelled(subscription.customer as string);
                } catch (e: any) {
                    console.error('Error handling subscription.deleted:', e.message);
                }
                break;
            }

            case 'invoice.payment_failed': {
                const failedInvoice = event.data.object as Stripe.Invoice;
                try {
                    await subscriptionService.handlePaymentFailed(failedInvoice.customer as string);
                } catch (e: any) {
                    console.error('Error handling invoice.payment_failed:', e.message);
                }
                break;
            }

            default:
                console.log(`Unhandled event type ${event.type}`);
        }

        res.status(200).json({ received: true });
    }
}

export const stripeWebhookController = new StripeWebhookController();
