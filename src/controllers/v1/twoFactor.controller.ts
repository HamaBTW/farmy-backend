import { Request, Response } from 'express';
import { AppDataSource } from '../../config/db.config.js';
import { User } from '../../models/User.js';
import { twoFactorService } from '../../services/v1/twoFactor.service.js';
import { AppError } from '../../middlewares/error.middleware.js';

const userRepository = AppDataSource.getRepository(User);

export const setup2FA = async (req: Request, res: Response) => {
    const userId = (req as any).user.id;
    const user = await userRepository.findOne({
        where: { id: userId },
        select: ['id', 'email', 'is_two_factor_enabled']
    });

    if (!user) {
        throw new AppError(404, 'User not found');
    }

    if (user.is_two_factor_enabled) {
        throw new AppError(400, '2FA is already enabled');
    }

    const secret = twoFactorService.generateSecret();
    const otpUri = twoFactorService.generateOTPUri(user.email, 'Farmy', secret);

    // Temporarily save secret to user (not enabled yet)
    console.log('Saving 2FA secret for user:', userId);
    await userRepository.update(userId, { two_factor_secret: secret });
    console.log('2FA secret saved in DB');

    res.json({
        secret,
        otpUri
    });
};

export const verifyAndEnable2FA = async (req: Request, res: Response) => {
    const userId = (req as any).user.id;
    const { token } = req.body;

    if (!token) {
        throw new AppError(400, 'Token is required');
    }

    const user = await userRepository.findOne({
        where: { id: userId },
        select: ['id', 'two_factor_secret', 'is_two_factor_enabled']
    });

    if (!user || !user.two_factor_secret) {
        throw new AppError(400, '2FA setup not initiated');
    }

    const isValid = twoFactorService.verifyToken(token, user.two_factor_secret);

    if (!isValid) {
        throw new AppError(400, 'Invalid 2FA token');
    }

    console.log('Enabling 2FA for user:', userId);
    await userRepository.update(userId, { is_two_factor_enabled: true });
    console.log('2FA enabled in DB');

    res.json({ message: '2FA enabled successfully' });
};

export const disable2FA = async (req: Request, res: Response) => {
    const userId = (req as any).user.id;
    const { token } = req.body;

    const user = await userRepository.findOne({
        where: { id: userId },
        select: ['id', 'two_factor_secret', 'is_two_factor_enabled']
    });

    if (!user || !user.is_two_factor_enabled || !user.two_factor_secret) {
        throw new AppError(400, '2FA is not enabled');
    }

    const isValid = twoFactorService.verifyToken(token, user.two_factor_secret);

    if (!isValid) {
        throw new AppError(400, 'Invalid 2FA token');
    }

    console.log('Disabling 2FA for user:', userId);
    await userRepository.update(userId, {
        is_two_factor_enabled: false,
        two_factor_secret: null
    });
    console.log('2FA disabled in DB');

    res.json({ message: '2FA disabled successfully' });
};
