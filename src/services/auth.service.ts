import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { AppDataSource } from '../config/db.config.js';
import { User, UserRole } from '../models/User.js';
import { RefreshToken } from '../models/RefreshToken.js';
import { AppError } from '../middlewares/error.middleware.js';

class AuthService {
    private userRepository = AppDataSource.getRepository(User);
    private refreshTokenRepository = AppDataSource.getRepository(RefreshToken);

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

        const user = this.userRepository.create({
            email,
            password_hash,
            phone,
            role: role || UserRole.CUSTOMER,
            profile,
            location,
            is_verified: false
        });

        await this.userRepository.save(user);
        const tokens = await this.generateTokens(user);

        return { user, tokens };
    }

    async loginUser(credentials: any) {
        const { email, password } = credentials;

        const user = await this.userRepository.findOne({
            where: { email },
            select: ['id', 'email', 'password_hash', 'role', 'is_banned']
        });

        if (!user || !(await bcrypt.compare(password, user.password_hash))) {
            throw new AppError(401, 'Invalid email or password');
        }

        if (user.is_banned) {
            throw new AppError(403, 'Your account has been banned');
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
}

export const authService = new AuthService();
