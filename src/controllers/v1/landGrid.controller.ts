import { Request, Response, NextFunction } from 'express';
import { landGridService } from '../../services/v1/landGrid.service.js';
import { AssetCategory } from '../../models/AssetCategory.js';
import { AppError } from '../../middlewares/error.middleware.js';

const validateCategory = (category: string): AssetCategory => {
    const validCategories = Object.values(AssetCategory);
    if (!validCategories.includes(category as AssetCategory)) {
        throw new AppError(400, `Invalid category. Must be one of: ${validCategories.join(', ')}`);
    }
    return category as AssetCategory;
};

export const getLandGrid = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params as { id: string };
        const result = await landGridService.getLandGrid(id);

        res.status(200).json({
            success: true,
            data: result
        });
    } catch (error) {
        next(error);
    }
};

export const getVariantFootprint = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { category: catParam, id } = req.params as { category: string, id: string };
        const category = validateCategory(catParam);
        const rotation = parseInt(req.query.rotation as string) || 0;

        const result = await landGridService.getVariantFootprint(category, id, rotation);

        res.status(200).json({
            success: true,
            data: result
        });
    } catch (error) {
        next(error);
    }
};
