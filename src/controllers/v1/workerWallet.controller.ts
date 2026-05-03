import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middlewares/auth.middleware.js';
import { workerWalletService } from '../../services/v1/workerWallet.service.js';
import { AppError } from '../../middlewares/error.middleware.js';

const parsePagination = (limitValue: unknown, offsetValue: unknown) => {
    const parsedLimit = Number(limitValue);
    const parsedOffset = Number(offsetValue);

    return {
        limit: Number.isFinite(parsedLimit) ? Math.min(Math.max(Math.trunc(parsedLimit), 1), 100) : 20,
        offset: Number.isFinite(parsedOffset) ? Math.max(Math.trunc(parsedOffset), 0) : 0,
    };
};

export const getWalletOverview = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const workerId = req.user!.id;
        const data = await workerWalletService.getWalletOverview(workerId);
        
        res.status(200).json({
            success: true,
            data
        });
    } catch (error) {
        next(error);
    }
};

export const getTransactionHistory = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const workerId = req.user!.id;
        const type = req.query.type as string;
        const { limit, offset } = parsePagination(req.query.limit, req.query.offset);

        const data = await workerWalletService.getTransactionHistory(workerId, type, limit, offset);

        res.status(200).json({
            success: true,
            data
        });
    } catch (error) {
        next(error);
    }
};

export const getTaskEarnings = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const workerId = req.user!.id;
        const { limit, offset } = parsePagination(req.query.limit, req.query.offset);

        const data = await workerWalletService.getTaskEarnings(workerId, limit, offset);

        res.status(200).json({
            success: true,
            data
        });
    } catch (error) {
        next(error);
    }
};

export const requestWithdrawal = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const workerId = req.user!.id;
        const { amount } = req.body;

        if (!Number.isFinite(Number(amount))) {
            throw new AppError(400, 'Valid amount is required');
        }

        const data = await workerWalletService.requestWithdrawal(workerId, Number(amount));

        res.status(200).json({
            success: true,
            message: data.message,
            data: data.transaction
        });
    } catch (error) {
        next(error);
    }
};
