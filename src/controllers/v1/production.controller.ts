import { Request, Response, NextFunction } from 'express';
import { productionService } from '../../services/v1/production.service.js';
import { AssetCategory } from '../../models/AssetCategory.js';
import { AppError } from '../../middlewares/error.middleware.js';

// ============ PRODUCT TYPES ============

export const createProductType = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const result = await productionService.createProductType(req.body);

        res.status(201).json({
            success: true,
            message: 'Product type created successfully',
            data: result
        });
    } catch (error) {
        next(error);
    }
};

export const getAllProductTypes = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const includeInactive = req.query.includeInactive === 'true';
        const result = await productionService.findAllProductTypes(includeInactive);

        res.status(200).json({
            success: true,
            data: result
        });
    } catch (error) {
        next(error);
    }
};

export const getProductTypeById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const result = await productionService.findProductTypeById(req.params.id as string);

        res.status(200).json({
            success: true,
            data: result
        });
    } catch (error) {
        next(error);
    }
};

export const updateProductType = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const result = await productionService.updateProductType(req.params.id as string, req.body);

        res.status(200).json({
            success: true,
            message: 'Product type updated successfully',
            data: result
        });
    } catch (error) {
        next(error);
    }
};

export const deleteProductType = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const result = await productionService.deleteProductType(req.params.id as string);

        res.status(200).json({
            success: true,
            ...result
        });
    } catch (error) {
        next(error);
    }
};

// ============ ASSET PRODUCTIONS ============

const validateCategory = (category: string): AssetCategory => {
    const validCategories = Object.values(AssetCategory);
    if (!validCategories.includes(category as AssetCategory)) {
        throw new AppError(400, `Invalid category. Must be one of: ${validCategories.join(', ')}`);
    }
    return category as AssetCategory;
};

export const addProductionToVariant = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const category = validateCategory(req.params.category as string);
        const result = await productionService.addProduction({
            ...req.body,
            variant_id: req.params.variantId,
            asset_category: category
        });

        res.status(201).json({
            success: true,
            message: 'Production added to variant',
            data: result
        });
    } catch (error) {
        next(error);
    }
};

export const getVariantProductions = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const category = validateCategory(req.params.category as string);
        const result = await productionService.getProductionsForVariant(
            category,
            req.params.variantId as string
        );

        res.status(200).json({
            success: true,
            data: result
        });
    } catch (error) {
        next(error);
    }
};

export const getVariantWithProductions = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const category = validateCategory(req.params.category as string);
        const result = await productionService.getVariantWithProductions(
            category,
            req.params.variantId as string
        );

        res.status(200).json({
            success: true,
            data: result
        });
    } catch (error) {
        next(error);
    }
};

export const updateProduction = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const result = await productionService.updateProduction(req.params.id as string, req.body);

        res.status(200).json({
            success: true,
            message: 'Production updated successfully',
            data: result
        });
    } catch (error) {
        next(error);
    }
};

export const removeProduction = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const result = await productionService.removeProduction(req.params.id as string);

        res.status(200).json({
            success: true,
            ...result
        });
    } catch (error) {
        next(error);
    }
};
