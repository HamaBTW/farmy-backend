import { Response, NextFunction } from 'express';
import { farmerDashboardService } from '../../services/v1/farmerDashboard.service.js';
import { AuthRequest } from '../../middlewares/auth.middleware.js';

export const getDashboardData = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        // Get locale from Accept-Language header or default to 'en'
        const locale = req.headers['accept-language'] || 'en';
        const dashboardData = await farmerDashboardService.getDashboardData(userId, locale as string);

        res.json({
            success: true,
            data: dashboardData
        });
    } catch (error) {
        next(error);
    }
};

export const repairPlacedItem = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const itemId = req.params.itemId as string;
        if (!itemId) {
            return res.status(400).json({ message: 'Item ID is required' });
        }

        const repairedItem = await farmerDashboardService.repairPlacedItem(itemId, userId);

        if (!repairedItem) {
            return res.status(404).json({ message: 'Item not found' });
        }

        res.json({
            success: true,
            message: 'Item repaired successfully',
            data: repairedItem
        });
    } catch (error) {
        next(error);
    }
};

export const refreshDashboard = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        // Force refresh by re-fetching all dashboard data
        const locale = req.headers['accept-language'] || 'en';
        const dashboardData = await farmerDashboardService.getDashboardData(userId, locale as string);

        res.json({
            success: true,
            data: dashboardData,
            refreshedAt: new Date().toISOString()
        });
    } catch (error) {
        next(error);
    }
};
