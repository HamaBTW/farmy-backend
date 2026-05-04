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
import { Delivery, DeliveryStatus } from '../../models/Delivery.js';

/**
 * Product Revenue Info for detailed breakdown
 */
interface ProductRevenueInfo {
    productId: string;
    productName: string;
    quantitySold: number;
    unitPrice: number;
    totalRevenue: number;
    profitMargin: number;
    saleDate: Date;
}

/**
 * ROI Calculation Result for a single rental
 */
interface RentalRoiResult {
    id: string;
    landId: string;
    landName: string;
    costs: {
        rent: number;
        items: number;
        workers: number;
        total: number;
    };
    revenue: number;
    productRevenue: number;
    netProfit: number;
    roiPercentage: number;
    productsSoldCount: number;
    productBreakdown: ProductRevenueInfo[];
}

/**
 * ROI Overview Statistics
 */
interface RoiOverview {
    totalInvestment: number;
    totalRevenue: number;
    productRevenue: number;
    rentalRevenue: number;
    netProfit: number;
    roiPercentage: number;
    totalProductsSold: number;
    averageProductMargin: number;
    lastCalculated: string;
    calculationVersion: string;
}

export class RoiController {
    static readonly CALCULATION_VERSION = '2.0';

    /**
     * Get investor ROI dashboard with comprehensive product revenue tracking
     * Only includes products with DELIVERED status in revenue calculations
     */
    static async getInvestorRoiDashboard(req: Request, res: Response) {
        const calculationStartTime = new Date();
        
        try {
            const userId = (req as any).user.id;

            // Fetch all land rentals for this investor with land details
            const landRentalRepository = AppDataSource.getRepository(LandRental);
            const rentals = await landRentalRepository.find({
                where: { investor_id: userId },
                relations: ['land']
            });

            // Return empty dashboard if no rentals
            if (!rentals || rentals.length === 0) {
                return res.status(200).json({
                    overview: {
                        totalInvestment: 0,
                        totalRevenue: 0,
                        productRevenue: 0,
                        rentalRevenue: 0,
                        netProfit: 0,
                        roiPercentage: 0,
                        totalProductsSold: 0,
                        averageProductMargin: 0,
                        lastCalculated: calculationStartTime.toISOString(),
                        calculationVersion: RoiController.CALCULATION_VERSION
                    },
                    rentals: []
                });
            }

            const itemRequestRepo = AppDataSource.getRepository(ItemRequest);
            const transactionRepo = AppDataSource.getRepository(Transaction);
            const purchaseRepo = AppDataSource.getRepository(ProductPurchase);
            const deliveryRepo = AppDataSource.getRepository(Delivery);
            const productRepo = AppDataSource.getRepository(Product);

            const resultRentals: RentalRoiResult[] = [];
            let globalTotalInvestment = 0;
            let globalProductRevenue = 0;
            let globalBaseRevenue = 0;
            let globalTotalProductsSold = 0;
            let totalMarginSum = 0;
            let marginCount = 0;

            for (const rental of rentals) {
                // ===== CALCULATE COSTS =====
                
                // 1. Calculate rent cost based on elapsed months
                const totalRentCost = RoiController.calculateRentCost(rental);

                // 2. Sum approved item request costs for this land
                const totalItemCost = await RoiController.calculateItemCosts(
                    itemRequestRepo, 
                    rental.land_id, 
                    userId
                );

                // 3. Sum worker salary costs for this land
                const totalWorkerCost = await RoiController.calculateWorkerCosts(
                    transactionRepo, 
                    rental.land_id, 
                    userId
                );

                // ===== CALCULATE REVENUES (DELIVERED PRODUCTS ONLY) =====
                
                // 4. Get product revenue from DELIVERED orders with detailed breakdown
                // Note: Products can be linked via land_id (farmer-owned) or land_rental_id (investor-rented)
                const productRevenueResult = await RoiController.calculateProductRevenue(
                    purchaseRepo,
                    deliveryRepo,
                    productRepo,
                    rental.land_id,
                    rental.id,
                    userId
                );

                const productRevenue = productRevenueResult.totalRevenue;
                const productBreakdown = productRevenueResult.breakdown;
                const productsSoldCount = productBreakdown.length;

                // Calculate average margin from product breakdown
                for (const product of productBreakdown) {
                    if (product.profitMargin > 0) {
                        totalMarginSum += product.profitMargin;
                        marginCount++;
                    }
                }

                // Base revenue (placeholder for future revenue streams like crop yield, etc.)
                const baseRevenue = 0;
                const totalRevenue = baseRevenue + productRevenue;

                // ===== CALCULATE PROFIT METRICS =====
                const totalInvestment = totalRentCost + totalItemCost + totalWorkerCost;
                const netProfit = totalRevenue - totalInvestment;
                const roiPercentage = totalInvestment > 0 ? (netProfit / totalInvestment) * 100 : 0;

                // Accumulate global totals
                globalTotalInvestment += totalInvestment;
                globalProductRevenue += productRevenue;
                globalBaseRevenue += baseRevenue;
                globalTotalProductsSold += productsSoldCount;

                resultRentals.push({
                    id: rental.id,
                    landId: rental.land_id,
                    landName: rental.land.name,
                    costs: {
                        rent: Number(totalRentCost.toFixed(2)),
                        items: Number(totalItemCost.toFixed(2)),
                        workers: Number(totalWorkerCost.toFixed(2)),
                        total: Number(totalInvestment.toFixed(2))
                    },
                    revenue: Number(totalRevenue.toFixed(2)),
                    productRevenue: Number(productRevenue.toFixed(2)),
                    netProfit: Number(netProfit.toFixed(2)),
                    roiPercentage: Number(roiPercentage.toFixed(2)),
                    productsSoldCount,
                    productBreakdown: productBreakdown.map(p => ({
                        ...p,
                        unitPrice: Number(p.unitPrice.toFixed(2)),
                        totalRevenue: Number(p.totalRevenue.toFixed(2)),
                        profitMargin: Number(p.profitMargin.toFixed(2))
                    }))
                });
            }

            // Calculate global metrics
            const globalTotalRevenue = globalBaseRevenue + globalProductRevenue;
            const globalNetProfit = globalTotalRevenue - globalTotalInvestment;
            const globalRoiPercentage = globalTotalInvestment > 0 
                ? (globalNetProfit / globalTotalInvestment) * 100 
                : 0;
            const averageProductMargin = marginCount > 0 
                ? totalMarginSum / marginCount 
                : 0;

            const overview: RoiOverview = {
                totalInvestment: Number(globalTotalInvestment.toFixed(2)),
                totalRevenue: Number(globalTotalRevenue.toFixed(2)),
                productRevenue: Number(globalProductRevenue.toFixed(2)),
                rentalRevenue: Number(globalBaseRevenue.toFixed(2)),
                netProfit: Number(globalNetProfit.toFixed(2)),
                roiPercentage: Number(globalRoiPercentage.toFixed(2)),
                totalProductsSold: globalTotalProductsSold,
                averageProductMargin: Number(averageProductMargin.toFixed(2)),
                lastCalculated: calculationStartTime.toISOString(),
                calculationVersion: RoiController.CALCULATION_VERSION
            };

            return res.status(200).json({
                overview,
                rentals: resultRentals
            });

        } catch (error) {
            console.error('Error fetching ROI dashboard:', error);
            
            // Log detailed error for debugging
            if (error instanceof Error) {
                console.error('Stack trace:', error.stack);
            }
            
            return res.status(500).json({ 
                message: 'Failed to calculate ROI dashboard',
                error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
            });
        }
    }

    // ===== HELPER METHODS =====

    /**
     * Calculate rent cost based on elapsed months
     */
    private static calculateRentCost(rental: LandRental): number {
        const start = new Date(rental.rental_start_date);
        const end = rental.rental_end_date ? new Date(rental.rental_end_date) : new Date();
        
        let monthsPassed = (end.getFullYear() - start.getFullYear()) * 12 + 
                          (end.getMonth() - start.getMonth());
        
        // Ensure at least 1 month is charged
        if (monthsPassed < 1) monthsPassed = 1;

        return Number(rental.monthly_rent) * monthsPassed;
    }

    /**
     * Calculate total item costs for a land
     */
    private static async calculateItemCosts(
        itemRequestRepo: any,
        landId: string,
        userId: string
    ): Promise<number> {
        const itemQuery = await itemRequestRepo
            .createQueryBuilder('item')
            .select('SUM(item.price_paid)', 'total_item_cost')
            .where('item.land_id = :landId', { landId })
            .andWhere('item.user_id = :userId', { userId })
            .andWhere('item.status = :status', { status: ItemRequestStatus.APPROVED })
            .getRawOne();
        
        return Number(itemQuery?.total_item_cost) || 0;
    }

    /**
     * Calculate total worker costs for a land
     */
    private static async calculateWorkerCosts(
        transactionRepo: any,
        landId: string,
        userId: string
    ): Promise<number> {
        const workerQuery = await transactionRepo
            .createQueryBuilder('tx')
            .select('SUM(tx.amount)', 'total_worker_cost')
            .innerJoin(LandWorkerContract, 'contract', 'tx.contract_id = contract.id')
            .where('contract.land_id = :landId', { landId })
            .andWhere('tx.investor_id = :userId', { userId })
            .andWhere('tx.status = :status', { status: TransactionStatus.SUCCEEDED })
            .getRawOne();
        
        return Number(workerQuery?.total_worker_cost) || 0;
    }

    /**
     * Calculate product revenue from DELIVERED orders only
     * Includes detailed breakdown per product
     * 
     * Note: Products can be linked to land via:
     * - land_id: Direct ownership (farmers)
     * - land_rental_id: Rental-based (investors)
     */
    private static async calculateProductRevenue(
        purchaseRepo: any,
        deliveryRepo: any,
        productRepo: any,
        landId: string,
        landRentalId: string,
        sellerId: string
    ): Promise<{ totalRevenue: number; breakdown: ProductRevenueInfo[] }> {
        
        // Get all product purchases linked to this land where seller matches
        // AND delivery status is DELIVERED
        // Products can be linked via land_id OR land_rental_id
        console.log(`[ROI] Calculating product revenue for landId: ${landId}, rentalId: ${landRentalId}, sellerId: ${sellerId}`);
        
        const purchases = await purchaseRepo
            .createQueryBuilder('purchase')
            .select([
                'purchase.id as purchaseId',
                'purchase.product_id as productId',
                'purchase.product_name as productName',
                'purchase.quantity as quantity',
                'purchase.total_price as totalPrice',
                'purchase.createdAt as purchaseDate',
                'product.price as productUnitPrice',
                'product.quantity as productStockQuantity',
                'product.land_id as productLandId',
                'product.land_rental_id as productRentalId'
            ])
            .innerJoin(Product, 'product', 'purchase.product_id = product.id')
            .innerJoin(
                Delivery, 
                'delivery', 
                'delivery.order_id = purchase.id AND delivery.delivery_status = :deliveredStatus',
                { deliveredStatus: DeliveryStatus.DELIVERED }
            )
            .where('purchase.seller_id = :sellerId', { sellerId })
            .andWhere(
                '(product.land_id = :landId OR product.land_rental_id = :landRentalId)',
                { landId, landRentalId }
            )
            .getRawMany();
        
        console.log(`[ROI] Found ${purchases.length} delivered purchases for land ${landId}`);
        if (purchases.length > 0) {
            console.log(`[ROI] Purchase details:`, purchases.map((p: any) => ({
                productId: p.productId,
                productName: p.productName,
                totalPrice: p.totalPrice,
                productLandId: p.productLandId,
                productRentalId: p.productRentalId
            })));
        }

        let totalRevenue = 0;
        const breakdown: ProductRevenueInfo[] = [];

        for (const purchase of purchases) {
            const revenue = Number(purchase.totalPrice) || 0;
            totalRevenue += revenue;

            // Calculate profit margin: (revenue - cost) / revenue * 100
            // Using unit price as proxy for cost basis
            const unitPrice = Number(purchase.productUnitPrice) || 0;
            const quantity = Number(purchase.quantity) || 0;
            const estimatedCost = unitPrice * quantity * 0.6; // Assume 60% cost ratio as estimate
            const profitMargin = revenue > 0 
                ? ((revenue - estimatedCost) / revenue) * 100 
                : 0;

            breakdown.push({
                productId: purchase.productId || '',
                productName: purchase.productName || 'Unknown Product',
                quantitySold: Number(purchase.quantity) || 0,
                unitPrice: Number(purchase.productUnitPrice) || 0,
                totalRevenue: revenue,
                profitMargin: Math.max(0, profitMargin),
                saleDate: new Date(purchase.purchaseDate)
            });
        }

        // Sort by sale date (newest first)
        breakdown.sort((a, b) => b.saleDate.getTime() - a.saleDate.getTime());

        return { totalRevenue, breakdown };
    }
}
