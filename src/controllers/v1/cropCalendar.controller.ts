import { Request, Response, NextFunction } from 'express';
import { cropCalendarService } from '../../services/v1/cropCalendar.service.js';
import { AuthRequest } from '../../middlewares/auth.middleware.js';

/**
 * Get crop cycles for a land (derived from placed items)
 */
export const getCropCycles = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const landId = req.params.landId as string;
        const userId = req.user!.id;

        const cycles = await cropCalendarService.getCropCycles(landId, userId);

        res.status(200).json({
            success: true,
            data: cycles
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get crop plans for a land
 */
export const getCropPlans = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const landId = req.params.landId as string;
        const userId = req.user!.id;

        const plans = await cropCalendarService.getCropPlans(landId, userId);

        res.status(200).json({
            success: true,
            data: plans
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Create a new crop plan
 */
export const createCropPlan = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;
        const planData = req.body;

        const plan = await cropCalendarService.createCropPlan(planData, userId);

        res.status(201).json({
            success: true,
            message: 'Crop plan created successfully',
            data: plan
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Update a crop plan
 */
export const updateCropPlan = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const id = req.params.id as string;
        const userId = req.user!.id;
        const updates = req.body;

        const plan = await cropCalendarService.updateCropPlan(id, userId, updates);

        if (!plan) {
            res.status(404).json({
                success: false,
                message: 'Crop plan not found'
            });
            return;
        }

        res.status(200).json({
            success: true,
            message: 'Crop plan updated successfully',
            data: plan
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Delete a crop plan
 */
export const deleteCropPlan = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const id = req.params.id as string;
        const userId = req.user!.id;

        const deleted = await cropCalendarService.deleteCropPlan(id, userId);

        if (!deleted) {
            res.status(404).json({
                success: false,
                message: 'Crop plan not found'
            });
            return;
        }

        res.status(200).json({
            success: true,
            message: 'Crop plan deleted successfully'
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get all crop plans for current user
 */
export const getMyCropPlans = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;

        const plans = await cropCalendarService.getAllCropPlans(userId);

        res.status(200).json({
            success: true,
            data: plans
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get upcoming harvests across all lands
 */
export const getUpcomingHarvests = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;
        const days = parseInt(req.query.days as string) || 30;

        const harvests = await cropCalendarService.getUpcomingHarvests(userId, days);

        res.status(200).json({
            success: true,
            data: harvests
        });
    } catch (error) {
        next(error);
    }
};
