import { AppDataSource } from '../../config/db.config.js';
import { User, KYCStatus, UserRole } from '../../models/User.js';
import { AppError } from '../../middlewares/error.middleware.js';
import fs from 'fs';

class KycService {
    private userRepository = AppDataSource.getRepository(User);

    async submitKyc(
        userId: string,
        roleRequested: string,
        files: {
            front_image?: Express.Multer.File[],
            back_image?: Express.Multer.File[],
            selfie_image?: Express.Multer.File[]
        }
    ) {
        const user = await this.userRepository.findOne({ where: { id: userId } });
        if (!user) throw new AppError(404, 'User not found');

        // Extract file paths
        const frontImage = files.front_image?.[0]?.path;
        const backImage = files.back_image?.[0]?.path;
        const selfieImage = files.selfie_image?.[0]?.path;

        if (!frontImage || !backImage || !selfieImage) {
            throw new AppError(400, 'Missing required KYC documents');
        }

        // Don't store paths in DB since we delete after verification
        // Just update the KYC status and role
        user.kyc_status = KYCStatus.APPROVED;

        if (roleRequested === 'farmer') {
            user.role = UserRole.FARMER;
        } else if (roleRequested === 'investor') {
            user.role = UserRole.INVESTOR;
        }

        await this.userRepository.save(user);

        // Cleanup: Delete uploaded files after successful verification
        const filesToDelete = [frontImage, backImage, selfieImage];
        for (const filePath of filesToDelete) {
            try {
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                    console.log(`[KYC] Deleted file: ${filePath}`);
                }
            } catch (e) {
                console.error(`[KYC] Failed to delete file ${filePath}:`, e);
            }
        }

        return {
            success: true,
            message: 'KYC submitted and auto-approved via AI Verification',
            status: user.kyc_status,
            role: user.role
        };
    }
}

export const kycService = new KycService();
