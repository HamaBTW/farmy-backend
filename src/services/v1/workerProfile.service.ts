import { AppDataSource } from '../../config/db.config.js';
import { WorkerProfile, VerificationStatus, WorkerAvailability } from '../../models/WorkerProfile.js';
import { User, UserRole } from '../../models/User.js';
import { LandWorker } from '../../models/LandWorker.js';
import { AppError } from '../../middlewares/error.middleware.js';

interface CreateWorkerProfileData {
    user_id: string;
    skills?: string[];
    bio?: string;
    hourly_rate?: number;
}

interface MarketplaceFilters {
    skill?: string;
    minRating?: number;
    availability?: WorkerAvailability;
    excludeLandId?: string;
}

class WorkerProfileService {
    private profileRepo = AppDataSource.getRepository(WorkerProfile);
    private userRepo = AppDataSource.getRepository(User);
    private landWorkerRepo = AppDataSource.getRepository(LandWorker);

    async create(data: CreateWorkerProfileData) {
        // Verify user exists and is a customer
        const user = await this.userRepo.findOne({ where: { id: data.user_id } });
        if (!user) {
            throw new AppError(404, 'User not found');
        }
        if (user.role !== UserRole.CUSTOMER) {
            throw new AppError(400, 'Only customers can create worker profiles');
        }

        // Check if profile already exists
        const existing = await this.profileRepo.findOne({ where: { user_id: data.user_id } });
        if (existing) {
            throw new AppError(409, 'Worker profile already exists for this user');
        }

        const profile = this.profileRepo.create({
            user_id: data.user_id,
            skills: data.skills || [],
            bio: data.bio || null,
            hourly_rate: data.hourly_rate || 0,
            verification_status: VerificationStatus.PENDING
        });

        return this.profileRepo.save(profile);
    }

    async findByUserId(userId: string) {
        const profile = await this.profileRepo.findOne({
            where: { user_id: userId },
            relations: ['user']
        });
        if (!profile) {
            throw new AppError(404, 'Worker profile not found');
        }
        return profile;
    }

    async findByUserIdOptional(userId: string) {
        return this.profileRepo.findOne({
            where: { user_id: userId },
            relations: ['user']
        });
    }

    async update(userId: string, data: Partial<{ skills: string[]; bio: string; hourly_rate: number; availability: WorkerAvailability }>) {
        const profile = await this.findByUserId(userId);
        Object.assign(profile, data);
        return this.profileRepo.save(profile);
    }

    async findMarketplace(filters: MarketplaceFilters = {}) {
        const qb = this.profileRepo
            .createQueryBuilder('wp')
            .leftJoinAndSelect('wp.user', 'user')
            .where('wp.verification_status = :status', { status: VerificationStatus.VERIFIED });

        if (filters.availability) {
            qb.andWhere('wp.availability = :availability', { availability: filters.availability });
        }

        if (filters.minRating) {
            qb.andWhere('wp.rating >= :minRating', { minRating: filters.minRating });
        }

        if (filters.skill) {
            // JSON search in skills array (simple-json stored as JSON string)
            qb.andWhere('wp.skills LIKE :skill', { skill: `%${filters.skill}%` });
        }

        if (filters.excludeLandId) {
            qb.andWhere(qb => {
                const subQuery = qb.subQuery()
                    .select('lw.worker_id')
                    .from('land_workers', 'lw')
                    .where('lw.land_id = :excludeLandId', { excludeLandId: filters.excludeLandId })
                    .getQuery();
                return 'wp.user_id NOT IN ' + subQuery;
            });
        }

        qb.orderBy('wp.rating', 'DESC');

        return qb.getMany();
    }

    async verifyProfile(profileId: string, status: VerificationStatus) {
        const profile = await this.profileRepo.findOne({ where: { id: profileId } });
        if (!profile) {
            throw new AppError(404, 'Worker profile not found');
        }
        profile.verification_status = status;
        return this.profileRepo.save(profile);
    }
}

export const workerProfileService = new WorkerProfileService();
