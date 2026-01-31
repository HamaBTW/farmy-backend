import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { AppDataSource } from '../../config/db.config.js';
import { User, UserRole } from '../../models/User.js';
import { RefreshToken } from '../../models/RefreshToken.js';
import { AppError } from '../../middlewares/error.middleware.js';
import { emailService } from './EmailService.js';

class AuthService {
    private userRepository = AppDataSource.getRepository(User);
    private refreshTokenRepository = AppDataSource.getRepository(RefreshToken);

    private generateCode(): string {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }

    async generateTokens(user: User) {
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

        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        const refreshToken = this.refreshTokenRepository.create({
            token: refreshTokenValue,
            userId: user.id,
            expiresAt
        });

        await this.refreshTokenRepository.save(refreshToken);

        return { accessToken, refreshToken: refreshTokenValue };
    }

    async registerUser(userData: any) {
        const { email, password, phone, role, profile, location } = userData;

        const existingUser = await this.userRepository.findOne({ where: { email } });
        if (existingUser) {
            throw new AppError(400, 'Email already in use');
        }

        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);

        const verificationCode = this.generateCode();
        const verificationExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

        const user = this.userRepository.create({
            email,
            password_hash,
            phone,
            role: role || UserRole.CUSTOMER,
            profile,
            location,
            is_verified: false,
            verification_code: verificationCode,
            verification_code_expires: verificationExpires
        });

        await this.userRepository.save(user);

        // Send verification email
        try {
            await emailService.sendVerificationCode(email, verificationCode);
        } catch (error) {
            console.error('Failed to send verification email:', error);
            // We don't throw here to avoid failing registration if email fails
            // But in production, you might want to handle this more strictly
        }

        const tokens = await this.generateTokens(user);

        return { user, tokens };
    }

    async verifyEmail(email: string, code: string) {
        const user = await this.userRepository.findOne({ where: { email } });

        if (!user) {
            throw new AppError(404, 'User not found');
        }

        if (user.is_verified) {
            throw new AppError(400, 'Email already verified');
        }

        if (user.verification_code !== code || (user.verification_code_expires && user.verification_code_expires < new Date())) {
            throw new AppError(400, 'Invalid or expired verification code');
        }

        user.is_verified = true;
        user.verification_code = null;
        user.verification_code_expires = null;

        await this.userRepository.save(user);

        return { message: 'Email verified successfully' };
    }

    async resendVerificationCode(email: string) {
        const user = await this.userRepository.findOne({ where: { email } });

        if (!user) {
            throw new AppError(404, 'User not found');
        }

        if (user.is_verified) {
            throw new AppError(400, 'Email already verified');
        }

        const verificationCode = this.generateCode();
        const verificationExpires = new Date(Date.now() + 15 * 60 * 1000);

        user.verification_code = verificationCode;
        user.verification_code_expires = verificationExpires;

        await this.userRepository.save(user);

        try {
            await emailService.sendVerificationCode(email, verificationCode);
        } catch (error) {
            console.error('Failed to send verification email:', error);
            throw new AppError(500, 'Failed to send verification email');
        }

        return { message: 'Verification code resent successfully' };
    }

    async forgotPassword(email: string) {
        const user = await this.userRepository.findOne({ where: { email } });

        if (!user) {
            throw new AppError(404, 'User not found');
        }

        const resetCode = this.generateCode();
        const resetExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

        user.reset_password_code = resetCode;
        user.reset_password_code_expires = resetExpires;

        await this.userRepository.save(user);

        try {
            await emailService.sendPasswordResetCode(email, resetCode);
        } catch (error) {
            console.error('Failed to send reset email:', error);
            throw new AppError(500, 'Failed to send reset email');
        }

        return { message: 'Password reset code sent to your email' };
    }

    async resetPassword(email: string, code: string, newPassword: any) {
        const user = await this.userRepository.findOne({
            where: { email },
            select: ['id', 'email', 'reset_password_code', 'reset_password_code_expires', 'password_hash']
        });

        if (!user) {
            throw new AppError(404, 'User not found');
        }

        if (user.reset_password_code !== code || (user.reset_password_code_expires && user.reset_password_code_expires < new Date())) {
            throw new AppError(400, 'Invalid or expired reset code');
        }

        const salt = await bcrypt.genSalt(10);
        user.password_hash = await bcrypt.hash(newPassword, salt);
        user.reset_password_code = null;
        user.reset_password_code_expires = null;

        await this.userRepository.save(user);

        return { message: 'Password reset successfully' };
    }

    async loginUser(credentials: any) {
        const { email, password } = credentials;

        const user = await this.userRepository.findOne({
            where: { email },
            select: ['id', 'email', 'password_hash', 'role', 'is_banned', 'is_verified']
        });

        if (!user || !(await bcrypt.compare(password, user.password_hash))) {
            throw new AppError(401, 'Invalid email or password');
        }

        if (user.is_banned) {
            throw new AppError(403, 'Your account has been banned');
        }

        if (!user.is_verified) {
            throw new AppError(403, 'Please verify your email address');
        }

        const tokens = await this.generateTokens(user);

        return { user, tokens };
    }

    async logoutUser(tokenValue: string) {
        await this.refreshTokenRepository.delete({ token: tokenValue });
    }

    async refreshTokens(tokenValue: string) {
        const refreshToken = await this.refreshTokenRepository.findOne({
            where: { token: tokenValue },
            relations: ['user']
        });

        if (!refreshToken || refreshToken.expiresAt < new Date()) {
            if (refreshToken) await this.refreshTokenRepository.remove(refreshToken);
            throw new AppError(401, 'Invalid or expired refresh token');
        }

        if (refreshToken.user.is_banned) {
            throw new AppError(403, 'Your account has been banned');
        }

        await this.refreshTokenRepository.remove(refreshToken);
        return this.generateTokens(refreshToken.user);
    }

    async firebaseLogin(firebaseUid: string, email: string, profile: any) {
        let user = await this.userRepository.findOne({ where: { firebase_uid: firebaseUid } });

        if (!user) {
            // Check if user exists with the same email
            user = await this.userRepository.findOne({ where: { email } });

            if (user) {
                // Link Firebase UID to existing user
                user.firebase_uid = firebaseUid;
                user.is_verified = true; // Mark verified as they are authenticated via Firebase
            } else {
                // Create new user
                const salt = await bcrypt.genSalt(10);
                const randomPassword = Math.random().toString(36).slice(-10);
                const password_hash = await bcrypt.hash(randomPassword, salt);

                user = this.userRepository.create({
                    email,
                    password_hash,
                    firebase_uid: firebaseUid,
                    is_verified: true,
                    role: UserRole.CUSTOMER,
                    profile
                });
            }
            await this.userRepository.save(user);
        }

        if (user.is_banned) {
            throw new AppError(403, 'Your account has been banned');
        }

        const tokens = await this.generateTokens(user);
        return { user, tokens };
    }
}

export const authService = new AuthService();
