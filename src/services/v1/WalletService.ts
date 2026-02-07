import { AppDataSource } from '../../config/db.config.js';
import { User } from '../../models/User.js';
import { PaymentMethod, PaymentMethodType } from '../../models/PaymentMethod.js';
import { AppError } from '../../middlewares/error.middleware.js';

export class WalletService {
    private userRepository = AppDataSource.getRepository(User);
    private paymentMethodRepository = AppDataSource.getRepository(PaymentMethod);

    async getWalletStatus(userId: string) {
        const user = await this.userRepository.findOne({
            where: { id: userId },
            select: ['id', 'credits']
        });

        if (!user) {
            throw new AppError(404, 'User not found');
        }

        const paymentMethods = await this.paymentMethodRepository.find({
            where: { user_id: userId },
            order: { is_default: 'DESC', createdAt: 'DESC' }
        });

        return {
            credits: user.credits,
            payment_methods: paymentMethods
        };
    }

    async addPaymentMethod(userId: string, data: {
        type: PaymentMethodType;
        last4: string;
        brand: string;
        expiry_month: string;
        expiry_year: string;
        is_default?: boolean;
    }) {
        // If this is the first payment method, make it default
        const count = await this.paymentMethodRepository.count({ where: { user_id: userId } });
        const isDefault = count === 0 ? true : (data.is_default || false);

        if (isDefault) {
            // Unset other defaults
            await this.paymentMethodRepository.update({ user_id: userId }, { is_default: false });
        }

        const paymentMethod = this.paymentMethodRepository.create({
            ...data,
            user_id: userId,
            is_default: isDefault
        });

        return await this.paymentMethodRepository.save(paymentMethod);
    }

    async chargeCredits(userId: string, amount: number) {
        if (amount <= 0) {
            throw new AppError(400, 'Amount must be greater than zero');
        }

        const user = await this.userRepository.findOne({ where: { id: userId } });
        if (!user) {
            throw new AppError(404, 'User not found');
        }

        // Mock payment processing logic here...
        // For now, we just increase the credits
        user.credits = Number(user.credits) + amount;

        return await this.userRepository.save(user);
    }

    async deletePaymentMethod(userId: string, methodId: string) {
        const method = await this.paymentMethodRepository.findOne({
            where: { id: methodId, user_id: userId }
        });

        if (!method) {
            throw new AppError(404, 'Payment method not found');
        }

        await this.paymentMethodRepository.remove(method);

        // If we deleted the default one, pick another one as default
        if (method.is_default) {
            const nextMethod = await this.paymentMethodRepository.findOne({
                where: { user_id: userId }
            });
            if (nextMethod) {
                nextMethod.is_default = true;
                await this.paymentMethodRepository.save(nextMethod);
            }
        }

        return { success: true };
    }
}

export const walletService = new WalletService();
