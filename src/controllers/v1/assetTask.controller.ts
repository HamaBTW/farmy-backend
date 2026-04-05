import { Response, NextFunction } from 'express';
import { AppDataSource } from '../../config/db.config.js';
import { AssetTask } from '../../models/AssetTask.js';
import { AuthRequest } from '../../middlewares/auth.middleware.js';

export const getTasksByVariant = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const variantId = req.params.variantId as string;
        const assetTaskRepo = AppDataSource.getRepository(AssetTask);
        
        const tasks = await assetTaskRepo.find({
            where: { variant_id: variantId }
        });

        res.status(200).json({
            success: true,
            data: tasks
        });
    } catch (error) {
        next(error);
    }
};
