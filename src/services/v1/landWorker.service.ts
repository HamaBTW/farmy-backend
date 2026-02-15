import { AppDataSource } from '../../config/db.config.js';
import { LandWorker, LandWorkerStatus } from '../../models/LandWorker.js';
import { Land } from '../../models/Land.js';
import { LandRental } from '../../models/LandRental.js';
import { WorkerProfile, VerificationStatus } from '../../models/WorkerProfile.js';
import { AppError } from '../../middlewares/error.middleware.js';
import { IsNull, MoreThanOrEqual } from 'typeorm';

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

        // 4. Check if worker is already active on this land
        const existingAssignment = await this.landWorkerRepo.findOne({
            where: {
                land_id: landId,
                worker_id: data.worker_id,
                status: LandWorkerStatus.ACTIVE
            }
        });
        if (existingAssignment) {
            throw new AppError(409, 'Worker is already assigned to this land');
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
        return this.landWorkerRepo.find({
            where: { land_id: landId, status: LandWorkerStatus.ACTIVE },
            relations: ['worker', 'assigner'],
            order: { createdAt: 'DESC' }
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
        const land = await this.landRepo.findOne({ where: { id: landId } });
        if (!land) {
            throw new AppError(404, 'Land not found');
        }

        // Check authority (same rental-state logic)
        const activeRental = await this.getActiveRental(landId);
        if (activeRental) {
            if (activeRental.investor_id !== userId) {
                throw new AppError(403, 'Only the active investor can manage workers on a rented land');
            }
        } else {
            if (land.owner_id !== userId) {
                throw new AppError(403, 'Only the land owner can manage workers on this land');
            }
        }

        const assignment = await this.landWorkerRepo.findOne({
            where: { land_id: landId, worker_id: workerId, status: LandWorkerStatus.ACTIVE }
        });
        if (!assignment) {
            throw new AppError(404, 'Active worker assignment not found');
        }

        // Soft deactivate
        assignment.status = LandWorkerStatus.INACTIVE;
        assignment.ended_at = new Date();
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
        const rental = await this.rentalRepo.findOne({
            where: [
                { land_id: landId, rental_end_date: IsNull() },
                { land_id: landId, rental_end_date: MoreThanOrEqual(currentDate) }
            ],
            order: { rental_start_date: 'DESC' }
        });
        return rental || null;
    }
}

export const landWorkerService = new LandWorkerService();
