import { Response, NextFunction } from 'express';
import { taskService } from '../../services/v1/task.service.js';
import { AuthRequest } from '../../middlewares/auth.middleware.js';

export const createTask = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const result = await taskService.create(
            req.params.landId as string,
            req.user!.id,
            {
                title: req.body.title,
                description: req.body.description,
                type: req.body.type,
                reward: req.body.reward,
                time_required_minutes: req.body.time_required_minutes
            }
        );

        res.status(201).json({
            success: true,
            message: 'Task created successfully',
            data: result
        });
    } catch (error) {
        next(error);
    }
};

export const getLandTasks = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const status = req.query.status as any;
        const result = await taskService.findByLand(req.params.landId as string, status);

        res.status(200).json({
            success: true,
            data: result
        });
    } catch (error) {
        next(error);
    }
};

export const assignTask = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const result = await taskService.assignTask(
            req.params.taskId as string,
            req.body.worker_id,
            req.user!.id
        );

        res.status(200).json({
            success: true,
            message: 'Task assigned successfully',
            data: result
        });
    } catch (error) {
        next(error);
    }
};

export const completeTask = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const result = await taskService.completeTask(
            req.params.taskId as string,
            req.user!.id,
            {
                proof_image_url: req.body.proof_image_url,
                proof_video_url: req.body.proof_video_url,
                proof_gps: req.body.proof_gps
            }
        );

        res.status(200).json({
            success: true,
            message: 'Task completed successfully',
            data: result
        });
    } catch (error) {
        next(error);
    }
};

export const getMyTasks = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const result = await taskService.findByWorker(req.user!.id);

        res.status(200).json({
            success: true,
            data: result
        });
    } catch (error) {
        next(error);
    }
};
