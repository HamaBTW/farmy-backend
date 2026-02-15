import { Response, NextFunction } from 'express';
import { landWorkerService } from '../../services/v1/landWorker.service.js';
import { AuthRequest } from '../../middlewares/auth.middleware.js';

export const assignWorker = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const result = await landWorkerService.assignWorker(
            req.params.landId as string,
            req.user!.id,
            {
                worker_id: req.body.worker_id,
                role: req.body.role,
                salary: req.body.salary
            }
        );

        res.status(201).json({
            success: true,
            message: 'Worker assigned to land successfully',
            data: result
        });
    } catch (error) {
        next(error);
    }
};

export const getLandWorkers = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const result = await landWorkerService.findByLand(req.params.landId as string);

        res.status(200).json({
            success: true,
            data: result
        });
    } catch (error) {
        next(error);
    }
};

export const getActiveLandWorkers = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const result = await landWorkerService.findActiveByLand(req.params.landId as string);

        res.status(200).json({
            success: true,
            data: result
        });
    } catch (error) {
        next(error);
    }
};

export const removeWorker = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const result = await landWorkerService.removeWorker(
            req.params.landId as string,
            req.params.workerId as string,
            req.user!.id
        );

        res.status(200).json({
            success: true,
            message: 'Worker removed from land',
            data: result
        });
    } catch (error) {
        next(error);
    }
};

export const getMyAssignedLands = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const result = await landWorkerService.findByWorker(req.user!.id);

        res.status(200).json({
            success: true,
            data: result
        });
    } catch (error) {
        next(error);
    }
};

export const getWorkforceStats = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const result = await landWorkerService.getWorkforceStats(req.params.landId as string);

        res.status(200).json({
            success: true,
            data: result
        });
    } catch (error) {
        next(error);
    }
};
