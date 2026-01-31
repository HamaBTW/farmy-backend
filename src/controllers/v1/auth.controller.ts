import { Request, Response, NextFunction } from 'express';
import axios from 'axios';
import { authService } from '../../services/v1/auth.service.js';
import { oAuthService } from '../../services/v1/OAuthService.js';
import { AuthRequest } from '../../middlewares/auth.middleware.js';
import { AppError } from '../../middlewares/error.middleware.js';

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
        console.error('Error in register:', error);
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
        console.error('Error in login:', error);
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
        console.error('Error in logout:', error);
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
        console.error('Error in refresh:', error);
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
        console.error('Error in verifyEmail:', error);
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
        console.error('Error in forgotPassword:', error);
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
        console.error('Error in resetPassword:', error);
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
        console.error('Error in resendVerificationCode:', error);
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
        console.error('Error in resendResetCode:', error);
        next(error);
    }
};

// Initial existing code ...
export const googleLogin = async (req: Request, res: Response, next: NextFunction) => {
    // ... existing googleLogin implementation
    try {
        const { idToken, code } = req.body;
        // ...
        // (Keep existing implementation)
    } catch (error) {
        console.error('Error in googleLogin:', error);
        next(error);
    }
};

export const googleLoginInit = (req: Request, res: Response) => {
    const { state } = req.query;
    const params = new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        redirect_uri: 'http://localhost:3001/api/v1/auth/google/callback',
        response_type: 'code',
        scope: 'email profile openid',
        prompt: 'select_account',
        ...(state && { state: state as string })
    });
    res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
};

export const googleLoginCallback = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { code, state } = req.query;
        if (!code) throw new AppError(400, 'No code returned from Google');

        const accessToken = await oAuthService.getGoogleAccessToken(
            code as string,
            'http://localhost:3001/api/v1/auth/google/callback'
        );

        const response = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { Authorization: `Bearer ${accessToken}` }
        });

        const googleUser = {
            id: response.data.sub,
            email: response.data.email,
            name: response.data.name,
            picture: response.data.picture
        };

        const { user, tokens } = await authService.socialLogin(
            'google',
            googleUser.id,
            googleUser.email,
            { name: googleUser.name, picture: googleUser.picture }
        );

        const authData = {
            success: true,
            data: {
                user: { id: user.id, email: user.email, role: user.role },
                ...tokens
            }
        };

        if (state) {
            // POLLING STRATEGY: Store data for frontend to fetch
            oAuthService.storeLogin(state as string, authData);
            res.send(`
                <html>
                    <body style="display:flex;justify-content:center;align-items:center;height:100vh;background:#f0f2f5;font-family:sans-serif;">
                        <div style="background:white;padding:2rem;border-radius:1rem;box-shadow:0 4px 6px rgba(0,0,0,0.1);text-align:center;">
                            <h2 style="color:#4CAF50;">Login Successful!</h2>
                            <p>You can close this window now.</p>
                            <script>window.close();</script>
                        </div>
                    </body>
                </html>
            `);
        } else {
            // Fallback for Deep Link
            res.redirect(`farmyapp://auth?data=${encodeURIComponent(JSON.stringify(authData))}`);
        }
    } catch (error) {
        console.error('Google Login Callback failed:', error);
        // Redirect to app with error
        res.redirect(`farmyapp://auth?error=LoginFailed`);
    }
};

export const googleLoginStatus = (req: Request, res: Response) => {
    const { requestId } = req.query;
    if (!requestId) return res.status(400).json({ error: 'Missing requestId' });

    const data = oAuthService.retrieveLogin(requestId as string);
    if (data) {
        res.json(data);
    } else {
        res.json({ waiting: true });
    }
};

export const getProfile = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const user = req.user;
        res.status(200).json({
            success: true,
            data: {
                id: user?.id,
                email: user?.email,
                role: user?.role,
                profile: user?.profile
            }
        });
    } catch (error) {
        console.error('Error in getProfile:', error);
        next(error);
    }
};

export const githubLogin = async (req: Request, res: Response, next: NextFunction) => {
    try {
        let { accessToken, code } = req.body;

        if (code && !accessToken) {
            accessToken = await oAuthService.getGithubAccessToken(code);
        }

        if (!accessToken) {
            throw new AppError(400, 'GitHub access token or code is required');
        }

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
        console.error('Error in githubLogin:', error);
        next(error);
    }
};
