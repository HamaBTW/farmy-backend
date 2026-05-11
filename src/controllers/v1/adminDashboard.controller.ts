import { Request, Response } from 'express';
import { AppDataSource } from '../../config/db.config.js';
import { User, UserRole, KYCStatus } from '../../models/User.js';
import { WorkerProfile, VerificationStatus } from '../../models/WorkerProfile.js';
import { Land } from '../../models/Land.js';
import { Transaction, TransactionStatus } from '../../models/Transaction.js';
import { Feedback, FeedbackStatus } from '../../models/Feedback.js';
import { JobApplication, JobApplicationStatus } from '../../models/JobApplication.js';
import { Delivery, DeliveryStatus } from '../../models/Delivery.js';
import { ProductPurchase } from '../../models/ProductPurchase.js';

export class AdminDashboardController {
    static async getDashboardStats(req: Request, res: Response) {
        try {
            // 1. KPI Stats
            const userRepo = AppDataSource.getRepository(User);
            const landRepo = AppDataSource.getRepository(Land);
            const transactionRepo = AppDataSource.getRepository(Transaction);
            const feedbackRepo = AppDataSource.getRepository(Feedback);

            const [totalUsers, totalLands, totalRevenueResult, pendingFeedbacks] = await Promise.all([
                userRepo.count(),
                landRepo.count({ where: { is_active: true } }),
                transactionRepo.createQueryBuilder('tx')
                    .select('SUM(tx.amount)', 'total')
                    .where('tx.status = :status', { status: TransactionStatus.SUCCEEDED })
                    .getRawOne(),
                feedbackRepo.count({ where: { status: FeedbackStatus.PENDING } })
            ]);

            const totalRevenue = Number(totalRevenueResult?.total) || 0;

            // 2. User Distribution Logic
            // Farmers: role == 'farmer'
            const farmerCount = await userRepo.count({ where: { role: UserRole.FARMER } });
            
            // Investors: role == 'investor'
            const investorCount = await userRepo.count({ where: { role: UserRole.INVESTOR } });
            
            // Workers: role == 'customer' AND verified worker profile
            const workerCount = await userRepo.createQueryBuilder('user')
                .innerJoin(WorkerProfile, 'wp', 'wp.user_id = user.id')
                .where('user.role = :role', { role: UserRole.CUSTOMER })
                .andWhere('wp.verification_status = :status', { status: VerificationStatus.VERIFIED })
                .getCount();
            
            // Real Customers: role == 'customer' AND (No profile OR Not verified)
            const totalCustomerCount = await userRepo.count({ where: { role: UserRole.CUSTOMER } });
            const customerCount = Math.max(0, totalCustomerCount - workerCount);

            const userDistribution = [
                { name: 'Farmers', value: farmerCount, color: '#90A53E' },
                { name: 'Investors', value: investorCount, color: '#4E7034' },
                { name: 'Workers', value: workerCount, color: '#F59E0B' },
                { name: 'Customers', value: customerCount, color: '#3B82F6' }
            ];

            // 3. Revenue Data (Last 30 days)
            const revenueHistory = await transactionRepo.createQueryBuilder('tx')
                .select("DATE_FORMAT(tx.createdAt, '%Y-%m-%d')", 'date')
                .addSelect('SUM(tx.amount)', 'value')
                .where('tx.status = :status', { status: TransactionStatus.SUCCEEDED })
                .andWhere('tx.createdAt >= DATE_SUB(NOW(), INTERVAL 30 DAY)')
                .groupBy('date')
                .orderBy('date', 'ASC')
                .getRawMany();

            // 4. Pending Actions Counts
            const [pendingKYCs, pendingJobApps, pendingDeliveries] = await Promise.all([
                userRepo.count({ where: { kyc_status: KYCStatus.PENDING } }),
                AppDataSource.getRepository(JobApplication).count({ where: { status: JobApplicationStatus.PENDING } }),
                AppDataSource.getRepository(Delivery).count({ where: { delivery_status: DeliveryStatus.ORDER_CREATED } })
            ]);

            // 5. Recent Activity
            // This is a simplified "recent activity" aggregator
            const recentPurchases = await AppDataSource.getRepository(ProductPurchase).find({
                order: { createdAt: 'DESC' },
                take: 5,
                relations: ['product', 'buyer']
            });

            const activities = recentPurchases.map(p => ({
                id: p.id,
                type: 'order',
                user: p.buyer?.profile?.name || 'Unknown User',
                action: `placed an order for ${p.product_name}`,
                time: p.createdAt,
                color: 'text-blue-500 bg-blue-500/10'
            }));

            res.status(200).json({
                success: true,
                data: {
                    kpis: {
                        totalUsers,
                        totalRevenue,
                        activeLands: totalLands,
                        pendingActions: pendingKYCs + pendingFeedbacks + pendingJobApps + pendingDeliveries
                    },
                    userDistribution,
                    revenueHistory: revenueHistory.map(h => ({
                        name: h.date,
                        value: Number(h.value)
                    })),
                    attentionRequired: [
                        { id: 'kyc', title: 'Worker KYCs', count: pendingKYCs, color: 'amber' },
                        { id: 'feedback', title: 'Feedbacks', count: pendingFeedbacks, color: 'blue' },
                        { id: 'jobs', title: 'Job Apps', count: pendingJobApps, color: 'indigo' },
                        { id: 'deliveries', title: 'Deliveries', count: pendingDeliveries, color: 'emerald' }
                    ],
                    activities
                }
            });

        } catch (error) {
            console.error('Error fetching admin dashboard stats:', error);
            res.status(500).json({ success: false, message: 'Internal server error' });
        }
    }
}
