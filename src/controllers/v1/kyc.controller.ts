import { Request, Response, NextFunction } from 'express';
import { kycService } from '../../services/v1/kyc.service.js';
import { AppError } from '../../middlewares/error.middleware.js';

export const startKyc = async (req: Request, res: Response, next: NextFunction) => {
    try {
        console.log('Received startKyc request');
        const userId = (req as any).user.id;
        const { role } = req.body;
        const files = (req as any).files;

        console.log(`[DEBUG] startKyc - Body:`, req.body);
        console.log(`[DEBUG] startKyc - Files Keys:`, files ? Object.keys(files) : 'No files');

        console.log(`Starting KYC for userId: ${userId}, role: ${role}`);

        if (!role || (role !== 'farmer' && role !== 'investor')) {
            throw new AppError(400, 'Invalid role requested. Must be "farmer" or "investor".');
        }

        if (!files || !files.front_image || !files.back_image || !files.selfie_image) {
            throw new AppError(400, 'Missing required KYC images (front_image, back_image, selfie_image)');
        }

        const result = await kycService.submitKyc(userId, role, files);

        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

