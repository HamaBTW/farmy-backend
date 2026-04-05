import { AppDataSource } from '../../config/db.config.js';
import { LandWorker, LandWorkerStatus } from '../../models/LandWorker.js';
import { Land } from '../../models/Land.js';
import { LandRental, PaymentStatus } from '../../models/LandRental.js';
import { WorkerProfile, VerificationStatus } from '../../models/WorkerProfile.js';
import { Task, TaskStatus } from '../../models/Task.js';
import { AppError } from '../../middlewares/error.middleware.js';
import { IsNull, MoreThanOrEqual, LessThanOrEqual, In } from 'typeorm';

interface AssignWorkerData {
    worker_id: string;
    role?: string;
    salary?: number;
}

class LandWorkerService {
    private landWorkerRepo = AppDataSource.getRepository(LandWorker);
    private landRepo = AppDataSource.getRepository(Land);
    private rentalRepo = AppDataSource.getRepository(LandRental);
    private profileRepo = AppDataSource.getRepository(WorkerProfile);
    private taskRepo = AppDataSource.getRepository(Task);

    /**
     * Core hiring logic:
     * - If land has active rental → only investor can hire
     * - If land has no active rental → only owner (farmer) can hire
     */
    async assignWorker(landId: string, assignedById: string, data: AssignWorkerData) {
        // 1. Check land exists
        const land = await this.landRepo.findOne({ where: { id: landId } });
        if (!land) {
            throw new AppError(404, 'Land not found');
        }

        // 1.5 Validate inputs
        if (data.salary !== undefined && data.salary < 0) {
            throw new AppError(400, 'Salary cannot be negative');
        }
        if (data.role && typeof data.role !== 'string') {
            throw new AppError(400, 'Role must be a valid string');
        }

        // 2. Check rental state to determine who can hire
        const activeRental = await this.getActiveRental(landId);

        if (activeRental) {
            // Land is rented → only investor can hire
            if (activeRental.investor_id !== assignedById) {
                throw new AppError(403, 'Only the active investor can hire workers on a rented land');
            }
        } else {
            // Land is NOT rented → only owner (farmer) can hire
            if (land.owner_id !== assignedById) {
                throw new AppError(403, 'Only the land owner can hire workers on this land');
            }
        }

        // 3. Verify worker profile exists and is verified
        const workerProfile = await this.profileRepo.findOne({
            where: { user_id: data.worker_id }
        });
        if (!workerProfile) {
            throw new AppError(404, 'Worker profile not found');
        }
        if (workerProfile.verification_status !== VerificationStatus.VERIFIED) {
            throw new AppError(400, 'Worker must be verified before being assigned');
        }

        // 4. Check if worker is already on this land (Active, Suspended, etc.)
        const existingAssignment = await this.landWorkerRepo.findOne({
            where: {
                land_id: landId,
                worker_id: data.worker_id
            }
        });
        if (existingAssignment) {
            throw new AppError(409, `Worker is already assigned to this land with status: ${existingAssignment.status}`);
        }

        // 4.5 Check for pending invitations to prevent duplicate recruitment streams
        const invitationRepo = AppDataSource.getRepository('land_worker_invitations');
        const existingInvitation = await invitationRepo.findOne({
            where: {
                land_id: landId,
                worker_id: data.worker_id,
                status: In(['invitation_pending', 'invitation_approved'])
            } as any
        });
        if (existingInvitation) {
            throw new AppError(409, 'This worker already has a pending or approved invitation for this land');
        }

        // 5. Create assignment
        const landWorker = this.landWorkerRepo.create({
            land_id: landId,
            worker_id: data.worker_id,
            assigned_by: assignedById,
            role: data.role || 'general',
            salary: data.salary || 0,
            status: LandWorkerStatus.ACTIVE,
            started_at: new Date()
        });

        return this.landWorkerRepo.save(landWorker);
    }

    async findByLand(landId: string) {
        return this.landWorkerRepo.find({
            where: { land_id: landId },
            relations: ['worker', 'assigner'],
            order: { createdAt: 'DESC' }
        });
    }

    async findActiveByLand(landId: string) {
        const landWorkers = await this.landWorkerRepo.find({
            where: { land_id: landId, status: LandWorkerStatus.ACTIVE },
            relations: ['worker', 'assigner'],
            order: { createdAt: 'DESC' }
        });

        if (landWorkers.length === 0) return [];

        const workerIds = landWorkers.map(w => w.worker_id);

        // Determine availability by checking for active (non-completed) tasks
        const activeTasks = await this.taskRepo.find({
            where: [
                { land_id: landId, status: TaskStatus.ASSIGNED },
                { land_id: landId, status: TaskStatus.IN_PROGRESS }
            ]
        });

        // Build a Set of worker IDs that have active tasks
        const busyWorkerIds = new Set(
            activeTasks
                .filter(t => t.assigned_to !== null)
                .map(t => t.assigned_to!)
        );

        const profiles = await this.profileRepo.find({
            where: { user_id: In(workerIds) }
        });

        return landWorkers.map(lw => {
            const isBusy = busyWorkerIds.has(lw.worker_id);
            return {
                // Core fields
                id: lw.id,
                land_id: lw.land_id,
                worker_id: lw.worker_id,
                assigned_by: lw.assigned_by,
                role: lw.role,
                salary: lw.salary,
                status: lw.status,
                started_at: lw.started_at,
                ended_at: lw.ended_at,
                createdAt: lw.createdAt,
                updatedAt: lw.updatedAt,
                // Relations (preserved as nested objects for Flutter parsing)
                worker: lw.worker,
                assigner: lw.assigner,
                // Computed availability from active tasks (not stale DB field)
                worker_availability: isBusy ? 'busy' : 'available'
            };
        });
    }


    async findByWorker(workerId: string) {
        return this.landWorkerRepo.find({
            where: { worker_id: workerId, status: LandWorkerStatus.ACTIVE },
            relations: ['land', 'land.owner', 'assigner'],
            order: { createdAt: 'DESC' }
        });
    }

    async removeWorker(landId: string, workerId: string, userId: string) {
        const canManage = await this.checkAuthority(landId, userId);
        if (!canManage) {
            throw new AppError(403, 'You do not have permission to manage workers on this land');
        }

        const assignment = await this.landWorkerRepo.findOne({
            where: { land_id: landId, worker_id: workerId }
        });
        if (!assignment) {
            throw new AppError(404, 'Worker assignment not found');
        }

        return this.landWorkerRepo.remove(assignment);
    }

    async updateWorkerStatus(landId: string, workerId: string, userId: string, status: LandWorkerStatus) {
        const canManage = await this.checkAuthority(landId, userId);
        if (!canManage) {
            throw new AppError(403, 'You do not have permission to manage workers on this land');
        }

        const assignment = await this.landWorkerRepo.findOne({
            where: { land_id: landId, worker_id: workerId }
        });
        if (!assignment) {
            throw new AppError(404, 'Worker assignment not found');
        }

        assignment.status = status;
        if (status === LandWorkerStatus.INACTIVE) {
            assignment.ended_at = new Date();
        } else if (status === LandWorkerStatus.ACTIVE) {
            assignment.started_at = assignment.started_at || new Date();
            assignment.ended_at = null;
        }

        return this.landWorkerRepo.save(assignment);
    }

    async getWorkforceStats(landId: string) {
        const allWorkers = await this.landWorkerRepo.find({
            where: { land_id: landId }
        });

        const active = allWorkers.filter(w => w.status === LandWorkerStatus.ACTIVE);
        const suspended = allWorkers.filter(w => w.status === LandWorkerStatus.SUSPENDED);
        const totalSalary = active.reduce((sum, w) => sum + Number(w.salary || 0), 0);

        return {
            total: allWorkers.length,
            active: active.length,
            suspended: suspended.length,
            inactive: allWorkers.length - active.length - suspended.length,
            monthly_salary_expense: totalSalary,
            productivity: active.length > 0 ? Math.min(100, active.length * 20) : 0
        };
    }

    /**
     * Check authority: can the given user manage workers on this land?
     */
    async checkAuthority(landId: string, userId: string) {
        const land = await this.landRepo.findOne({ where: { id: landId } });
        if (!land) {
            throw new AppError(404, 'Land not found');
        }

        const activeRental = await this.getActiveRental(landId);
        if (activeRental) {
            return activeRental.investor_id === userId;
        }
        return land.owner_id === userId;
    }

    private async getActiveRental(landId: string): Promise<LandRental | null> {
        const currentDate = new Date();
        const bufferBase = new Date(currentDate.getTime() + 60 * 60 * 1000); // 1 hour buffer for starting soon

        const rental = await this.rentalRepo.findOne({
            where: [
                {
                    land_id: landId,
                    payment_status: PaymentStatus.PAID,
                    rental_end_date: IsNull(),
                    rental_start_date: LessThanOrEqual(bufferBase)
                },
                {
                    land_id: landId,
                    payment_status: PaymentStatus.PAID,
                    rental_end_date: MoreThanOrEqual(currentDate),
                    rental_start_date: LessThanOrEqual(bufferBase)
                }
            ],
            order: { rental_start_date: 'DESC' }
        });
        return rental || null;
    }
}

export const landWorkerService = new LandWorkerService();
