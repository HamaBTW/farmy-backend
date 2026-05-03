import { Request, Response } from 'express';
import { AppDataSource } from '../../config/db.config.js';
import { LandRental } from '../../models/LandRental.js';
import { ItemRequest } from '../../models/ItemRequest.js';
import { ItemRequestStatus } from '../../models/AssetCategory.js';
import { Transaction, TransactionStatus } from '../../models/Transaction.js';
import { LandWorkerContract } from '../../models/LandWorkerContract.js';
import { ProductPurchase } from '../../models/ProductPurchase.js';
import { Product } from '../../models/Product.js';
import { Land } from '../../models/Land.js';

export class RoiController {
    static async getInvestorRoiDashboard(req: Request, res: Response) {
        try {
            const userId = (req as any).user.id;

            // 1. Fetch all land rentals for this investor
            const landRentalRepository = AppDataSource.getRepository(LandRental);
            const rentals = await landRentalRepository.find({
                where: { investor_id: userId },
                relations: ['land']
            });

            if (!rentals || rentals.length === 0) {
                return res.status(200).json({
                    overview: {
                        totalInvestment: 0,
                        totalRevenue: 0,
                        netProfit: 0,
                        roiPercentage: 0
                    },
                    rentals: []
                });
            }

            const itemRequestRepo = AppDataSource.getRepository(ItemRequest);
            const transactionRepo = AppDataSource.getRepository(Transaction);
            const purchaseRepo = AppDataSource.getRepository(ProductPurchase);

            const resultRentals = [];
            let globalTotalInvestment = 0;
            let globalTotalRevenue = 0;

            for (const rental of rentals) {
                // Calculate elapsed months for rent
                const start = new Date(rental.rental_start_date);
                const end = rental.rental_end_date ? new Date(rental.rental_end_date) : new Date();
                let monthsPassed = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
                if (monthsPassed < 1) monthsPassed = 1; // At least 1 month

                const totalRentCost = Number(rental.monthly_rent) * monthsPassed;

                // Sum Item Costs
                const itemQuery = await itemRequestRepo.createQueryBuilder('item')
                    .select('SUM(item.price_paid)', 'total_item_cost')
                    .where('item.land_id = :landId', { landId: rental.land_id })
                    .andWhere('item.user_id = :userId', { userId })
                    .andWhere('item.status = :status', { status: ItemRequestStatus.APPROVED })
                    .getRawOne();
                
                const totalItemCost = Number(itemQuery.total_item_cost) || 0;

                // Sum Worker Costs
                const workerQuery = await transactionRepo.createQueryBuilder('tx')
                    .select('SUM(tx.amount)', 'total_worker_cost')
                    .innerJoin(LandWorkerContract, 'contract', 'tx.contract_id = contract.id')
                    .where('contract.land_id = :landId', { landId: rental.land_id })
                    .andWhere('tx.investor_id = :userId', { userId })
                    .andWhere('tx.status = :status', { status: TransactionStatus.SUCCEEDED })
                    .getRawOne();
                
                const totalWorkerCost = Number(workerQuery.total_worker_cost) || 0;

                // Sum Revenues
                const revenueQuery = await purchaseRepo.createQueryBuilder('purchase')
                    .select('SUM(purchase.total_price)', 'total_revenue')
                    .innerJoin(Product, 'product', 'purchase.product_id = product.id')
                    .where('product.land_id = :landId', { landId: rental.land_id })
                    .andWhere('purchase.seller_id = :userId', { userId })
                    .getRawOne();
                
                const totalRevenue = Number(revenueQuery.total_revenue) || 0;

                const totalInvestment = totalRentCost + totalItemCost + totalWorkerCost;
                const netProfit = totalRevenue - totalInvestment;
                const roiPercentage = totalInvestment > 0 ? (netProfit / totalInvestment) * 100 : 0;

                globalTotalInvestment += totalInvestment;
                globalTotalRevenue += totalRevenue;

                resultRentals.push({
                    id: rental.id,
                    landId: rental.land_id,
                    landName: rental.land.name,
                    costs: {
                        rent: totalRentCost,
                        items: totalItemCost,
                        workers: totalWorkerCost,
                        total: totalInvestment
                    },
                    revenue: totalRevenue,
                    netProfit,
                    roiPercentage
                });
            }

            const globalNetProfit = globalTotalRevenue - globalTotalInvestment;
            const globalRoiPercentage = globalTotalInvestment > 0 ? (globalNetProfit / globalTotalInvestment) * 100 : 0;

            return res.status(200).json({
                overview: {
                    totalInvestment: globalTotalInvestment,
                    totalRevenue: globalTotalRevenue,
                    netProfit: globalNetProfit,
                    roiPercentage: globalRoiPercentage
                },
                rentals: resultRentals
            });
        } catch (error) {
            console.error('Error fetching ROI dashboard:', error);
            return res.status(500).json({ message: 'Internal server error' });
        }
    }
}
