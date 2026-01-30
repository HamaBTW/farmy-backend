import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { AppDataSource } from '../config/db.config.js';
import { User, UserRole } from '../models/User.js';
import { RefreshToken } from '../models/RefreshToken.js';
import { AppError } from '../middlewares/error.middleware.js';
import logger from '../utils/logger.js';

const generateTokens = async (user: User) => {
    const accessToken = jwt.sign(
        { userId: user.id, role: user.role },
        process.env.JWT_SECRET!,
        { expiresIn: '15m' }
    );

    const refreshTokenValue = jwt.sign(
        { userId: user.id },
        process.env.JWT_SECRET!,
        { expiresIn: '7d' }
    );

    const refreshTokenRepository = AppDataSource.getRepository(RefreshToken);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const refreshToken = refreshTokenRepository.create({
        token: refreshTokenValue,
        userId: user.id,
        expiresAt
    });

    await refreshTokenRepository.save(refreshToken);

    return { accessToken, refreshToken: refreshTokenValue };
};

export const register = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { email, password, phone, role, profile, location } = req.body;

        const userRepository = AppDataSource.getRepository(User);
        const existingUser = await userRepository.findOne({ where: { email } });

        if (existingUser) {
            throw new AppError(400, 'Email already in use');
        }

        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);

        const user = userRepository.create({
            email,
            password_hash,
            phone,
            role: role || UserRole.CUSTOMER,
            profile,
            location,
            is_verified: false
        });

        await userRepository.save(user);

        const tokens = await generateTokens(user);

        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            data: {
                user: {
                    id: user.id,
                    email: user.email,
                    role: user.role
                },
                ...tokens
            }
        });
    } catch (error) {
        next(error);
    }
};

export const login = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { email, password } = req.body;

        const userRepository = AppDataSource.getRepository(User);
        const user = await userRepository.findOne({
            where: { email },
            select: ['id', 'email', 'password_hash', 'role', 'is_banned']
        });

        if (!user || !(await bcrypt.compare(password, user.password_hash))) {
            throw new AppError(401, 'Invalid email or password');
        }

        if (user.is_banned) {
            throw new AppError(403, 'Your account has been banned');
        }

        const tokens = await generateTokens(user);

        res.status(200).json({
            success: true,
            message: 'Logged in successfully',
            data: {
                user: {
                    id: user.id,
                    email: user.email,
                    role: user.role
                },
                ...tokens
            }
        });
    } catch (error) {
        next(error);
    }
};

export const logout = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) {
            throw new AppError(400, 'Refresh token required');
        }

        const refreshTokenRepository = AppDataSource.getRepository(RefreshToken);
        await refreshTokenRepository.delete({ token: refreshToken });

        res.status(200).json({
            success: true,
            message: 'Logged out successfully'
        });
    } catch (error) {
        next(error);
    }
};

export const refresh = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { refreshToken: tokenValue } = req.body;
        if (!tokenValue) {
            throw new AppError(400, 'Refresh token required');
        }

        const refreshTokenRepository = AppDataSource.getRepository(RefreshToken);
        const refreshToken = await refreshTokenRepository.findOne({
            where: { token: tokenValue },
            relations: ['user']
        });

        if (!refreshToken || refreshToken.expiresAt < new Date()) {
            if (refreshToken) await refreshTokenRepository.remove(refreshToken);
            throw new AppError(401, 'Invalid or expired refresh token');
        }

        if (refreshToken.user.is_banned) {
            throw new AppError(403, 'Your account has been banned');
        }

        // Reuse generateTokens but maybe delete old one first
        await refreshTokenRepository.remove(refreshToken);
        const tokens = await generateTokens(refreshToken.user);

        res.status(200).json({
            success: true,
            data: tokens
        });
    } catch (error) {
        next(error);
    }
};
