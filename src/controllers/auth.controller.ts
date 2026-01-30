import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service.js';

export const register = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { user, tokens } = await authService.registerUser(req.body);

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
        const { user, tokens } = await authService.loginUser(req.body);

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
        await authService.logoutUser(refreshToken);

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
        const { refreshToken } = req.body;
        const tokens = await authService.refreshTokens(refreshToken);

        res.status(200).json({
            success: true,
            data: tokens
        });
    } catch (error) {
        next(error);
    }
};
