import { SubscriptionPlan, UserSubscription, SubscriptionStatus, SubscriptionHistory, SubscriptionEventType, User } from '../../models/index.js';
import { stripeService } from './StripeService.js';
import { UserRole } from '../../models/User.js';

export class SubscriptionService {
    async seedPlans() {
        const plans = [
            // Farmer Pro
            {
                name: 'Farmer Pro',
                plan_key: 'farmer_pro',
                description: 'Unlimited lands, premium assets, and AI crop planning.',
                role: UserRole.FARMER,
                price_monthly: 14.99,
                price_yearly: 119.99,
                entitlements: {
                    land_limit: -1,
                    premium_assets: true,
                    ai_crop_planner: true,
                    advanced_analytics: true,
                    unlimited_products: true,
                    unlimited_tasks: true,
                    priority_kyc: true,
                    worker_search_filters: true,
                    production_analytics: true,
                    hedera_export: true
                }
            },
            // Investor Plus
            {
                name: 'Investor Plus',
                plan_key: 'investor_plus',
                description: 'Unlimited rentals, early access, and portfolio analytics.',
                role: UserRole.INVESTOR,
                price_monthly: 24.99,
                price_yearly: 199.99,
                entitlements: {
                    rental_limit: -1,
                    early_land_access: true,
                    roi_analytics: true,
                    portfolio_dashboard: true,
                    unlimited_contracts: true,
                    priority_hiring: true,
                    advanced_contract_templates: true,
                    ai_investment_advisor: true,
                    hedera_portfolio_report: true,
                    priority_kyc: true,
                    bulk_item_requests: true
                }
            },
            // FarmBox Subscriptions
            {
                name: 'FarmBox Small',
                plan_key: 'farmbox_small',
                description: '5-7 items bi-weekly, vegetables only.',
                role: UserRole.CUSTOMER,
                price_monthly: 29.99,
                price_yearly: 299.99,
                entitlements: {
                    farmbox_active: true,
                    farmbox_tier: 'small',
                    marketplace_discount: 5
                }
            },
            {
                name: 'FarmBox Medium',
                plan_key: 'farmbox_medium',
                description: '10-14 items weekly, vegetables + fruits.',
                role: UserRole.CUSTOMER,
                price_monthly: 49.99,
                price_yearly: 499.99,
                entitlements: {
                    farmbox_active: true,
                    farmbox_tier: 'medium',
                    marketplace_discount: 10,
                    product_origin_trace: true
                }
            },
            {
                name: 'FarmBox Large',
                plan_key: 'farmbox_large',
                description: '18-22 items weekly, full range + custom picks.',
                role: UserRole.CUSTOMER,
                price_monthly: 79.99,
                price_yearly: 799.99,
                entitlements: {
                    farmbox_active: true,
                    farmbox_tier: 'large',
                    marketplace_discount: 15,
                    farmer_direct_chat: true,
                    product_origin_trace: true,
                    hedera_verification: true
                }
            },
            // Worker Plus
            {
                name: 'Worker Plus',
                plan_key: 'worker_plus',
                description: 'Boosted profile, featured badge, and instant withdrawals.',
                role: UserRole.CUSTOMER, // Worker is a sub-role of customer
                price_monthly: 4.99,
                price_yearly: 39.99,
                entitlements: {
                    worker_plus_active: true,
                    profile_boost: true,
                    featured_badge: true,
                    advanced_task_filters: true,
                    earnings_analytics: true,
                    multi_land_dashboard: true,
                    instant_withdrawal: true,
                    contract_negotiation_insights: true
                }
            }
        ];

        for (const planData of plans) {
            const existing = await SubscriptionPlan.findOne({ where: { plan_key: planData.plan_key } });
            if (!existing) {
                await SubscriptionPlan.create(planData as any).save();
            } else {
                // Update entitlements if they changed
                existing.entitlements = planData.entitlements;
                existing.price_monthly = planData.price_monthly;
                existing.price_yearly = planData.price_yearly;
                existing.description = planData.description;
                await existing.save();
            }
        }
    }

    async getPlans(role?: UserRole) {
        const query = role ? { where: { role } } : {};
        return await SubscriptionPlan.find(query);
    }

    async getUserSubscription(userId: string) {
        return await UserSubscription.findOne({
            where: { user_id: userId },
            relations: ['plan']
        });
    }

    async createCheckoutSession(userId: string, planKey: string, billingCycle: 'monthly' | 'yearly') {
        const user = await User.findOne({ where: { id: userId } });
        if (!user) throw new Error('User not found');

        const plan = await SubscriptionPlan.findOne({ where: { plan_key: planKey } });
        if (!plan) throw new Error('Plan not found');

        const amount = billingCycle === 'monthly' ? plan.price_monthly : plan.price_yearly;

        // Since we are NOT using Stripe Subscriptions, we create a one-time Payment Intent
        const paymentIntent = await stripeService.createPaymentIntent(
            amount,
            'usd',
            user.stripe_customer_id || '', // Ensure user has stripe_customer_id
            {
                userId,
                planKey,
                billingCycle,
                type: 'subscription'
            }
        );

        return paymentIntent;
    }

    async confirmSubscription(userId: string, planKey: string, billingCycle: 'monthly' | 'yearly', paymentIntentId: string) {
        const user = await User.findOne({ where: { id: userId } });
        if (!user) throw new Error('User not found');

        const plan = await SubscriptionPlan.findOne({ where: { plan_key: planKey } });
        if (!plan) throw new Error('Plan not found');

        // Check if user already has a sub
        let userSub = await UserSubscription.findOne({ where: { user_id: userId } });

        const fromPlanId = userSub ? userSub.plan_id : null;

        if (!userSub) {
            userSub = new UserSubscription();
            userSub.user_id = userId;
        }

        userSub.plan_id = plan.id;
        userSub.status = SubscriptionStatus.ACTIVE;
        userSub.billing_cycle = billingCycle;
        userSub.stripe_payment_intent_id = paymentIntentId;
        userSub.start_date = new Date();

        const durationDays = billingCycle === 'monthly' ? 30 : 365;
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + durationDays);
        userSub.current_period_end = expiryDate;
        userSub.cancel_at_period_end = false;

        await userSub.save();

        // Record History
        const history = new SubscriptionHistory();
        history.user_id = userId;
        history.from_plan_id = fromPlanId;
        history.to_plan_id = plan.id;
        history.event_type = fromPlanId ? SubscriptionEventType.UPGRADE : SubscriptionEventType.SUBSCRIBE;
        history.metadata = { billingCycle, paymentIntentId };
        await history.save();

        return userSub;
    }

    async cancelSubscription(userId: string) {
        const userSub = await UserSubscription.findOne({ where: { user_id: userId } });
        if (!userSub) throw new Error('Subscription not found');

        userSub.cancel_at_period_end = true;
        await userSub.save();

        // Record History
        const history = new SubscriptionHistory();
        history.user_id = userId;
        history.from_plan_id = userSub.plan_id;
        history.to_plan_id = userSub.plan_id;
        history.event_type = SubscriptionEventType.CANCEL;
        history.metadata = { currentPeriodEnd: userSub.current_period_end };
        await history.save();

        return userSub;
    }

    async processExpirations() {
        const now = new Date();

        // Find ACTIVE subscriptions that have ended
        const expiredSubs = await UserSubscription.find({
            where: {
                status: SubscriptionStatus.ACTIVE,
                // current_period_end < now, we need to use LessThan from TypeORM
            },
            relations: ['plan']
        });

        // Simplified loop for implementation (TypeORM LessThan would be better)
        for (const sub of expiredSubs) {
            if (sub.current_period_end < now) {
                if (sub.cancel_at_period_end) {
                    sub.status = SubscriptionStatus.EXPIRED;
                    // Logic to record history...
                } else {
                    // Enter Grace Period for auto-renewers (manual renewal logic)
                    sub.status = SubscriptionStatus.GRACE;
                }
                await sub.save();
            }
        }
    }
}

export const subscriptionService = new SubscriptionService();
