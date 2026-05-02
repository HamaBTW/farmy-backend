import { Response, NextFunction } from 'express';
import { AppDataSource } from '../../config/db.config.js';
import { User, UserProfile } from '../../models/User.js';
import { AuthRequest } from '../../middlewares/auth.middleware.js';
import { AppError } from '../../middlewares/error.middleware.js';
import { aiService } from '../../services/v1/ai.service.js';

export const updateProfile = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;
        const { phone, profile } = req.body;
        const userRepository = AppDataSource.getRepository(User);

        const user = await userRepository.findOne({ where: { id: userId } });
        if (!user) throw new AppError(404, 'User not found');

        // Check Unique Username if username is provided
        if (profile?.username) {
            const existingUser = await userRepository.createQueryBuilder('user')
                .where("JSON_EXTRACT(user.profile, '$.username') = :username", { username: profile.username })
                .andWhere("user.id != :userId", { userId })
                .getOne();

            if (existingUser) {
                throw new AppError(400, 'Username already taken');
            }
        }

        if (phone !== undefined) user.phone = phone;

        if (profile) {
            const currentProfile: any = user.profile || {};
            const newProfile: any = { ...profile };

            const mergedProfile: any = {
                ...currentProfile,
                ...newProfile
            };

            if (newProfile.farmer_details) {
                mergedProfile.farmer_details = {
                    ...currentProfile.farmer_details,
                    ...newProfile.farmer_details
                };
            }
            if (newProfile.investor_details) {
                mergedProfile.investor_details = {
                    ...currentProfile.investor_details,
                    ...newProfile.investor_details
                };
            }
            if (newProfile.portfolio_links) {
                mergedProfile.portfolio_links = {
                    ...currentProfile.portfolio_links,
                    ...newProfile.portfolio_links
                };
            }
            if (newProfile.privacy_settings) {
                const curPrivacy = currentProfile.privacy_settings || {};
                const newPrivacy = newProfile.privacy_settings;
                mergedProfile.privacy_settings = {
                    ...curPrivacy,
                    ...newPrivacy,
                    field_visibility: {
                        ...(curPrivacy.field_visibility || {}),
                        ...(newPrivacy.field_visibility || {})
                    }
                };
            }

            // Calculate completeness score strictly on primary traits
            const fieldsToCheck = [
                'name', 'username', 'picture', 'dob', 'country', 'city', 'timezone',
                'preferred_language', 'headline', 'bio'
            ];
            let filled = fieldsToCheck.filter(f => !!mergedProfile[f]).length;
            if (user.phone) filled++;
            mergedProfile.completeness_score = Math.round((filled / (fieldsToCheck.length + 1)) * 100);

            user.profile = mergedProfile as UserProfile;
        }

        await userRepository.save(user);

        // Remove sensitive items if required, here returning updated profile
        res.status(200).json({
            success: true,
            message: 'Profile updated successfully',
            data: user.profile
        });
    } catch (error) {
        next(error);
    }
};

export const uploadProfilePicture = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        if (!req.file) {
            throw new AppError(400, 'No file uploaded');
        }

        const userId = req.user!.id;
        const userRepository = AppDataSource.getRepository(User);
        const user = await userRepository.findOne({ where: { id: userId } });

        if (!user) {
            throw new AppError(404, 'User not found');
        }

        const requestedType = String(req.body?.type || req.body?.image_type || 'picture').toLowerCase();
        const isCover = ['cover', 'cover_image'].includes(requestedType);
        const profileField = isCover ? 'cover_image' : 'picture';

        // Handle relative path for frontend access
        const uploadedUrl = `/uploads/profile/${req.file.filename}`;

        const currentProfile: any = user.profile || {};
        const updatedProfile = {
            ...currentProfile,
            [profileField]: uploadedUrl
        };

        // Recalculate completeness score
        const fieldsToCheck = [
            'name', 'username', 'picture', 'dob', 'country', 'city', 'timezone',
            'preferred_language', 'headline', 'bio'
        ];
        let filled = fieldsToCheck.filter(f => !!updatedProfile[f]).length;
        if (user.phone) filled++;
        updatedProfile.completeness_score = Math.round((filled / (fieldsToCheck.length + 1)) * 100);

        user.profile = updatedProfile as UserProfile;
        await userRepository.save(user);

        res.status(200).json({
            success: true,
            message: isCover ? 'Cover image uploaded successfully' : 'Profile picture uploaded successfully',
            data: {
                [profileField]: uploadedUrl,
                completeness_score: updatedProfile.completeness_score
            }
        });
    } catch (error) {
        console.error('Error in uploadProfilePicture:', error);
        next(error);
    }
};

export const checkUsername = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { username } = req.params;
        const userId = req.user!.id;
        const userRepository = AppDataSource.getRepository(User);

        const existingUser = await userRepository.createQueryBuilder('user')
            .where("JSON_EXTRACT(user.profile, '$.username') = :username", { username })
            .andWhere("user.id != :userId", { userId })
            .getOne();

        res.status(200).json({
            success: true,
            data: {
                available: !existingUser
            }
        });
    } catch (error) {
        next(error);
    }
};

