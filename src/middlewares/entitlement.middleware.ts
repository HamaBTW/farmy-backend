import { Request, Response, NextFunction } from 'express';
import { subscriptionService } from '../services/v1/subscription.service.js';

/**
 * Middleware to check if a user has a specific entitlement (boolean flag).
 * Useful for feature-gating, like 'ai_crop_planner' or 'premium_assets'.
 */
export const requireEntitlement = (entitlementKey: string) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            const userId = (req as any).user?.id;
            if (!userId) {
                return res.status(401).json({ message: 'Unauthorized. User context missing.' });
            }

            const hasFeature = await subscriptionService.hasFeature(userId, entitlementKey);
            if (!hasFeature) {
                return res.status(403).json({
                    message: `Upgrade required to access this feature: ${entitlementKey}`
                });
            }

            next();
        } catch (error) {
            console.error('Error in entitlement middleware:', error);
            res.status(500).json({ message: 'Internal server error validating entitlement' });
        }
    };
};

/**
 * Middleware to check if a user's current usage is within their plan limit (e.g. land_limit).
 */
export const requireLimit = (limitKey: string, countResolver: (req: Request) => Promise<number>) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            const userId = (req as any).user?.id;
            if (!userId) {
                return res.status(401).json({ message: 'Unauthorized. User context missing.' });
            }

            const currentCount = await countResolver(req);
            const isWithinLimit = await subscriptionService.checkLimit(userId, limitKey, currentCount);

            if (!isWithinLimit) {
                return res.status(403).json({
                    message: `Upgrade required. You have reached your ${limitKey}.`
                });
            }

            next();
        } catch (error) {
            console.error('Error in requireLimit middleware:', error);
            res.status(500).json({ message: 'Internal server error validating limits' });
        }
    };
};
