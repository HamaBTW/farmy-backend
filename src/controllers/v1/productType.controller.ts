import { Request, Response, NextFunction } from 'express';
import { ProductType } from '../../models/ProductType.js';

export const getAllProductTypes = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const productTypes = await ProductType.find();
        res.status(200).json({
            success: true,
            data: productTypes
        });
    } catch (error) {
        next(error);
    }
};
