import { AppDataSource } from '../../config/db.config.js';
import { Task, TaskStatus } from '../../models/Task.js';
import { LandWorker, LandWorkerStatus } from '../../models/LandWorker.js';
import { Land } from '../../models/Land.js';
import { User } from '../../models/User.js';
import { AppError } from '../../middlewares/error.middleware.js';
import { In, MoreThanOrEqual, LessThanOrEqual, Not, IsNull, And, Between } from 'typeorm';

export interface WorkerPerformanceFilters {
    landIds?: string[];
    startDate?: Date;
    endDate?: Date;
}

export interface WorkerPerformanceData {
    workerId: string;
    workerName: string;
    workerProfilePicture: string | null;
    totalTasksCompleted: number;
    verifiedProofs: number;
    rejectedProofs: number;
    verificationSuccessRate: number;
    averageCompletionTimeMinutes: number | null;
    performanceScore: number;
    landIds: string[];
    landNames: string[];
}

export interface PerformanceSummary {
    totalWorkers: number;
    averagePerformanceScore: number;
    totalTasksCompleted: number;
    overallVerificationRate: number;
}

class WorkerPerformanceService {
    private taskRepo = AppDataSource.getRepository(Task);
    private landWorkerRepo = AppDataSource.getRepository(LandWorker);
    private landRepo = AppDataSource.getRepository(Land);
    private userRepo = AppDataSource.getRepository(User);

    /**
     * Get worker performance metrics aggregated across all farmer lands
     */
    async getWorkerPerformance(
        farmerId: string,
        filters: WorkerPerformanceFilters = {}
    ): Promise<{ workers: WorkerPerformanceData[]; summary: PerformanceSummary }> {
        // 1. Get all lands owned by this farmer
        const ownedLands = await this.landRepo.find({
            where: { owner_id: farmerId }
        });

        if (ownedLands.length === 0) {
            return {
                workers: [],
                summary: {
                    totalWorkers: 0,
                    averagePerformanceScore: 0,
                    totalTasksCompleted: 0,
                    overallVerificationRate: 0
                }
            };
        }

        const ownedLandIds = ownedLands.map(l => l.id);

        // 2. Apply land filter if provided
        const landIdsToQuery = filters.landIds && filters.landIds.length > 0
            ? ownedLandIds.filter(id => filters.landIds!.includes(id))
            : ownedLandIds;

        if (landIdsToQuery.length === 0) {
            return {
                workers: [],
                summary: {
                    totalWorkers: 0,
                    averagePerformanceScore: 0,
                    totalTasksCompleted: 0,
                    overallVerificationRate: 0
                }
            };
        }

        // 3. Get all active land workers for these lands
        const landWorkers = await this.landWorkerRepo.find({
            where: {
                land_id: In(landIdsToQuery),
                status: LandWorkerStatus.ACTIVE
            },
            relations: ['worker', 'land']
        });

        if (landWorkers.length === 0) {
            return {
                workers: [],
                summary: {
                    totalWorkers: 0,
                    averagePerformanceScore: 0,
                    totalTasksCompleted: 0,
                    overallVerificationRate: 0
                }
            };
        }

        // Group workers by worker_id (a worker may work on multiple lands)
        const workerLandMap = new Map<string, { landIds: string[]; landNames: string[] }>();
        const workerIds: string[] = [];

        for (const lw of landWorkers) {
            if (!workerLandMap.has(lw.worker_id)) {
                workerLandMap.set(lw.worker_id, { landIds: [], landNames: [] });
                workerIds.push(lw.worker_id);
            }
            const entry = workerLandMap.get(lw.worker_id)!;
            if (!entry.landIds.includes(lw.land_id)) {
                entry.landIds.push(lw.land_id);
                entry.landNames.push(lw.land?.name || 'Unknown Land');
            }
        }

        // 4. Build task query conditions
        const taskWhere: any = {
            land_id: In(landIdsToQuery),
            assigned_to: In(workerIds),
            status: In([TaskStatus.COMPLETED, TaskStatus.VERIFIED])
        };

        // Handle date range filtering
        if (filters.startDate && filters.endDate) {
            const endOfDay = new Date(filters.endDate);
            endOfDay.setHours(23, 59, 59, 999);
            taskWhere.completed_at = Between(filters.startDate, endOfDay);
        } else if (filters.startDate) {
            taskWhere.completed_at = MoreThanOrEqual(filters.startDate);
        } else if (filters.endDate) {
            const endOfDay = new Date(filters.endDate);
            endOfDay.setHours(23, 59, 59, 999);
            taskWhere.completed_at = LessThanOrEqual(endOfDay);
        }

        // 5. Fetch completed/verified tasks
        const tasks = await this.taskRepo.find({
            where: taskWhere,
            relations: ['assignee']
        });

        // 6. Aggregate data per worker
        const workerStats = new Map<string, {
            totalCompleted: number;
            verified: number;
            rejected: number;
            completionTimes: number[];
        }>();

        for (const workerId of workerIds) {
            workerStats.set(workerId, {
                totalCompleted: 0,
                verified: 0,
                rejected: 0,
                completionTimes: []
            });
        }

        for (const task of tasks) {
            if (!task.assigned_to) continue;
            const stats = workerStats.get(task.assigned_to);
            if (!stats) continue;

            stats.totalCompleted++;

            if (task.status === TaskStatus.VERIFIED) {
                stats.verified++;
            } else if (task.status === TaskStatus.COMPLETED) {
                // Completed but not verified = rejected (implicit rejection)
                stats.rejected++;
            }

            // Calculate completion time if we have completed_at
            // Note: We don't have assigned_at directly, so we'll use time_required_minutes as a proxy
            // or calculate based on other logic. For now, we'll track if needed.
            // Completion time tracking would require task history or created_at comparison
        }

        // 7. Fetch worker details
        const workers = await this.userRepo.findByIds(workerIds);
        const workerMap = new Map(workers.map(w => [w.id, w]));

        // 8. Build final performance data
        const performanceData: WorkerPerformanceData[] = [];

        for (const workerId of workerIds) {
            const worker = workerMap.get(workerId);
            if (!worker) continue;

            const stats = workerStats.get(workerId)!;
            const landInfo = workerLandMap.get(workerId)!;

            const totalVerifiable = stats.verified + stats.rejected;
            const verificationSuccessRate = totalVerifiable > 0
                ? (stats.verified / totalVerifiable) * 100
                : 0;

            // Calculate performance score (0-100)
            // Components:
            // - Completion rate weight: 40% (based on number of tasks completed relative to average)
            // - Verification ratio weight: 40% (direct metric)
            // - Speed weight: 20% (would need more data, using default for now)

            const avgTasksPerWorker = tasks.length / workerIds.length || 0;
            const completionRate = avgTasksPerWorker > 0
                ? Math.min(stats.totalCompleted / avgTasksPerWorker, 1.5) / 1.5 * 100
                : 0;

            const verificationScore = verificationSuccessRate;
            const speedScore = 70; // Default since we don't have detailed timing data

            const performanceScore = Math.round(
                (completionRate * 0.4) +
                (verificationScore * 0.4) +
                (speedScore * 0.2)
            );

            const workerName = worker.profile?.name ||
                worker.email ||
                'Unknown Worker';

            performanceData.push({
                workerId,
                workerName,
                workerProfilePicture: worker.profile?.picture || null,
                totalTasksCompleted: stats.totalCompleted,
                verifiedProofs: stats.verified,
                rejectedProofs: stats.rejected,
                verificationSuccessRate: Math.round(verificationSuccessRate * 100) / 100,
                averageCompletionTimeMinutes: null, // Would require task history
                performanceScore: Math.min(100, Math.max(0, performanceScore)),
                landIds: landInfo.landIds,
                landNames: landInfo.landNames
            });
        }

        // 9. Calculate summary
        const summary: PerformanceSummary = {
            totalWorkers: performanceData.length,
            averagePerformanceScore: performanceData.length > 0
                ? Math.round(performanceData.reduce((sum, w) => sum + w.performanceScore, 0) / performanceData.length)
                : 0,
            totalTasksCompleted: performanceData.reduce((sum, w) => sum + w.totalTasksCompleted, 0),
            overallVerificationRate: performanceData.length > 0
                ? Math.round(
                    (performanceData.reduce((sum, w) => sum + w.verifiedProofs, 0) /
                     performanceData.reduce((sum, w) => sum + w.verifiedProofs + w.rejectedProofs, 0) || 0) * 10000
                ) / 100
                : 0
        };

        return { workers: performanceData, summary };
    }

    /**
     * Get top performers (highest performance score)
     */
    async getTopPerformers(
        farmerId: string,
        filters: WorkerPerformanceFilters = {},
        limit: number = 3
    ): Promise<WorkerPerformanceData[]> {
        const { workers } = await this.getWorkerPerformance(farmerId, filters);
        return workers
            .sort((a, b) => b.performanceScore - a.performanceScore)
            .slice(0, limit);
    }

    /**
     * Get underperformers (lowest performance score or high rejection rate)
     */
    async getUnderperformers(
        farmerId: string,
        filters: WorkerPerformanceFilters = {},
        limit: number = 3
    ): Promise<WorkerPerformanceData[]> {
        const { workers } = await this.getWorkerPerformance(farmerId, filters);

        // Sort by: low score first, then high rejection rate
        return workers
            .sort((a, b) => {
                const scoreDiff = a.performanceScore - b.performanceScore;
                if (scoreDiff !== 0) return scoreDiff;

                const aRejectionRate = a.rejectedProofs / (a.verifiedProofs + a.rejectedProofs) || 0;
                const bRejectionRate = b.rejectedProofs / (b.verifiedProofs + b.rejectedProofs) || 0;
                return bRejectionRate - aRejectionRate;
            })
            .slice(0, limit);
    }
    /**
     * Get global performance metrics for a specific worker across all lands
     */
    async getWorkerGlobalStats(workerUserId: string): Promise<WorkerPerformanceData> {
        const worker = await this.userRepo.findOne({
            where: { id: workerUserId },
            relations: ['profile']
        });

        if (!worker) {
            throw new AppError(404, 'Worker not found');
        }

        // Get all tasks assigned to this worker that are completed or verified
        const tasks = await this.taskRepo.find({
            where: {
                assigned_to: workerUserId,
                status: In([TaskStatus.COMPLETED, TaskStatus.VERIFIED])
            },
            relations: ['land']
        });

        // Get land info
        const landMap = new Map<string, string>();
        let totalCompleted = 0;
        let verifiedCount = 0;
        let rejectedCount = 0;
        let totalCompletionTime = 0;
        let timedTasksCount = 0;

        for (const task of tasks) {
            totalCompleted++;
            if (task.land_id && task.land) {
                landMap.set(task.land_id, task.land.name);
            }

            if (task.status === TaskStatus.VERIFIED) {
                verifiedCount++;
            } else {
                // Completed but not verified yet or rejected
                rejectedCount++;
            }

            // Calculate completion time if available
            if (task.completed_at && task.createdAt) {
                const duration = task.completed_at.getTime() - task.createdAt.getTime();
                totalCompletionTime += duration / (1000 * 60); // minutes
                timedTasksCount++;
            }
        }

        const totalVerifiable = verifiedCount + rejectedCount;
        const successRate = totalVerifiable > 0
            ? (verifiedCount / totalVerifiable) * 100
            : 0;

        // Simple performance score logic
        const performanceScore = Math.round(
            (Math.min(totalCompleted / 5, 1) * 30) + // 30% based on experience (up to 5 tasks)
            (successRate * 0.7) // 70% based on success rate
        );

        return {
            workerId: workerUserId,
            workerName: worker.profile?.name || worker.email || 'Unknown Worker',
            workerProfilePicture: worker.profile?.picture || null,
            totalTasksCompleted: totalCompleted,
            verifiedProofs: verifiedCount,
            rejectedProofs: rejectedCount,
            verificationSuccessRate: Math.round(successRate * 100) / 100,
            averageCompletionTimeMinutes: timedTasksCount > 0
                ? Math.round(totalCompletionTime / timedTasksCount)
                : null,
            performanceScore: Math.min(100, performanceScore),
            landIds: Array.from(landMap.keys()),
            landNames: Array.from(landMap.values())
        };
    }
}

export const workerPerformanceService = new WorkerPerformanceService();
