import { Request, Response, NextFunction } from 'express';
import { assetTypeService } from '../../services/v1/assetType.service.js';
import { AssetCategory } from '../../models/AssetCategory.js';
import { AppError } from '../../middlewares/error.middleware.js';

const validateCategory = (category: string): AssetCategory => {
    const validCategories = Object.values(AssetCategory);
    if (!validCategories.includes(category as AssetCategory)) {
        throw new AppError(400, `Invalid category. Must be one of: ${validCategories.join(', ')}`);
    }
    return category as AssetCategory;
};

export const createAssetType = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const category = validateCategory(req.params.category as string);
        const result = await assetTypeService.create(category, req.body);

        res.status(201).json({
            success: true,
            message: `${category} type created successfully`,
            data: result
        });
    } catch (error) {
        next(error);
    }
};

export const getAllAssetTypes = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const category = validateCategory(req.params.category as string);
        const includeInactive = req.query.includeInactive === 'true';
        const result = await assetTypeService.findAll(category, includeInactive);

        res.status(200).json({
            success: true,
            data: result
        });
    } catch (error) {
        next(error);
    }
};

export const getAllAssetTypesWithVariants = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const category = validateCategory(req.params.category as string);
        const includeInactive = req.query.includeInactive === 'true';
        const result = await assetTypeService.findAllWithVariants(category, includeInactive);

        res.status(200).json({
            success: true,
            data: result
        });
    } catch (error) {
        next(error);
    }
};

export const getAssetTypeById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const category = validateCategory(req.params.category as string);
        const result = await assetTypeService.findById(category, req.params.id as string);

        res.status(200).json({
            success: true,
            data: result
        });
    } catch (error) {
        next(error);
    }
};

export const getAssetTypeWithVariants = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const category = validateCategory(req.params.category as string);
        const result = await assetTypeService.findByIdWithVariants(category, req.params.id as string);

        res.status(200).json({
            success: true,
            data: result
        });
    } catch (error) {
        next(error);
    }
};

export const updateAssetType = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const category = validateCategory(req.params.category as string);
        const result = await assetTypeService.update(category, req.params.id as string, req.body);

        res.status(200).json({
            success: true,
            message: `${category} type updated successfully`,
            data: result
        });
    } catch (error) {
        next(error);
    }
};

export const deleteAssetType = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const category = validateCategory(req.params.category as string);
        const result = await assetTypeService.delete(category, req.params.id as string);

        res.status(200).json({
            success: true,
            ...result
        });
    } catch (error) {
        next(error);
    }
};

export const toggleAssetTypeActive = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const category = validateCategory(req.params.category as string);
        const result = await assetTypeService.toggleActive(category, req.params.id as string);

        res.status(200).json({
            success: true,
            message: `${category} type ${(result as any).is_active ? 'activated' : 'deactivated'} successfully`,
            data: result
        });
    } catch (error) {
        next(error);
    }
};
