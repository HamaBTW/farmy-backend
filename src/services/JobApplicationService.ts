import { AppDataSource } from '../config/db.config.js';
import { JobApplication, JobApplicationStatus, JobRequest, User, LandWorker, LandWorkerStatus, HiringSource, LandWorkerInvitation, InvitationStatus } from '../models/index.js';
import { In } from 'typeorm';

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

        // Conflict Logic: Check if already active in land_workers
        const landWorkerRepo = AppDataSource.getRepository(LandWorker);
        const existingLandWorker = await landWorkerRepo.findOne({
            where: { land_id: job.land_id, worker_id: workerId }
        });
        if (existingLandWorker) {
            throw new Error('You are already part of the workforce for this land');
        }

        // Conflict Logic: Check for pending invitations for this land
        const invitationRepo = AppDataSource.getRepository(LandWorkerInvitation);
        const existingInvitation = await invitationRepo.findOne({
            where: {
                land_id: job.land_id,
                worker_id: workerId,
                status: InvitationStatus.INVITATION_PENDING
            }
        });
        if (existingInvitation) {
            throw new Error('You have a pending invitation for this land. Please respond to the invitation instead.');
        }

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
        const saved = await this.applicationRepo.save(application);

        // If approved, automatically add to unified land_workers workforce
        if (status === JobApplicationStatus.APPROVED) {
            const landWorkerRepo = AppDataSource.getRepository(LandWorker);
            
            // Safety check for race conditions
            const exists = await landWorkerRepo.findOne({
                where: { land_id: application.job.land_id, worker_id: application.worker_id }
            });

            if (!exists) {
                const landWorker = landWorkerRepo.create({
                    land_id: application.job.land_id,
                    worker_id: application.worker_id,
                    assigned_by: farmerId,
                    role: application.job.task_type || 'general',
                    salary: application.job.salary || 0,
                    status: LandWorkerStatus.ACTIVE,
                    hiring_source: HiringSource.JOB_APPLICATION,
                    started_at: new Date()
                });
                await landWorkerRepo.save(landWorker);
            }
        }

        return saved;
    }
}
