import { Request, Response, NextFunction } from 'express';
import { proofService } from '../../services/v1/proof.service.js';
import { AuthRequest } from '../../middlewares/auth.middleware.js';
import { AppError } from '../../middlewares/error.middleware.js';

export const requestProof = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { farmer_id, land_id } = req.body;
        if (!farmer_id) {
            throw new AppError(400, 'farmer_id is required');
        }

        const result = await proofService.requestProof(req.user!.id, farmer_id, land_id);
        res.status(201).json({
            success: true,
            message: 'Proof requested successfully. Farmer has 1 hour to submit.',
            data: result
        });
    } catch (error) {
        next(error);
    }
};

export const getMyProofs = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const result = await proofService.getMyProofs(req.user!.id);
        res.status(200).json({
            success: true,
            data: result
        });
    } catch (error) {
        next(error);
    }
};

export const submitProof = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const proofImage = req.file;
        if (!proofImage) {
            throw new AppError(400, 'Proof image is required.');
        }

        const result = await proofService.submitProof(
            req.params.id as string,
            req.user!.id,
            proofImage.buffer,
            proofImage.mimetype
        );

        res.status(200).json({
            success: true,
            message: result.status === 'verified'
                ? 'Proof verified successfully by AI.'
                : 'Proof rejected by AI.',
            data: result
        });
    } catch (error) {
        next(error);
    }
};
