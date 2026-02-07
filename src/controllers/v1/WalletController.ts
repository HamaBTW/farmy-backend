import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middlewares/auth.middleware.js';
import { walletService } from '../../services/v1/WalletService.js';

export const getWalletStatus = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;
        const status = await walletService.getWalletStatus(userId);

        res.status(200).json({
            success: true,
            data: status
        });
    } catch (error) {
        next(error);
    }
};

export const addPaymentMethod = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;
        const method = await walletService.addPaymentMethod(userId, req.body);

        res.status(201).json({
            success: true,
            message: 'Payment method added successfully',
            data: method
        });
    } catch (error) {
        next(error);
    }
};

export const chargeCredits = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;
        const { amount } = req.body;
        const user = await walletService.chargeCredits(userId, Number(amount));

        res.status(200).json({
            success: true,
            message: 'Wallet charged successfully',
            data: {
                credits: user.credits
            }
        });
    } catch (error) {
        next(error);
    }
};

export const deletePaymentMethod = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;
        const { id } = req.params;
        await walletService.deletePaymentMethod(userId, id as string);

        res.status(200).json({
            success: true,
            message: 'Payment method deleted'
        });
    } catch (error) {
        next(error);
    }
};
