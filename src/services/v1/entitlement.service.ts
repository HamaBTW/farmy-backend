import { UserSubscription, SubscriptionStatus } from '../../models/index.js';

export class EntitlementService {
    async getEntitlements(userId: string): Promise<Record<string, any>> {
        const userSub = await UserSubscription.findOne({
            where: { user_id: userId },
            relations: ['plan']
        });

        // Default Free Entitlements
        const freeEntitlements = {
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

        if (!userSub || userSub.status === SubscriptionStatus.EXPIRED) {
            return freeEntitlements;
        }

        // If ACTIVE, return plan entitlements
        if (userSub.status === SubscriptionStatus.ACTIVE) {
            return {
                ...freeEntitlements,
                ...userSub.plan.entitlements
            };
        }

        return freeEntitlements;
    }

    async hasEntitlement(userId: string, entitlementKey: string): Promise<boolean> {
        const entitlements = await this.getEntitlements(userId);
        return !!entitlements[entitlementKey];
    }

    async getLimit(userId: string, limitKey: string): Promise<number> {
        const entitlements = await this.getEntitlements(userId);
        return entitlements[limitKey] ?? 0;
    }

    // Specific check helpers
    async canCreateLand(userId: string, currentLandCount: number): Promise<boolean> {
        const limit = await this.getLimit(userId, 'land_limit');
        if (limit === -1) return true; // Unlimited
        return currentLandCount < limit;
    }

    async canRentLand(userId: string, currentRentalCount: number): Promise<boolean> {
        const limit = await this.getLimit(userId, 'rental_limit');
        if (limit === -1) return true;
        return currentRentalCount < limit;
    }
}

export const entitlementService = new EntitlementService();
