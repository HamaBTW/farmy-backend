import { Response, NextFunction } from 'express';
import { workerProfileService } from '../../services/v1/workerProfile.service.js';
import { AuthRequest } from '../../middlewares/auth.middleware.js';

export const createWorkerProfile = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const result = await workerProfileService.create({
            user_id: req.user!.id,
            skills: req.body.skills,
            bio: req.body.bio,
            hourly_rate: req.body.hourly_rate
        });

        res.status(201).json({
            success: true,
            message: 'Worker profile created successfully',
            data: result
        });
    } catch (error) {
        next(error);
    }
};

export const getMyWorkerProfile = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const result = await workerProfileService.findByUserIdOptional(req.user!.id);

        res.status(200).json({
            success: true,
            data: result
        });
    } catch (error) {
        next(error);
    }
};

export const updateMyWorkerProfile = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const result = await workerProfileService.update(req.user!.id, req.body);

        res.status(200).json({
            success: true,
            message: 'Worker profile updated successfully',
            data: result
        });
    } catch (error) {
        next(error);
    }
};

export const getMarketplace = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const filters = {
            skill: req.query.skill as string | undefined,
            minRating: req.query.minRating ? parseFloat(req.query.minRating as string) : undefined,
            availability: req.query.availability as any,
            excludeLandId: req.query.excludeLandId as string | undefined
        };

        const result = await workerProfileService.findMarketplace(filters);

        res.status(200).json({
            success: true,
            data: result
        });
    } catch (error) {
        next(error);
    }
};

export const verifyWorkerProfile = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const result = await workerProfileService.verifyProfile(
            req.params.profileId as string,
            req.body.status
        );

        res.status(200).json({
            success: true,
            message: 'Worker profile verification updated',
            data: result
        });
    } catch (error) {
        next(error);
    }
};
