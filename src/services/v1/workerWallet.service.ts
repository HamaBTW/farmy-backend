import { AppDataSource } from '../../config/db.config.js';
import { User } from '../../models/User.js';
import { WorkerBalance } from '../../models/WorkerBalance.js';
import { Transaction, TransactionStatus, TransactionType } from '../../models/Transaction.js';
import { UserSubscription, SubscriptionStatus } from '../../models/UserSubscription.js';
import { AppError } from '../../middlewares/error.middleware.js';
import { stripeService } from './StripeService.js';
import { firebaseService } from './firebase.service.js';
import { NotificationType } from '../../models/Notification.js';
import logger from '../../utils/logger.js';

type WalletTransactionDto = {
    id: string;
    createdAt: Date;
    updatedAt: Date;
    amount: number;
    currency: string;
    status: TransactionStatus;
    type: TransactionType;
    metadata: Record<string, any> | null;
};

class WorkerWalletService {
    private workerBalanceRepo = AppDataSource.getRepository(WorkerBalance);
    private transactionRepo = AppDataSource.getRepository(Transaction);
    private userRepo = AppDataSource.getRepository(User);
    private userSubscriptionRepo = AppDataSource.getRepository(UserSubscription);

    private readonly walletTransactionColumns = [
        'tx.id',
        'tx.createdAt',
        'tx.updatedAt',
        'tx.amount',
        'tx.currency',
        'tx.status',
        'tx.type',
        'tx.metadata',
    ];

    private toWalletTransactionDto(transaction: Transaction): WalletTransactionDto {
        return {
            id: transaction.id,
            createdAt: transaction.createdAt,
            updatedAt: transaction.updatedAt,
            amount: Number(transaction.amount),
            currency: transaction.currency,
            status: transaction.status,
            type: transaction.type,
            metadata: transaction.metadata && typeof transaction.metadata === 'object' ? transaction.metadata : null,
        };
    }

    private async getOrEnsureWorkerBalance(workerId: string): Promise<WorkerBalance> {
        let balance = await this.workerBalanceRepo.findOne({ where: { worker_id: workerId } });
        if (!balance) {
            balance = this.workerBalanceRepo.create({
                worker_id: workerId,
                available_balance: 0,
                pending_balance: 0
            });
            await this.workerBalanceRepo.save(balance);
        }
        return balance;
    }

    async getWalletOverview(workerId: string) {
        const balance = await this.getOrEnsureWorkerBalance(workerId);

        // Calculate lifetime earnings (sum of all TASK_EARNING and SALARY transactions that succeeded)
        const earnings = await this.transactionRepo
            .createQueryBuilder('tx')
            .where('tx.worker_id = :workerId', { workerId })
            .andWhere('tx.status = :status', { status: TransactionStatus.SUCCEEDED })
            .andWhere('tx.type IN (:...types)', { types: [TransactionType.TASK_EARNING, TransactionType.SALARY_UPFRONT, TransactionType.SALARY_RECURRING] })
            .select('SUM(tx.amount)', 'total')
            .getRawOne();

        return {
            available_balance: Number(balance.available_balance),
            pending_balance: Number(balance.pending_balance),
            lifetime_earnings: Number(earnings.total || 0)
        };
    }

    async getTransactionHistory(workerId: string, type?: string, limit: number = 20, offset: number = 0) {
        const query = this.transactionRepo.createQueryBuilder('tx')
            .select(this.walletTransactionColumns)
            .where('tx.worker_id = :workerId', { workerId });

        if (type === 'earnings') {
            query.andWhere('tx.type IN (:...types)', { types: [TransactionType.TASK_EARNING, TransactionType.SALARY_UPFRONT, TransactionType.SALARY_RECURRING] });
        } else if (type === 'withdrawals') {
            query.andWhere('tx.type = :type', { type: TransactionType.WITHDRAWAL });
        }

        query.orderBy('tx.createdAt', 'DESC')
             .skip(offset)
             .take(limit);

        const [transactions, total] = await query.getManyAndCount();

        return {
            transactions: transactions.map((transaction) => this.toWalletTransactionDto(transaction)),
            total,
            limit,
            offset
        };
    }

    async getTaskEarnings(workerId: string, limit: number = 20, offset: number = 0) {
        // Specifically fetch completed task reward transactions.
        const query = this.transactionRepo.createQueryBuilder('tx')
            .select(this.walletTransactionColumns)
            .where('tx.worker_id = :workerId', { workerId })
            .andWhere('tx.type = :type', { type: TransactionType.TASK_EARNING })
            .andWhere('tx.status = :status', { status: TransactionStatus.SUCCEEDED })
            .orderBy('tx.createdAt', 'DESC')
            .skip(offset)
            .take(limit);

        const [transactions, total] = await query.getManyAndCount();

        return {
            transactions: transactions.map((transaction) => this.toWalletTransactionDto(transaction)),
            total,
            limit,
            offset
        };
    }

    async requestWithdrawal(workerId: string, amount: number) {
        const normalizedAmount = Math.round(Number(amount) * 100) / 100;

        if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
            throw new AppError(400, 'Amount must be greater than zero');
        }

        const balance = await this.getOrEnsureWorkerBalance(workerId);
        if (Number(balance.available_balance) < normalizedAmount) {
            throw new AppError(400, 'Insufficient available balance');
        }

        const user = await this.userRepo.findOne({ where: { id: workerId } });
        if (!user) throw new AppError(404, 'User not found');

        // Check if user has Worker Plus subscription for instant payout
        const subscription = await this.userSubscriptionRepo.findOne({
            where: {
                user_id: workerId,
                status: SubscriptionStatus.ACTIVE
            },
            relations: ['plan']
        });

        const isWorkerPlus = subscription?.plan?.name?.toLowerCase().includes('plus') || 
                             (subscription?.entitlements_snapshot?.['instant_withdrawal'] === true);

        // Begin transaction logic. In a real app, use a DB transaction.
        // Deduct balance first
        balance.available_balance = Number(balance.available_balance) - normalizedAmount;
        await this.workerBalanceRepo.save(balance);

        // Create pending transaction
        const transaction = this.transactionRepo.create({
            worker_id: workerId,
            amount: normalizedAmount,
            currency: 'usd',
            status: TransactionStatus.PENDING,
            type: TransactionType.WITHDRAWAL,
            metadata: {
                is_instant: isWorkerPlus,
                requested_at: new Date().toISOString()
            }
        });
        await this.transactionRepo.save(transaction);

        try {
            // Stripe Integration for payouts (Mocked if Stripe account not fully set up)
            // Example of real stripe transfer:
            /*
            if (user.stripe_account_id) {
                const transfer = await stripeService.stripe.transfers.create({
                    amount: Math.round(normalizedAmount * 100),
                    currency: 'usd',
                    destination: user.stripe_account_id,
                });
                transaction.stripe_transfer_id = transfer.id;
            } else {
               throw new Error('Stripe connected account not found');
            }
            */

            // For now, we mock the Stripe success since we don't know the Stripe Connect setup details
            const transferId = `mock_transfer_${Date.now()}`;
            transaction.status = TransactionStatus.SUCCEEDED;
            transaction.stripe_transfer_id = transferId;
            transaction.metadata = {
                ...(transaction.metadata || {}),
                stripe_transfer_id: transferId,
                processed_at: new Date().toISOString(),
            };
            await this.transactionRepo.save(transaction);

            // Notify user
            firebaseService.sendToUsers(
                workerId,
                'Withdrawal Successful 💰',
                `Your withdrawal of $${normalizedAmount} has been processed successfully.`,
                { type: 'withdrawal_success', transaction_id: transaction.id },
                NotificationType.WALLET
            ).catch(err => logger.error('Failed to notify worker of withdrawal success:', err));

            return {
                success: true,
                message: 'Withdrawal processed successfully',
                transaction
            };
        } catch (error: any) {
            // Rollback balance on failure
            balance.available_balance = Number(balance.available_balance) + normalizedAmount;
            await this.workerBalanceRepo.save(balance);

            transaction.status = TransactionStatus.FAILED;
            transaction.metadata = { ...transaction.metadata, error: error.message };
            await this.transactionRepo.save(transaction);

            throw new AppError(500, 'Withdrawal processing failed. Balance refunded.');
        }
    }
}

export const workerWalletService = new WorkerWalletService();
