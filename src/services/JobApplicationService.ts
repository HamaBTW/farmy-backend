import { AppDataSource } from '../config/db.config.js';
import { JobApplication, JobApplicationStatus, JobRequest, User } from '../models/index.js';

export class JobApplicationService {
    private static applicationRepo = AppDataSource.getRepository(JobApplication);
    private static jobRepo = AppDataSource.getRepository(JobRequest);

    static async applyToJob(jobId: string, workerId: string, notes?: string): Promise<JobApplication> {
        // Check if already applied
        const existing = await this.applicationRepo.findOne({
            where: { job_id: jobId, worker_id: workerId }
        });

        if (existing) {
            throw new Error('You have already applied for this job');
        }

        // Check if job exists and is open
        const job = await this.jobRepo.findOne({ where: { id: jobId } });
        if (!job) throw new Error('Job not found');
        if (job.status !== 'open' as any) throw new Error('Job is no longer open');

        const application = this.applicationRepo.create({
            job_id: jobId,
            worker_id: workerId,
            notes,
            status: JobApplicationStatus.PENDING
        });

        return await this.applicationRepo.save(application);
    }

    static async getMyApplications(workerId: string): Promise<JobApplication[]> {
        return await this.applicationRepo.find({
            where: { worker_id: workerId },
            relations: ['job', 'job.land', 'job.land.owner'],
            order: { createdAt: 'DESC' }
        });
    }

    static async getJobApplications(jobId: string, farmerId: string): Promise<JobApplication[]> {
        console.log(`🔍 Fetching applications for Job: ${jobId} and Farmer: ${farmerId}`);
        // Verify farmer owns the job
        const job = await this.jobRepo.findOne({ where: { id: jobId, farmer_id: farmerId } });
        
        if (!job) {
            console.error(`❌ Job not found or farmer ${farmerId} does not own job ${jobId}`);
            throw new Error('Job not found or unauthorized');
        }

        const applications = await this.applicationRepo.find({
            where: { job_id: jobId },
            relations: ['worker'],
            order: { createdAt: 'DESC' }
        });

        console.log(`✅ Found ${applications.length} applications for job ${jobId}`);
        return applications;
    }

    static async updateStatus(applicationId: string, farmerId: string, status: JobApplicationStatus): Promise<JobApplication> {
        const application = await this.applicationRepo.findOne({
            where: { id: applicationId },
            relations: ['job']
        });

        if (!application) throw new Error('Application not found');
        if (application.job.farmer_id !== farmerId) throw new Error('Unauthorized');

        application.status = status;
        return await this.applicationRepo.save(application);
    }
}
