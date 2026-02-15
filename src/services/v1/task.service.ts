import { AppDataSource } from '../../config/db.config.js';
import { Task, TaskType, TaskStatus } from '../../models/Task.js';
import { Land } from '../../models/Land.js';
import { LandWorker, LandWorkerStatus } from '../../models/LandWorker.js';
import { LandRental } from '../../models/LandRental.js';
import { WorkerProfile } from '../../models/WorkerProfile.js';
import { AppError } from '../../middlewares/error.middleware.js';
import { IsNull, MoreThanOrEqual } from 'typeorm';

interface CreateTaskData {
    title: string;
    description?: string;
    type?: TaskType;
    reward?: number;
    time_required_minutes?: number;
}

interface CompleteTaskData {
    proof_image_url?: string;
    proof_video_url?: string;
    proof_gps?: { latitude: number; longitude: number };
}

class TaskService {
    private taskRepo = AppDataSource.getRepository(Task);
    private landRepo = AppDataSource.getRepository(Land);
    private landWorkerRepo = AppDataSource.getRepository(LandWorker);
    private rentalRepo = AppDataSource.getRepository(LandRental);
    private profileRepo = AppDataSource.getRepository(WorkerProfile);

    async create(landId: string, createdById: string, data: CreateTaskData) {
        // Verify land exists
        const land = await this.landRepo.findOne({ where: { id: landId } });
        if (!land) {
            throw new AppError(404, 'Land not found');
        }

        // Verify authority (same rental-state logic)
        const hasAuth = await this.checkLandAuthority(landId, createdById);
        if (!hasAuth) {
            throw new AppError(403, 'You do not have permission to create tasks on this land');
        }

        const task = this.taskRepo.create({
            land_id: landId,
            created_by: createdById,
            title: data.title,
            description: data.description || null,
            type: data.type || TaskType.MAINTENANCE,
            status: TaskStatus.OPEN,
            reward: data.reward || 0,
            time_required_minutes: data.time_required_minutes || 30
        });

        return this.taskRepo.save(task);
    }

    async assignTask(taskId: string, workerId: string, userId: string) {
        const task = await this.taskRepo.findOne({
            where: { id: taskId },
            relations: ['land']
        });
        if (!task) {
            throw new AppError(404, 'Task not found');
        }

        // Verify authority
        const hasAuth = await this.checkLandAuthority(task.land_id, userId);
        if (!hasAuth) {
            throw new AppError(403, 'You do not have permission to assign tasks on this land');
        }

        // Verify worker is active on this land
        const activeAssignment = await this.landWorkerRepo.findOne({
            where: {
                land_id: task.land_id,
                worker_id: workerId,
                status: LandWorkerStatus.ACTIVE
            }
        });
        if (!activeAssignment) {
            throw new AppError(400, 'Worker is not actively assigned to this land');
        }

        task.assigned_to = workerId;
        task.status = TaskStatus.ASSIGNED;
        return this.taskRepo.save(task);
    }

    async completeTask(taskId: string, userId: string, proof: CompleteTaskData) {
        const task = await this.taskRepo.findOne({ where: { id: taskId } });
        if (!task) {
            throw new AppError(404, 'Task not found');
        }

        // Only assigned worker can complete
        if (task.assigned_to !== userId) {
            throw new AppError(403, 'Only the assigned worker can complete this task');
        }

        if (task.status === TaskStatus.COMPLETED || task.status === TaskStatus.VERIFIED) {
            throw new AppError(400, 'Task is already completed');
        }

        // Require at least one proof
        if (!proof.proof_image_url && !proof.proof_video_url) {
            throw new AppError(400, 'At least one proof (image or video) is required');
        }

        task.status = TaskStatus.COMPLETED;
        task.completed_at = new Date();
        task.proof_image_url = proof.proof_image_url || null;
        task.proof_video_url = proof.proof_video_url || null;
        task.proof_gps = proof.proof_gps || null;

        // Update worker stats
        const workerProfile = await this.profileRepo.findOne({ where: { user_id: userId } });
        if (workerProfile) {
            workerProfile.completed_tasks = (workerProfile.completed_tasks || 0) + 1;
            await this.profileRepo.save(workerProfile);
        }

        return this.taskRepo.save(task);
    }

    async findByLand(landId: string, status?: TaskStatus) {
        const where: any = { land_id: landId };
        if (status) {
            where.status = status;
        }
        return this.taskRepo.find({
            where,
            relations: ['assignee', 'creator'],
            order: { createdAt: 'DESC' }
        });
    }

    async findByWorker(workerId: string) {
        return this.taskRepo.find({
            where: { assigned_to: workerId },
            relations: ['land', 'creator'],
            order: { createdAt: 'DESC' }
        });
    }

    private async checkLandAuthority(landId: string, userId: string): Promise<boolean> {
        const land = await this.landRepo.findOne({ where: { id: landId } });
        if (!land) return false;

        const currentDate = new Date();
        const activeRental = await this.rentalRepo.findOne({
            where: [
                { land_id: landId, rental_end_date: IsNull() },
                { land_id: landId, rental_end_date: MoreThanOrEqual(currentDate) }
            ],
            order: { rental_start_date: 'DESC' }
        });

        if (activeRental) {
            return activeRental.investor_id === userId;
        }
        return land.owner_id === userId;
    }
}

export const taskService = new TaskService();
