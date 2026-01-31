import { Request, Response, NextFunction } from 'express';
import { authService } from '../../services/v1/auth.service.js';
import { oAuthService } from '../../services/v1/OAuthService.js';

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

export const verifyEmail = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { email, code } = req.body;
        const result = await authService.verifyEmail(email, code);

        res.status(200).json({
            success: true,
            ...result
        });
    } catch (error) {
        next(error);
    }
};

export const forgotPassword = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { email } = req.body;
        const result = await authService.forgotPassword(email);

        res.status(200).json({
            success: true,
            ...result
        });
    } catch (error) {
        next(error);
    }
};

export const resetPassword = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { email, code, newPassword } = req.body;
        const result = await authService.resetPassword(email, code, newPassword);

        res.status(200).json({
            success: true,
            ...result
        });
    } catch (error) {
        next(error);
    }
};

export const resendVerificationCode = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { email } = req.body;
        const result = await authService.resendVerificationCode(email);

        res.status(200).json({
            success: true,
            ...result
        });
    } catch (error) {
        next(error);
    }
};

export const resendResetCode = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { email } = req.body;
        const result = await authService.forgotPassword(email);

        res.status(200).json({
            success: true,
            ...result
        });
    } catch (error) {
        next(error);
    }
};

export const googleLogin = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { idToken } = req.body;
        const googleUser = await oAuthService.verifyGoogleToken(idToken);
        const { user, tokens } = await authService.socialLogin(
            'google',
            googleUser.id,
            googleUser.email,
            { name: googleUser.name, picture: googleUser.picture }
        );

        res.status(200).json({
            success: true,
            message: 'Logged in with Google successfully',
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

export const githubLogin = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { accessToken } = req.body;
        const githubUser = await oAuthService.verifyGithubToken(accessToken);
        const { user, tokens } = await authService.socialLogin(
            'github',
            githubUser.id,
            githubUser.email,
            { name: githubUser.name, picture: githubUser.picture }
        );

        res.status(200).json({
            success: true,
            message: 'Logged in with GitHub successfully',
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
