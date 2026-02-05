import { Request, Response, NextFunction } from 'express';
import { assetVariantService } from '../../services/v1/assetVariant.service.js';
import { AssetCategory } from '../../models/AssetCategory.js';
import { AppError } from '../../middlewares/error.middleware.js';

const validateCategory = (category: string): AssetCategory => {
    const validCategories = Object.values(AssetCategory);
    if (!validCategories.includes(category as AssetCategory)) {
        throw new AppError(400, `Invalid category. Must be one of: ${validCategories.join(', ')}`);
    }
    return category as AssetCategory;
};

export const createAssetVariant = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const category = validateCategory(req.params.category as string);
        const result = await assetVariantService.create(category, req.body);

        res.status(201).json({
            success: true,
            message: `${category} variant created successfully`,
            data: result
        });
    } catch (error) {
        next(error);
    }
};

export const getAllAssetVariants = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const category = validateCategory(req.params.category as string);
        const typeId = req.query.typeId as string | undefined;
        const includeUnavailable = req.query.includeUnavailable === 'true';
        const result = await assetVariantService.findAll(category, typeId, includeUnavailable);

        res.status(200).json({
            success: true,
            data: result
        });
    } catch (error) {
        next(error);
    }
};

export const getAssetVariantById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const category = validateCategory(req.params.category as string);
        const result = await assetVariantService.findById(category, req.params.id as string);

        res.status(200).json({
            success: true,
            data: result
        });
    } catch (error) {
        next(error);
    }
};

export const getAssetVariantByCode = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const category = validateCategory(req.params.category as string);
        const result = await assetVariantService.findByVariantCode(category, req.params.code as string);

        res.status(200).json({
            success: true,
            data: result
        });
    } catch (error) {
        next(error);
    }
};

export const updateAssetVariant = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const category = validateCategory(req.params.category as string);
        const result = await assetVariantService.update(category, req.params.id as string, req.body);

        res.status(200).json({
            success: true,
            message: `${category} variant updated successfully`,
            data: result
        });
    } catch (error) {
        next(error);
    }
};

export const deleteAssetVariant = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const category = validateCategory(req.params.category as string);
        const result = await assetVariantService.delete(category, req.params.id as string);

        res.status(200).json({
            success: true,
            ...result
        });
    } catch (error) {
        next(error);
    }
};

export const toggleAssetVariantAvailable = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const category = validateCategory(req.params.category as string);
        const result = await assetVariantService.toggleAvailable(category, req.params.id as string);

        res.status(200).json({
            success: true,
            message: `${category} variant ${(result as any).is_available ? 'made available' : 'made unavailable'}`,
            data: result
        });
    } catch (error) {
        next(error);
    }
};

export const getAssetVariantPrice = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const category = validateCategory(req.params.category as string);
        const result = await assetVariantService.getVariantWithPrice(category, req.params.id as string);

        res.status(200).json({
            success: true,
            data: result
        });
    } catch (error) {
        next(error);
    }
};
