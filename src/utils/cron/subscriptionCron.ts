import { UserSubscription, SubscriptionStatus, SubscriptionHistory, SubscriptionEventType } from '../../models/index.js';
import { LessThan, In } from 'typeorm';

export class SubscriptionCron {
    static async processExpirations() {
        console.log('[SubscriptionCron] Running subscription expiration job...');
        const now = new Date();

        // 1. ACTIVE -> GRACE
        // Subscriptions that ended but aren't yet in GRACE or EXPIRED
        const toGrace = await UserSubscription.find({
            where: {
                status: SubscriptionStatus.ACTIVE,
                current_period_end: LessThan(now)
            }
        });

        for (const sub of toGrace) {
            sub.status = SubscriptionStatus.GRACE;
            await sub.save();
            await SubscriptionHistory.create({
                user_id: sub.user_id,
                to_plan_id: sub.plan_id,
                event_type: SubscriptionEventType.PAYMENT_FAILED, // Assuming it's past due because payment didn't renew
                metadata: { reason: 'Period ended, entering grace period' }
            } as any).save();
            console.log(`[SubscriptionCron] Multi-stage: Sub ${sub.id} (User ${sub.user_id}) -> GRACE`);
        }

        // 2. GRACE -> EXPIRED
        // 3 days buffer for grace period as per plan
        const graceBuffer = new Date(now.getTime() - (3 * 24 * 60 * 60 * 1000));
        const toExpire = await UserSubscription.find({
            where: {
                status: SubscriptionStatus.GRACE,
                current_period_end: LessThan(graceBuffer)
            }
        });

        for (const sub of toExpire) {
            sub.status = SubscriptionStatus.EXPIRED;
            await sub.save();
            await SubscriptionHistory.create({
                user_id: sub.user_id,
                to_plan_id: sub.plan_id,
                event_type: SubscriptionEventType.EXPIRE,
                metadata: { reason: 'Grace period ended' }
            } as any).save();
            console.log(`[SubscriptionCron] Sub ${sub.id} (User ${sub.user_id}) -> EXPIRED`);
        }

        // 3. CANCELED (pending) -> EXPIRED
        // If a user canceled but the period is now over
        const canceledExpirations = await UserSubscription.find({
            where: {
                status: SubscriptionStatus.CANCELED,
                current_period_end: LessThan(now)
            }
        });

        for (const sub of canceledExpirations) {
            sub.status = SubscriptionStatus.EXPIRED;
            await sub.save();
            await SubscriptionHistory.create({
                user_id: sub.user_id,
                to_plan_id: sub.plan_id,
                event_type: SubscriptionEventType.EXPIRE,
                metadata: { reason: 'Canceled period ended' }
            } as any).save();
            console.log(`[SubscriptionCron] Canceled Sub ${sub.id} (User ${sub.user_id}) -> EXPIRED`);
        }
    }
}
