import { AppDataSource } from '../config/db.config.js';
import { JobRequest, JobRequestStatus, WorkerProfile, Land } from '../models/index.js';
import { In } from 'typeorm';

export class JobRequestService {
    private static jobRequestRepo = AppDataSource.getRepository(JobRequest);
    private static workerProfileRepo = AppDataSource.getRepository(WorkerProfile);
    private static landRepo = AppDataSource.getRepository(Land);

    static async createJobRequest(data: Partial<JobRequest>): Promise<JobRequest> {
        // Validate land ownership
        const land = await this.landRepo.findOne({
            where: { id: data.land_id, owner_id: data.farmer_id }
        });

        if (!land) {
            throw new Error('Land not found or unauthorized');
        }

        const jobRequest = this.jobRequestRepo.create({
            ...data,
            status: JobRequestStatus.OPEN
        });
        return await this.jobRequestRepo.save(jobRequest);
    }

    static async getJobRequests(filters: any = {}): Promise<JobRequest[]> {
        const query = this.jobRequestRepo.createQueryBuilder('job')
            .leftJoinAndSelect('job.land', 'land')
            .leftJoinAndSelect('land.owner', 'owner')
            .leftJoinAndSelect('job.farmer', 'farmer')
            .where('job.status = :status', { status: JobRequestStatus.OPEN });

        if (filters.task_type) {
            query.andWhere('job.task_type = :taskType', { taskType: filters.task_type });
        }

        if (filters.min_salary) {
            query.andWhere('job.salary >= :minSalary', { minSalary: filters.min_salary });
        }

        if (filters.max_salary) {
            query.andWhere('job.salary <= :maxSalary', { maxSalary: filters.max_salary });
        }

        if (filters.duration) {
            query.andWhere('job.duration = :duration', { duration: filters.duration });
        }

        if (filters.farmer_id) {
            query.andWhere('job.farmer_id = :farmerId', { farmerId: filters.farmer_id });
        }

        return await query.orderBy('job.createdAt', 'DESC').getMany();
    }

    static async getRecommendedJobs(userId: string): Promise<any[]> {
        // Fetch worker profile
        const profile = await this.workerProfileRepo.findOne({ where: { user_id: userId } });
        if (!profile || !profile.skills) {
            return await this.getJobRequests();
        }

        const workerSkills = profile.skills.map(s => s.toLowerCase());
        const allJobs = await this.jobRequestRepo.find({
            where: { status: JobRequestStatus.OPEN },
            relations: ['land', 'land.owner', 'farmer']
        });

        const scoredJobs = allJobs.map(job => {
            const requiredSkills = job.required_skills?.map(s => s.toLowerCase()) || [];
            if (requiredSkills.length === 0) return { ...job, matchScore: 0 };

            const matchingSkills = requiredSkills.filter(skill => workerSkills.includes(skill));
            const matchScore = (matchingSkills.length / requiredSkills.length) * 100;

            return {
                ...job,
                matchScore: Math.round(matchScore)
            };
        });

        // Sort by match score descending
        return scoredJobs.sort((a, b) => b.matchScore - a.matchScore);
    }

    static async updateJobRequest(id: string, farmerId: string, data: Partial<JobRequest>): Promise<JobRequest> {
        const job = await this.jobRequestRepo.findOne({
            where: { id, farmer_id: farmerId }
        });

        if (!job) {
            throw new Error('Job request not found or unauthorized');
        }

        Object.assign(job, data);
        return await this.jobRequestRepo.save(job);
    }
}
