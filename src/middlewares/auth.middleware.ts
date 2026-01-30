import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from './error.middleware.js';
import { User } from '../models/User.js';
import { AppDataSource } from '../config/db.config.js';

export interface AuthRequest extends Request {
    user?: User;
}

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader?.startsWith('Bearer ')) {
            throw new AppError(401, 'Authentication required');
        }

        const token = authHeader.split(' ')[1];
        if (!token) {
            throw new AppError(401, 'Authentication required');
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };

        const userRepository = AppDataSource.getRepository(User);
        const user = await userRepository.findOne({ where: { id: decoded.userId } });

        if (!user) {
            throw new AppError(401, 'User no longer exists');
        }

        if (user.is_banned) {
            throw new AppError(403, 'Your account has been banned');
        }

        req.user = user;
        next();
    } catch (error) {
        if (error instanceof jwt.JsonWebTokenError) {
            return next(new AppError(401, 'Invalid or expired token'));
        }
        next(error);
    }
};

export const authorize = (...roles: string[]) => {
    return (req: AuthRequest, res: Response, next: NextFunction) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return next(new AppError(403, 'You do not have permission to perform this action'));
        }
        next();
    };
};
