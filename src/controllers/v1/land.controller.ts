import { Request, Response, NextFunction } from 'express';
import { landService } from '../../services/v1/land.service.js';
import { AuthRequest } from '../../middlewares/auth.middleware.js';

export const createLand = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const result = await landService.create({
            ...req.body,
            owner_id: req.user!.id
        });

        res.status(201).json({
            success: true,
            message: 'Land created successfully',
            data: result
        });
    } catch (error) {
        next(error);
    }
};

export const getAllLands = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const ownerId = req.query.ownerId as string | undefined;
        const includeInactive = req.query.includeInactive === 'true';
        const result = await landService.findAll(ownerId, includeInactive);

        res.status(200).json({
            success: true,
            data: result
        });
    } catch (error) {
        next(error);
    }
};

export const getMyLands = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const result = await landService.findByOwner(req.user!.id);

        res.status(200).json({
            success: true,
            data: result
        });
    } catch (error) {
        next(error);
    }
};

export const getLandById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const result = await landService.findById(req.params.id as string);

        res.status(200).json({
            success: true,
            data: result
        });
    } catch (error) {
        next(error);
    }
};

export const getLandWithItems = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const result = await landService.findByIdWithItems(req.params.id as string);

        res.status(200).json({
            success: true,
            data: result
        });
    } catch (error) {
        next(error);
    }
};

export const updateLand = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const result = await landService.update(req.params.id as string, req.user!.id, req.body);

        res.status(200).json({
            success: true,
            message: 'Land updated successfully',
            data: result
        });
    } catch (error) {
        next(error);
    }
};

export const deleteLand = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const result = await landService.delete(req.params.id as string, req.user!.id);

        res.status(200).json({
            success: true,
            ...result
        });
    } catch (error) {
        next(error);
    }
};
