import { Request, Response, NextFunction } from 'express';
import { AppDataSource } from '../../config/db.config.js';
import { ItemRequest } from '../../models/ItemRequest.js';
import { LandRental } from '../../models/LandRental.js';
import { AuthRequest } from '../../middlewares/auth.middleware.js';

export const getMyHederaRegistry = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;

        // 1. Fetch item purchases with Hedera TxID
        const itemRequests = await AppDataSource.getRepository(ItemRequest).find({
            where: { user_id: userId },
            order: { createdAt: 'DESC' },
        });

        const itemEntries = itemRequests
            .filter((r) => r.hedera_transaction_id)
            .map((r) => ({
                type: 'item_purchase',
                id: r.id,
                label: `${r.asset_category} Purchase`,
                sublabel: r.variant_id,
                amount: r.price_paid ? Number(r.price_paid) : null,
                currency: 'usd',
                payment_method: 'credits',
                status: r.status,
                hedera_transaction_id: r.hedera_transaction_id,
                timestamp: r.createdAt,
            }));

        // 2. Fetch land rentals with Hedera TxID
        const rentals = await AppDataSource.getRepository(LandRental).find({
            where: { investor_id: userId },
            relations: ['land'],
            order: { createdAt: 'DESC' },
        });

        const rentalEntries = rentals
            .filter((r) => r.hedera_transaction_id)
            .map((r) => ({
                type: 'land_rental',
                id: r.id,
                label: `Land Rental`,
                sublabel: r.land?.name ?? 'Unknown Land',
                amount: Number(r.monthly_rent),
                currency: 'usd',
                payment_method: r.payment_status === 'paid' ? 'credits/stripe' : 'pending',
                status: r.payment_status,
                hedera_transaction_id: r.hedera_transaction_id,
                timestamp: r.createdAt,
            }));

        // 3. Combine and sort by timestamp desc
        const all = [...itemEntries, ...rentalEntries].sort(
            (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );

        res.status(200).json({
            success: true,
            total: all.length,
            data: all,
        });
    } catch (error) {
        next(error);
    }
};
