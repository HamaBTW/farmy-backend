import { Response, NextFunction } from 'express';
import { workerPerformanceService } from '../../services/v1/workerPerformance.service.js';
import { AuthRequest } from '../../middlewares/auth.middleware.js';

export const getWorkerPerformance = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { landIds, startDate, endDate } = req.query;

        // Parse filters from query params
        const filters: any = {};

        // Handle landIds - could be string, array, or object (from landIds[0], landIds[1] format)
        if (landIds) {
            if (Array.isArray(landIds)) {
                filters.landIds = landIds;
            } else if (typeof landIds === 'object') {
                // Handle { '0': 'id1', '1': 'id2' } format
                filters.landIds = Object.values(landIds);
            } else {
                filters.landIds = [landIds as string];
            }
        }

        if (startDate) {
            filters.startDate = new Date(startDate as string);
        }

        if (endDate) {
            filters.endDate = new Date(endDate as string);
        }

        const result = await workerPerformanceService.getWorkerPerformance(
            req.user!.id,
            filters
        );

        res.status(200).json({
            success: true,
            data: result
        });
    } catch (error) {
        next(error);
    }
};

export const getTopPerformers = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { landIds, startDate, endDate, limit } = req.query;

        const filters: any = {};

        // Handle landIds - could be string, array, or object (from landIds[0], landIds[1] format)
        if (landIds) {
            if (Array.isArray(landIds)) {
                filters.landIds = landIds;
            } else if (typeof landIds === 'object') {
                // Handle { '0': 'id1', '1': 'id2' } format
                filters.landIds = Object.values(landIds);
            } else {
                filters.landIds = [landIds as string];
            }
        }

        if (startDate) {
            filters.startDate = new Date(startDate as string);
        }

        if (endDate) {
            filters.endDate = new Date(endDate as string);
        }

        const result = await workerPerformanceService.getTopPerformers(
            req.user!.id,
            filters,
            limit ? parseInt(limit as string, 10) : 3
        );

        res.status(200).json({
            success: true,
            data: result
        });
    } catch (error) {
        next(error);
    }
};

export const getUnderperformers = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { landIds, startDate, endDate, limit } = req.query;

        const filters: any = {};

        // Handle landIds - could be string, array, or object (from landIds[0], landIds[1] format)
        if (landIds) {
            if (Array.isArray(landIds)) {
                filters.landIds = landIds;
            } else if (typeof landIds === 'object') {
                // Handle { '0': 'id1', '1': 'id2' } format
                filters.landIds = Object.values(landIds);
            } else {
                filters.landIds = [landIds as string];
            }
        }

        if (startDate) {
            filters.startDate = new Date(startDate as string);
        }

        if (endDate) {
            filters.endDate = new Date(endDate as string);
        }

        const result = await workerPerformanceService.getUnderperformers(
            req.user!.id,
            filters,
            limit ? parseInt(limit as string, 10) : 3
        );

        res.status(200).json({
            success: true,
            data: result
        });
    } catch (error) {
        next(error);
    }
};
