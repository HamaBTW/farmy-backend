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
            end_date: end_date
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
            return;
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
            end_date
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
    }

    async upgradeWithCredits(userId: string, planId: string, billingCycle: 'monthly' | 'yearly') {
        const user = await this.userRepository.findOne({ where: { id: userId } });
        const plan = await this.planRepository.findOne({ where: { id: planId } });

        if (!user || !plan) throw new AppError(404, 'User or Plan not found');

        const price = Number(billingCycle === 'monthly' ? plan.price_monthly : plan.price_yearly);

        if (Number(user.credits_balance) < price) {
            throw new AppError(400, 'Insufficient credits balance');
        }

        // Deduct credits
        user.credits_balance = Number(user.credits_balance) - price;
        user.credits = Number(user.credits_balance); // Keep both in sync just in case

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
            end_date
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
}

export const subscriptionService = new SubscriptionService();
