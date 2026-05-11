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

    async findById(profileId: string) {
        const profile = await this.profileRepo.findOne({
            where: { id: profileId },
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
                // Exclude if already in land_workers
                const workerSubQuery = qb.subQuery()
                    .select('lw.worker_id')
                    .from('land_workers', 'lw')
                    .where('lw.land_id = :excludeLandId', { excludeLandId: filters.excludeLandId })
                    .getQuery();

                // Exclude if has pending/approved invitation
                const invitationSubQuery = qb.subQuery()
                    .select('li.worker_id')
                    .from('land_worker_invitations', 'li')
                    .where('li.land_id = :excludeLandId', { excludeLandId: filters.excludeLandId })
                    .andWhere('li.status IN (:...invStatuses)', {
                        invStatuses: ['invitation_pending', 'invitation_approved']
                    })
                    .getQuery();

                return `wp.user_id NOT IN ${workerSubQuery} AND wp.user_id NOT IN ${invitationSubQuery}`;
            });
        }

        qb.orderBy('wp.rating', 'DESC');

        return qb.getMany();
    }

    async findAllAdmin(filters: { 
        status?: string; 
        search?: string; 
        region?: string;
        submittedAt?: string;
        sortBy?: string;
        sortOrder?: 'ASC' | 'DESC';
        page?: number; 
        limit?: number 
    } = {}) {
        const { status, search, region, submittedAt, sortBy, sortOrder = 'DESC', page = 1, limit = 10 } = filters;
        const qb = this.profileRepo
            .createQueryBuilder('wp')
            .innerJoinAndSelect('wp.user', 'user');

        if (status && status !== 'all') {
            qb.andWhere('wp.verification_status = :status', { status });
        }

        if (search) {
            qb.andWhere('(user.email LIKE :search OR user.profile->>"$.name" LIKE :search)', { search: `%${search}%` });
        }

        if (region) {
            qb.andWhere('user.profile->>"$.city" LIKE :region', { region: `%${region}%` });
        }

        if (submittedAt) {
            qb.andWhere('DATE(wp.createdAt) = :submittedAt', { submittedAt });
        }

        const skip = (page - 1) * limit;
        qb.skip(skip).take(limit);

        // Sorting
        if (sortBy) {
            const order = sortOrder === 'ASC' ? 'ASC' : 'DESC';
            switch (sortBy) {
                case 'name':
                    qb.orderBy('user.profile->>"$.name"', order);
                    break;
                case 'dailyRate':
                    qb.orderBy('wp.hourly_rate', order);
                    break;
                case 'rating':
                    qb.orderBy('wp.rating', order);
                    break;
                case 'status':
                    qb.orderBy('wp.verification_status', order);
                    break;
                case 'createdAt':
                default:
                    qb.orderBy('wp.createdAt', order);
                    break;
            }
        } else {
            qb.orderBy('wp.createdAt', 'DESC');
        }

        const [profiles, total] = await qb.getManyAndCount();

        // Get Stats
        const stats = await this.profileRepo
            .createQueryBuilder('wp')
            .innerJoin('wp.user', 'user') // Ensure user exists for stats too
            .select('wp.verification_status', 'status')
            .addSelect('COUNT(*)', 'count')
            .groupBy('wp.verification_status')
            .getRawMany();

        const formattedStats = {
            pending: parseInt(stats.find(s => s.status === VerificationStatus.PENDING)?.count || '0'),
            verified: parseInt(stats.find(s => s.status === VerificationStatus.VERIFIED)?.count || '0'),
            rejected: parseInt(stats.find(s => s.status === VerificationStatus.REJECTED)?.count || '0'),
            total: total
        };

        return {
            profiles,
            total,
            stats: formattedStats
        };
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
