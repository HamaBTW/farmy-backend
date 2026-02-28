import { Request, Response, NextFunction } from 'express';
import { entitlementService } from '../services/v1/entitlement.service.js';

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

            const hasFeature = await entitlementService.hasEntitlement(userId, entitlementKey);
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
