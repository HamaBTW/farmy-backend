import { Request, Response } from 'express';
import { subscriptionService } from '../../services/v1/subscription.service.js';
import { UserRole } from '../../models/User.js';

/**
 * Maps known error messages/codes to proper HTTP status codes.
 */
function resolveStatusCode(error: any): number {
    if (error.statusCode && typeof error.statusCode === 'number') return error.statusCode;

    const msg = (error.message || '').toLowerCase();

    if (msg.includes('not found') || msg.includes('no subscription')) return 404;
    if (msg.includes('insufficient') || msg.includes('not enough')) return 422;
    if (msg.includes('already') || msg.includes('duplicate') || msg.includes('conflict')) return 409;
    if (msg.includes('unauthorized') || msg.includes('invalid token')) return 401;
    if (msg.includes('forbidden') || msg.includes('not allowed')) return 403;
    if (msg.includes('invalid') || msg.includes('required') || msg.includes('missing')) return 400;

    return 500;
}

/**
 * Builds a structured error response body.
 */
function buildErrorResponse(error: any, fallbackCode: string = 'server_error') {
    return {
        error: {
            message: error.message || 'An unexpected error occurred',
            code: error.code || fallbackCode,
            retryable: resolveStatusCode(error) >= 500,
        },
    };
}

export class SubscriptionController {
    async seedPlans(req: Request, res: Response) {
        try {
            await subscriptionService.seedPlans();
            res.status(200).json({ message: 'Subscription plans seeded successfully' });
        } catch (error: any) {
            const status = resolveStatusCode(error);
            res.status(status).json(buildErrorResponse(error, 'seed_failed'));
        }
    }

    async getPlans(req: Request, res: Response) {
        try {
            const role = req.query.role as UserRole;
            const plans = await subscriptionService.getPlans(role);
            res.status(200).json(plans);
        } catch (error: any) {
            const status = resolveStatusCode(error);
            res.status(status).json(buildErrorResponse(error, 'plans_fetch_failed'));
        }
    }

    async getCurrentSubscription(req: Request, res: Response) {
        try {
            const userId = (req as any).user.id;
            if (!userId) {
                return res.status(401).json(buildErrorResponse(
                    { message: 'User not authenticated', code: 'unauthorized' },
                ));
            }

            const subscription = await subscriptionService.getUserSubscription(userId);
            const entitlements = await subscriptionService.getUserEntitlements(userId);

            // Debug: log entitlements summary for traceability
            const entKeys = Object.keys(entitlements);
            console.log(
                `[Subscription] user=${userId} plan=${subscription?.plan?.plan_key ?? 'none'} ` +
                `entitlementKeys=[${entKeys.join(',')}] snapshotPresent=${!!subscription?.entitlements_snapshot}`
            );

            res.status(200).json({ subscription, entitlements });
        } catch (error: any) {
            const status = resolveStatusCode(error);
            res.status(status).json(buildErrorResponse(error, 'subscription_fetch_failed'));
        }
    }

    async checkSubscriptionExistence(req: Request, res: Response) {
        try {
            const userId = (req as any).user.id;
            if (!userId) {
                return res.status(401).json(buildErrorResponse(
                    { message: 'User not authenticated', code: 'unauthorized' },
                ));
            }

            const result = await subscriptionService.checkSubscriptionExistence(userId);
            res.status(200).json(result);
        } catch (error: any) {
            const status = resolveStatusCode(error);
            res.status(status).json(buildErrorResponse(error, 'check_failed'));
        }
    }

    async createCheckoutSession(req: Request, res: Response) {
        try {
            const userId = (req as any).user.id;
            const { planKey, billingCycle } = req.body;

            if (!planKey || !billingCycle) {
                return res.status(400).json(buildErrorResponse(
                    { message: 'planKey and billingCycle are required', code: 'missing_fields' },
                ));
            }

            if (!['monthly', 'yearly'].includes(billingCycle)) {
                return res.status(400).json(buildErrorResponse(
                    { message: 'billingCycle must be "monthly" or "yearly"', code: 'invalid_billing_cycle' },
                ));
            }

            const plan = await subscriptionService.getPlans().then(plans => plans.find(p => p.plan_key === planKey));
            if (!plan) {
                return res.status(404).json(buildErrorResponse(
                    { message: `Plan "${planKey}" not found`, code: 'plan_not_found' },
                ));
            }

            const paymentIntent = await subscriptionService.createStripePaymentIntent(userId, plan.id, billingCycle);
            res.status(200).json(paymentIntent);
        } catch (error: any) {
            const status = resolveStatusCode(error);
            res.status(status).json(buildErrorResponse(error, 'checkout_failed'));
        }
    }

    async upgradeWithCredits(req: Request, res: Response) {
        try {
            const userId = (req as any).user.id;
            const { planKey, billingCycle } = req.body;

            if (!planKey || !billingCycle) {
                return res.status(400).json(buildErrorResponse(
                    { message: 'planKey and billingCycle are required', code: 'missing_fields' },
                ));
            }

            if (!['monthly', 'yearly'].includes(billingCycle)) {
                return res.status(400).json(buildErrorResponse(
                    { message: 'billingCycle must be "monthly" or "yearly"', code: 'invalid_billing_cycle' },
                ));
            }

            const plan = await subscriptionService.getPlans().then(plans => plans.find(p => p.plan_key === planKey));
            if (!plan) {
                return res.status(404).json(buildErrorResponse(
                    { message: `Plan "${planKey}" not found`, code: 'plan_not_found' },
                ));
            }

            const subscription = await subscriptionService.upgradeWithCredits(userId, plan.id, billingCycle);
            res.status(200).json(subscription);
        } catch (error: any) {
            const status = resolveStatusCode(error);
            res.status(status).json(buildErrorResponse(error, 'credit_upgrade_failed'));
        }
    }

    async confirmStripePayment(req: Request, res: Response) {
        try {
            const userId = (req as any).user.id;
            const { paymentIntentId } = req.body;

            if (!paymentIntentId) {
                return res.status(400).json(buildErrorResponse(
                    { message: 'paymentIntentId is required', code: 'missing_payment_intent' },
                ));
            }

            const subscription = await subscriptionService.confirmStripePayment(userId, paymentIntentId);
            res.status(200).json(subscription);
        } catch (error: any) {
            const status = resolveStatusCode(error);
            res.status(status).json(buildErrorResponse(error, 'payment_confirmation_failed'));
        }
    }
}

export const subscriptionController = new SubscriptionController();
