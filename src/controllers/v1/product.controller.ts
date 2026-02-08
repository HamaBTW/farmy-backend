import { Request, Response, NextFunction } from 'express';
import { productService } from '../../services/v1/product.service.js';
import { AuthRequest } from '../../middlewares/auth.middleware.js';
import { ProductStatus } from '../../models/Product.js';

export const createProduct = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const result = await productService.create({
            ...req.body,
            owner_id: req.user!.id
        });

        res.status(201).json({
            success: true,
            message: 'Product listed successfully',
            data: result
        });
    } catch (error) {
        next(error);
    }
};

export const getAllProducts = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const filters = {
            owner_id: req.query.ownerId as string | undefined,
            land_id: req.query.landId as string | undefined,
            product_type_id: req.query.productTypeId as string | undefined,
            status: req.query.status as ProductStatus | undefined,
            search: req.query.search as string | undefined
        };

        const result = await productService.findAll(filters);

        res.status(200).json({
            success: true,
            data: result
        });
    } catch (error) {
        next(error);
    }
};

export const getProductById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const result = await productService.findById(req.params.id as string);

        res.status(200).json({
            success: true,
            data: result
        });
    } catch (error) {
        next(error);
    }
};

export const updateProduct = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const result = await productService.update(req.params.id as string, req.user!.id, req.body);

        res.status(200).json({
            success: true,
            message: 'Product updated successfully',
            data: result
        });
    } catch (error) {
        next(error);
    }
};

export const deleteProduct = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        await productService.delete(req.params.id as string, req.user!.id);

        res.status(200).json({
            success: true,
            message: 'Product deleted successfully'
        });
    } catch (error) {
        next(error);
    }
};

export const buyProduct = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const result = await productService.buy(req.params.id as string, req.user!.id);

        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};
