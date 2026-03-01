import { AppDataSource } from '../../config/db.config.js';
import { User, UserRole } from '../../models/User.js';
import { SubscriptionPlan } from '../../models/SubscriptionPlan.js';
import { UserSubscription, SubscriptionStatus } from '../../models/UserSubscription.js';
import { SubscriptionHistory, SubscriptionEventType } from '../../models/SubscriptionHistory.js';
import { AppError } from '../../middlewares/error.middleware.js';
import { stripeService } from './StripeService.js';

class SubscriptionService {
    private userRepository = AppDataSource.getRepository(User);
    private planRepository = AppDataSource.getRepository(SubscriptionPlan);
    private subscriptionRepository = AppDataSource.getRepository(UserSubscription);
    private historyRepository = AppDataSource.getRepository(SubscriptionHistory);

    async getPlans(role?: UserRole) {
        if (role) {
            return await this.planRepository.find({ where: { role } });
        }
        return await this.planRepository.find();
    }

    async getUserSubscription(userId: string) {
        return await this.subscriptionRepository.findOne({
            where: { user_id: userId, status: SubscriptionStatus.ACTIVE },
            relations: ['plan']
        });
    }

    async checkSubscriptionExistence(userId: string): Promise<{ hasSubscription: boolean; activeSubscription: UserSubscription | null }> {
        const historyCount = await this.historyRepository.count({
            where: { user_id: userId }
        });

        const activeSubscription = await this.subscriptionRepository.findOne({
            where: { user_id: userId, status: SubscriptionStatus.ACTIVE },
            relations: ['plan']
        });

        return {
            hasSubscription: historyCount > 0,
            activeSubscription: activeSubscription ?? null
        };
    }

    async seedPlans() {
        console.log('Seed plans requested. Please verify against seed_subscriptions.sql.');
    }

    async assignFreePlan(user: User): Promise<void> {
        let freePlan = await this.planRepository.findOne({
            where: { role: user.role, price_monthly: 0 }
        });

        if (!freePlan) {
            freePlan = await this.planRepository.findOne({ where: { price_monthly: 0 } });
            if (!freePlan) {
                console.warn(`No free plan found for role ${user.role}. Skipping free plan assignment.`);
                return;
            }
        }

        const end_date = new Date();
        end_date.setFullYear(end_date.getFullYear() + 100);

        const subscription = this.subscriptionRepository.create({
            user_id: user.id,
            plan_id: freePlan.id,
            status: SubscriptionStatus.ACTIVE,
            payment_method: 'free',
            auto_renew: false,
            end_date: end_date,
            entitlements_snapshot: freePlan.entitlements || {}
        });

        await this.subscriptionRepository.save(subscription);

        user.current_subscription_id = subscription.id;
        user.subscription_status = SubscriptionStatus.ACTIVE;
        await this.userRepository.save(user);

        const history = this.historyRepository.create({
            user_id: user.id,
            to_plan_id: freePlan.id,
            event_type: SubscriptionEventType.SUBSCRIBE,
            metadata: { payment_method: 'free', note: 'auto_assigned_on_registration' }
        });

        await this.historyRepository.save(history);
    }

    private async expireOldSubscription(userId: string): Promise<UserSubscription | null> {
        const activeSub = await this.subscriptionRepository.findOne({
            where: { user_id: userId, status: SubscriptionStatus.ACTIVE },
            relations: ['plan']
        });

        if (activeSub) {
            activeSub.status = SubscriptionStatus.EXPIRED;
            await this.subscriptionRepository.save(activeSub);
        }
        return activeSub;
    }

    async createStripePaymentIntent(userId: string, planId: string, billingCycle: 'monthly' | 'yearly') {
        const user = await this.userRepository.findOne({ where: { id: userId } });
        const plan = await this.planRepository.findOne({ where: { id: planId } });

        if (!user || !plan) throw new AppError(404, 'User or Plan not found');

        const price = billingCycle === 'monthly' ? plan.price_monthly : plan.price_yearly;
        if (price <= 0) throw new AppError(400, 'Invalid plan price for Stripe payment');

        if (user.role && user.role !== plan.role) {
            throw new AppError(400, `Cannot subscribe to a ${plan.role} plan as a ${user.role}`);
        }

        // Ensure user has a Stripe customer
        let customerId = user.stripe_customer_id;
        if (customerId) {
            try {
                await stripeService.getCustomer(customerId);
            } catch (error: any) {
                if (error.code === 'resource_missing' || (error.raw && error.raw.code === 'resource_missing')) {
                    customerId = null;
                } else {
                    throw error;
                }
            }
        }

        if (!customerId) {
            const customer = await stripeService.createCustomer(user.email, user.profile?.name);
            customerId = customer.id;
            user.stripe_customer_id = customerId;
            await this.userRepository.save(user);
        }

        // Create Payment Intent and Ephemeral Key
        const paymentIntent = await stripeService.createPaymentIntent(
            Number(price),
            'usd',
            customerId,
            {
                userId,
                planId,
                billingCycle,
                type: 'subscription_upgrade'
            }
        );
        const ephemeralKey = await stripeService.createEphemeralKey(customerId);

        return {
            clientSecret: paymentIntent.client_secret,
            paymentIntentId: paymentIntent.id,
            ephemeralKey: ephemeralKey.secret,
            customer: customerId,
            publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || 'pk_test_placeholder'
        };
    }

    async handleStripeWebhookSuccess(paymentIntentId: string, metadata: any) {
        const { userId, planId, billingCycle, type } = metadata;
        if (type !== 'subscription_upgrade') return; // Ignore other payment intents

        // Ensure idempotency (prevent duplicate activation for the same intent)
        const existingSub = await this.subscriptionRepository.findOne({
            where: { stripe_payment_intent_id: paymentIntentId }
        });
        if (existingSub) {
            console.log(`PaymentIntent ${paymentIntentId} already processed. Skipping.`);
            return existingSub;
        }

        const user = await this.userRepository.findOne({ where: { id: userId } });
        const plan = await this.planRepository.findOne({ where: { id: planId } });

        if (!user || !plan) {
            console.error(`User or Plan not found for webhook processing. UserId: ${userId}, PlanId: ${planId}`);
            return;
        }

        const oldSub = await this.expireOldSubscription(user.id);

        const end_date = new Date();
        if (billingCycle === 'yearly') {
            end_date.setFullYear(end_date.getFullYear() + 1);
        } else {
            end_date.setMonth(end_date.getMonth() + 1);
        }

        const newSub = this.subscriptionRepository.create({
            user_id: user.id,
            plan_id: plan.id,
            status: SubscriptionStatus.ACTIVE,
            payment_method: 'stripe',
            stripe_payment_intent_id: paymentIntentId,
            billing_cycle: billingCycle,
            auto_renew: false,
            end_date,
            entitlements_snapshot: plan.entitlements || {}
        });

        await this.subscriptionRepository.save(newSub);

        user.current_subscription_id = newSub.id;
        user.subscription_status = SubscriptionStatus.ACTIVE;
        await this.userRepository.save(user);

        const history = this.historyRepository.create({
            user_id: user.id,
            from_plan_id: oldSub ? oldSub.plan_id : null,
            to_plan_id: plan.id,
            event_type: SubscriptionEventType.UPGRADE,
            metadata: { payment_method: 'stripe', paymentIntentId }
        });

        await this.historyRepository.save(history);
        return newSub;
    }

    /**
     * Confirms a Stripe payment by verifying the PaymentIntent status directly with Stripe.
     * This is the primary activation path (webhook is a fallback safety net).
     */
    async confirmStripePayment(userId: string, paymentIntentId: string) {
        // 1. Retrieve the PaymentIntent from Stripe to verify status
        const paymentIntent = await stripeService.retrievePaymentIntent(paymentIntentId);

        if (paymentIntent.status !== 'succeeded') {
            throw new AppError(400, `Payment has not succeeded. Status: ${paymentIntent.status}`);
        }

        // 2. Verify that the metadata belongs to this user (security check)
        if (paymentIntent.metadata.userId !== userId) {
            throw new AppError(403, 'Payment does not belong to this user');
        }

        // 3. Activate the subscription using the existing handler (idempotent)
        const result = await this.handleStripeWebhookSuccess(paymentIntentId, paymentIntent.metadata);

        // 4. Return fresh subscription data
        const subscription = await this.getUserSubscription(userId);
        return subscription;
    }

    async upgradeWithCredits(userId: string, planId: string, billingCycle: 'monthly' | 'yearly') {
        const user = await this.userRepository.findOne({ where: { id: userId } });
        const plan = await this.planRepository.findOne({ where: { id: planId } });

        if (!user || !plan) throw new AppError(404, 'User or Plan not found');

        const price = Number(billingCycle === 'monthly' ? plan.price_monthly : plan.price_yearly);

        if (user.role && user.role !== plan.role) {
            throw new AppError(400, `Cannot subscribe to a ${plan.role} plan as a ${user.role}`);
        }

        if (Number(user.credits) < price) {
            throw new AppError(400, 'Insufficient credits balance');
        }

        // Deduct credits
        user.credits = Number(user.credits) - price;
        user.credits_balance = Number(user.credits); // Keep both in sync

        const oldSub = await this.expireOldSubscription(user.id);

        const end_date = new Date();
        if (billingCycle === 'yearly') {
            end_date.setFullYear(end_date.getFullYear() + 1);
        } else {
            end_date.setMonth(end_date.getMonth() + 1);
        }

        const newSub = this.subscriptionRepository.create({
            user_id: user.id,
            plan_id: plan.id,
            status: SubscriptionStatus.ACTIVE,
            payment_method: 'credits',
            billing_cycle: billingCycle,
            auto_renew: false,
            end_date,
            entitlements_snapshot: plan.entitlements || {}
        });

        await this.subscriptionRepository.save(newSub);

        user.current_subscription_id = newSub.id;
        user.subscription_status = SubscriptionStatus.ACTIVE;
        await this.userRepository.save(user);

        const history = this.historyRepository.create({
            user_id: user.id,
            from_plan_id: oldSub ? oldSub.plan_id : null,
            to_plan_id: plan.id,
            event_type: SubscriptionEventType.UPGRADE,
            metadata: { payment_method: 'credits', price_deducted: price }
        });

        await this.historyRepository.save(history);

        return newSub;
    }

    // --- Entitlement & Feature Gating Methods ---

    /**
     * Retrieves the entitlements for a user based on their active subscription.
     * If expired or none exists, it falls back to the default free plan for their role.
     */
    async getUserEntitlements(userId: string): Promise<Record<string, any>> {
        const user = await this.userRepository.findOne({ where: { id: userId } });
        if (!user) throw new AppError(404, 'User not found');

        const activeSub = await this.getUserSubscription(userId);

        if (activeSub && activeSub.entitlements_snapshot) {
            return activeSub.entitlements_snapshot;
        }

        // Fallback to Free Plan based on User Role
        let freePlan = await this.planRepository.findOne({
            where: { role: user.role, price_monthly: 0 }
        });

        if (!freePlan) {
            freePlan = await this.planRepository.findOne({ where: { price_monthly: 0 } });
        }

        const freeEntitlements = freePlan?.entitlements || {
            land_limit: 2,
            rental_limit: 1,
            contract_limit: 2,
            product_limit: 5,
            task_limit_per_month: 10,
            premium_assets: false,
            ai_crop_planner: false,
            advanced_analytics: false,
            priority_kyc: false,
            farmbox_active: false,
            worker_plus_active: false
        };

        return freeEntitlements;
    }

    /**
     * Checks if a user has access to a specific boolean feature.
     */
    async hasFeature(userId: string, featureKey: string): Promise<boolean> {
        const entitlements = await this.getUserEntitlements(userId);
        return !!entitlements[featureKey];
    }

    /**
     * Validates if the user's current usage is within their plan's limits.
     */
    async checkLimit(userId: string, limitKey: string, currentValue: number): Promise<boolean> {
        const entitlements = await this.getUserEntitlements(userId);
        const limit = entitlements[limitKey] ?? 0;

        // Support -1 as Unlimited
        if (limit === -1) return true;

        return currentValue < limit;
    }

    // --- Stripe Lifecycle Handlers ---

    /**
     * Handles Stripe subscription cancellation (customer.subscription.deleted).
     * Cancels the active subscription and downgrades user to free plan.
     */
    async handleSubscriptionCancelled(stripeCustomerId: string) {
        const user = await this.userRepository.findOne({ where: { stripe_customer_id: stripeCustomerId } });
        if (!user) {
            console.warn(`[Webhook] No user found for Stripe customer ${stripeCustomerId}`);
            return;
        }

        const activeSub = await this.subscriptionRepository.findOne({
            where: { user_id: user.id, status: SubscriptionStatus.ACTIVE },
            relations: ['plan']
        });

        if (activeSub) {
            activeSub.status = SubscriptionStatus.CANCELLED;
            await this.subscriptionRepository.save(activeSub);

            const history = this.historyRepository.create({
                user_id: user.id,
                from_plan_id: activeSub.plan_id,
                to_plan_id: undefined,
                event_type: SubscriptionEventType.CANCEL,
                metadata: { note: 'Cancelled via Stripe webhook' }
            });
            await this.historyRepository.save(history);
        }

        // Downgrade to free plan
        await this.assignFreePlan(user);
        console.log(`✅ User ${user.id} subscription cancelled. Downgraded to free plan.`);
    }

    /**
     * Handles Stripe payment failure (invoice.payment_failed).
     * Marks the active subscription as PAST_DUE.
     */
    async handlePaymentFailed(stripeCustomerId: string) {
        const user = await this.userRepository.findOne({ where: { stripe_customer_id: stripeCustomerId } });
        if (!user) {
            console.warn(`[Webhook] No user found for Stripe customer ${stripeCustomerId}`);
            return;
        }

        const activeSub = await this.subscriptionRepository.findOne({
            where: { user_id: user.id, status: SubscriptionStatus.ACTIVE }
        });

        if (activeSub) {
            activeSub.status = SubscriptionStatus.PAST_DUE;
            await this.subscriptionRepository.save(activeSub);

            user.subscription_status = SubscriptionStatus.PAST_DUE;
            await this.userRepository.save(user);

            const history = this.historyRepository.create({
                user_id: user.id,
                from_plan_id: activeSub.plan_id,
                to_plan_id: activeSub.plan_id,
                event_type: SubscriptionEventType.DOWNGRADE,
                metadata: { note: 'Payment failed via Stripe' }
            });
            await this.historyRepository.save(history);

            console.log(`⚠️ User ${user.id} subscription marked as PAST_DUE.`);
        }
    }
}

export const subscriptionService = new SubscriptionService();
