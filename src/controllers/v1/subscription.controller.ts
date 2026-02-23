import { Request, Response } from 'express';
import { subscriptionService } from '../../services/v1/subscription.service.js';
import { entitlementService } from '../../services/v1/entitlement.service.js';
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
            const entitlements = await entitlementService.getEntitlements(userId);

            res.status(200).json({
                subscription,
                entitlements
            });
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

            const paymentIntent = await subscriptionService.createCheckoutSession(userId, planKey, billingCycle);
            res.status(200).json(paymentIntent);
        } catch (error: any) {
            res.status(500).json({ message: error.message });
        }
    }

    async confirmSubscription(req: Request, res: Response) {
        try {
            const userId = (req as any).user.id;
            const { planKey, billingCycle, paymentIntentId } = req.body;

            if (!planKey || !billingCycle || !paymentIntentId) {
                return res.status(400).json({ message: 'planKey, billingCycle, and paymentIntentId are required' });
            }

            const subscription = await subscriptionService.confirmSubscription(userId, planKey, billingCycle, paymentIntentId);
            res.status(200).json(subscription);
        } catch (error: any) {
            res.status(500).json({ message: error.message });
        }
    }

    async cancelSubscription(req: Request, res: Response) {
        try {
            const userId = (req as any).user.id;
            const subscription = await subscriptionService.cancelSubscription(userId);
            res.status(200).json(subscription);
        } catch (error: any) {
            res.status(500).json({ message: error.message });
        }
    }
}

export const subscriptionController = new SubscriptionController();
