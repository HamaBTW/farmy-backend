import { AppDataSource } from '../../config/db.config.js';
import { Task, TaskStatus } from '../../models/Task.js';
import { Land } from '../../models/Land.js';
import { LandWorker, LandWorkerStatus } from '../../models/LandWorker.js';
import { LandRental } from '../../models/LandRental.js';
import { WorkerProfile } from '../../models/WorkerProfile.js';
import { User } from '../../models/User.js';
import { WorkerBalance } from '../../models/WorkerBalance.js';
import { Transaction, TransactionStatus, TransactionType } from '../../models/Transaction.js';
import { AppError } from '../../middlewares/error.middleware.js';
import { IsNull, MoreThanOrEqual } from 'typeorm';
import { firebaseService } from './firebase.service.js';
import { NotificationType } from '../../models/Notification.js';
import logger from '../../utils/logger.js';
import { getIO } from '../../socket/socket.js';

interface CreateTaskData {
    title: string;
    description?: string;
    type?: string;
    reward?: number;
    time_required_minutes?: number;
    placed_item_id?: string;
    asset_task_id?: string;
    assigned_to?: string;
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
    private userRepo = AppDataSource.getRepository(User);
    private workerBalanceRepo = AppDataSource.getRepository(WorkerBalance);
    private transactionRepo = AppDataSource.getRepository(Transaction);

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

        // If assigned directly on creation, check worker's availability
        if (data.assigned_to) {
            const activeAssignment = await this.landWorkerRepo.findOne({
                where: {
                    land_id: landId,
                    worker_id: data.assigned_to,
                    status: LandWorkerStatus.ACTIVE
                }
            });
            if (!activeAssignment) {
                throw new AppError(400, 'Worker is not actively assigned to this land');
            }

            const workerProfile = await this.profileRepo.findOne({ where: { user_id: data.assigned_to } });
            if (workerProfile && workerProfile.availability !== 'available') {
                throw new AppError(400, 'Worker is currently busy or unavailable');
            }

            if (workerProfile) {
                workerProfile.availability = 'busy' as any; // Cast for now if enum is exported differently
                await this.profileRepo.save(workerProfile);
            }
        }

        const task = this.taskRepo.create({
            land_id: landId,
            created_by: createdById,
            title: data.title,
            description: data.description || null,
            type: data.type || 'maintenance',
            status: data.assigned_to ? TaskStatus.ASSIGNED : TaskStatus.OPEN,
            reward: data.reward || 0,
            time_required_minutes: data.time_required_minutes || 30,
            placed_item_id: data.placed_item_id || null,
            asset_task_id: data.asset_task_id || null,
            assigned_to: data.assigned_to || null,
        });

        const saved = await this.taskRepo.save(task);

        // 🔔 Send push notification to assigned worker
        if (data.assigned_to) {
            try {
                const investor = await this.userRepo.findOne({
                    where: { id: createdById },
                    relations: ['profile']
                });
                const investorName = (investor as any)?.profile?.name || investor?.email || 'The investor';

                await firebaseService.sendToUsers(
                    data.assigned_to,
                    '🌾 New Task Assigned',
                    `${investorName} assigned you: "${data.title}"`,
                    {
                        type: 'task_assigned',
                        task_id: saved.id,
                        land_id: landId,
                        task_title: data.title,
                        task_type: data.type || 'maintenance',
                        reward: String(data.reward || 0),
                    },
                    NotificationType.TASK
                );
                logger.info(`📲 Task assignment notification sent to worker ${data.assigned_to}`);
            } catch (notifErr) {
                // Never block task creation due to notification failure
                logger.error('Failed to send task notification:', notifErr);
            }
        }

        return saved;
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

        // Check worker profile capability
        const workerProfile = await this.profileRepo.findOne({ where: { user_id: workerId } });
        if (workerProfile && workerProfile.availability !== 'available') {
            throw new AppError(400, 'Worker is currently busy or unavailable');
        }

        if (workerProfile) {
            workerProfile.availability = 'busy' as any;
            await this.profileRepo.save(workerProfile);
        }

        task.assigned_to = workerId;
        task.status = TaskStatus.ASSIGNED;
        const saved = await this.taskRepo.save(task);

        // 🔔 Send push notification to assigned worker
        try {
            const assigner = await this.userRepo.findOne({
                where: { id: userId },
                relations: ['profile']
            });
            const assignerName = (assigner as any)?.profile?.name || assigner?.email || 'The investor';

            await firebaseService.sendToUsers(
                workerId,
                '🌾 New Task Assigned',
                `${assignerName} assigned you: "${task.title}"`,
                {
                    type: 'task_assigned',
                    task_id: saved.id,
                    land_id: task.land_id,
                    task_title: task.title,
                    task_type: task.type,
                    reward: String(task.reward || 0),
                },
                NotificationType.TASK
            );
            logger.info(`📲 Task assignment notification sent to worker ${workerId}`);
        } catch (notifErr) {
            logger.error('Failed to send task notification:', notifErr);
        }

        return saved;
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

        // Update worker stats to available again
        const workerProfile = await this.profileRepo.findOne({ where: { user_id: userId } });
        if (workerProfile) {
            workerProfile.completed_tasks = (workerProfile.completed_tasks || 0) + 1;
            workerProfile.availability = 'available' as any;
            await this.profileRepo.save(workerProfile);
        }

        const savedTask = await this.taskRepo.save(task);

        // Notify the investor via Socket so the game UI updates immediately
        try {
            const land = await this.landRepo.findOne({ where: { id: task.land_id } });
            if (land) {
                const currentDate = new Date();
                const activeRental = await this.rentalRepo.findOne({
                    where: [
                        { land_id: task.land_id, rental_end_date: IsNull() },
                        { land_id: task.land_id, rental_end_date: MoreThanOrEqual(currentDate) }
                    ],
                    order: { rental_start_date: 'DESC' }
                });
                const investorId = activeRental ? activeRental.investor_id : land.owner_id;
                
                getIO().to(investorId).emit('worker_task_completed', {
                    workerId: userId,
                    landId: task.land_id,
                    taskId: task.id
                });
                logger.info(`🔌 Emitted worker_task_completed to investor ${investorId} for worker ${userId}`);
            }
        } catch (e) {
            logger.error('Failed to emit worker_task_completed:', e);
        }

        return savedTask;
    }

    async verifyTask(taskId: string, userId: string) {
        const task = await this.taskRepo.findOne({ where: { id: taskId } });
        if (!task) {
            throw new AppError(404, 'Task not found');
        }

        const hasAuth = await this.checkLandAuthority(task.land_id, userId);
        if (!hasAuth) {
            throw new AppError(403, 'You do not have permission to verify tasks on this land');
        }

        if (task.status !== TaskStatus.COMPLETED) {
            throw new AppError(400, 'Only completed tasks can be verified');
        }

        if (!task.assigned_to) {
            throw new AppError(400, 'Task is not assigned to anyone');
        }

        task.status = TaskStatus.VERIFIED;
        const savedTask = await this.taskRepo.save(task);

        // Process reward
        if (task.reward && task.reward > 0) {
            let balance = await this.workerBalanceRepo.findOne({ where: { worker_id: task.assigned_to } });
            if (!balance) {
                balance = this.workerBalanceRepo.create({
                    worker_id: task.assigned_to,
                    available_balance: 0,
                    pending_balance: 0
                });
            }
            
            balance.available_balance = Number(balance.available_balance) + Number(task.reward);
            await this.workerBalanceRepo.save(balance);

            const transaction = this.transactionRepo.create({
                worker_id: task.assigned_to,
                amount: task.reward,
                currency: 'usd',
                status: TransactionStatus.SUCCEEDED,
                type: TransactionType.TASK_EARNING,
                metadata: {
                    task_id: task.id,
                    land_id: task.land_id
                }
            });
            await this.transactionRepo.save(transaction);
            
            // Notify worker
            firebaseService.sendToUsers(
                task.assigned_to,
                'Task Verified! 💰',
                `You earned $${task.reward} for completing "${task.title}".`,
                { type: 'task_verified', task_id: task.id },
                NotificationType.WALLET
            ).catch(err => logger.error('Failed to notify worker of task verification:', err));
        }

        return savedTask;
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
