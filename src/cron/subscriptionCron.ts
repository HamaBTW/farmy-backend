import cron from 'node-cron';
import { AppDataSource } from '../config/db.config.js';
import { User, UserRole } from '../models/User.js';
import { UserSubscription, SubscriptionStatus } from '../models/UserSubscription.js';
import { SubscriptionPlan } from '../models/SubscriptionPlan.js';
import { SubscriptionHistory, SubscriptionEventType } from '../models/SubscriptionHistory.js';
import { LessThan } from 'typeorm';
import { subscriptionService } from '../services/v1/subscription.service.js';

export const startSubscriptionCron = () => {
    // Run daily at midnight '0 0 * * *'
    cron.schedule('0 0 * * *', async () => {
        console.log('🔄 Running Daily Subscription Expiration Check...');
        try {
            const subscriptionRepo = AppDataSource.getRepository(UserSubscription);
            const userRepo = AppDataSource.getRepository(User);
            const planRepo = AppDataSource.getRepository(SubscriptionPlan);
            const historyRepo = AppDataSource.getRepository(SubscriptionHistory);

            const expiredSubscriptions = await subscriptionRepo.find({
                where: {
                    status: SubscriptionStatus.ACTIVE,
                    end_date: LessThan(new Date())
                },
                relations: ['user', 'plan']
            });

            console.log(`Found ${expiredSubscriptions.length} subscriptions to expire.`);

            for (const sub of expiredSubscriptions) {
                // Mark old sub as expired
                sub.status = SubscriptionStatus.EXPIRED;
                await subscriptionRepo.save(sub);

                // Add history record for expiration (downgrade happens correctly next)
                const historyExpire = historyRepo.create({
                    user_id: sub.user_id,
                    from_plan_id: sub.plan_id,
                    to_plan_id: sub.plan_id,
                    event_type: SubscriptionEventType.EXPIRE,
                    metadata: { note: 'Subscription naturally reached end_date' }
                });
                await historyRepo.save(historyExpire);

                // Re-assign the Free Plan using our existing service
                if (sub.user) {
                    try {
                        await subscriptionService.assignFreePlan(sub.user);
                        console.log(`✅ Expired plan for User ID ${sub.user.id}. Downgraded to free plan.`);
                    } catch (err: any) {
                        console.error(`❌ Failed to downgrade User ID ${sub.user.id} to free plan:`, err.message);
                    }
                }
            }

            console.log('✅ Daily Subscription Expiration Check completed.');
        } catch (error: any) {
            console.error('❌ Error in Subscription Expiration Cron:', error.message);
        }
    });

    console.log('🕒 Subscription Expiration Cron scheduled (Runs daily at midnight).');
};
