import { Request, Response } from 'express';
import { subscriptionService } from '../../services/v1/subscription.service.js';
import { UserRole } from '../../models/User.js';

export class SubscriptionController {
    async seedPlans(req: Request, res: Response) {
        try {
            await subscriptionService.seedPlans();
            res.status(200).json({ message: 'Subscription plans seeded successfully' });
        } catch (error: any) {
            res.status(500).json({ message: error.message });
        }
    }

    async getPlans(req: Request, res: Response) {
        try {
            const role = req.query.role as UserRole;
            const plans = await subscriptionService.getPlans(role);
            res.status(200).json(plans);
        } catch (error: any) {
            res.status(500).json({ message: error.message });
        }
    }

    async getCurrentSubscription(req: Request, res: Response) {
        try {
            const userId = (req as any).user.id;
            const subscription = await subscriptionService.getUserSubscription(userId);
            const entitlements = await subscriptionService.getUserEntitlements(userId);

            res.status(200).json({
                subscription,
                entitlements
            });
        } catch (error: any) {
            res.status(500).json({ message: error.message });
        }
    }

    async checkSubscriptionExistence(req: Request, res: Response) {
        try {
            const userId = (req as any).user.id;
            const result = await subscriptionService.checkSubscriptionExistence(userId);
            res.status(200).json(result);
        } catch (error: any) {
            res.status(500).json({ message: error.message });
        }
    }

    async createCheckoutSession(req: Request, res: Response) {
        try {
            const userId = (req as any).user.id;
            const { planKey, billingCycle } = req.body;

            if (!planKey || !billingCycle) {
                return res.status(400).json({ message: 'planKey and billingCycle are required' });
            }

            const plan = await subscriptionService.getPlans().then(plans => plans.find(p => p.plan_key === planKey));
            if (!plan) return res.status(404).json({ message: 'Plan not found' });

            const paymentIntent = await subscriptionService.createStripePaymentIntent(userId, plan.id, billingCycle);
            res.status(200).json(paymentIntent);
        } catch (error: any) {
            res.status(500).json({ message: error.message });
        }
    }

    async upgradeWithCredits(req: Request, res: Response) {
        try {
            const userId = (req as any).user.id;
            const { planKey, billingCycle } = req.body;

            if (!planKey || !billingCycle) {
                return res.status(400).json({ message: 'planKey and billingCycle are required' });
            }

            // We look up plan by planKey since frontend sends planKey, or we can look it up in service.
            // Service expects planId. Let's find planId here or adjust service.
            const plan = await subscriptionService.getPlans().then(plans => plans.find(p => p.plan_key === planKey));
            if (!plan) return res.status(404).json({ message: 'Plan not found' });

            const subscription = await subscriptionService.upgradeWithCredits(userId, plan.id, billingCycle);
            res.status(200).json(subscription);
        } catch (error: any) {
            res.status(500).json({ message: error.message });
        }
    }

    async confirmStripePayment(req: Request, res: Response) {
        try {
            const userId = (req as any).user.id;
            const { paymentIntentId } = req.body;

            if (!paymentIntentId) {
                return res.status(400).json({ message: 'paymentIntentId is required' });
            }

            const subscription = await subscriptionService.confirmStripePayment(userId, paymentIntentId);
            res.status(200).json(subscription);
        } catch (error: any) {
            const statusCode = error.statusCode || 500;
            res.status(statusCode).json({ message: error.message });
        }
    }
}

export const subscriptionController = new SubscriptionController();
