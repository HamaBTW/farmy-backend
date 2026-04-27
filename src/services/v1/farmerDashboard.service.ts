import { AppDataSource } from '../../config/db.config.js';
import { Land } from '../../models/Land.js';
import { LandRental, PaymentStatus } from '../../models/LandRental.js';
import { LandWorker, LandWorkerStatus } from '../../models/LandWorker.js';
import { Task, TaskStatus } from '../../models/Task.js';
import { PlacedItem } from '../../models/PlacedItem.js';
import { AssetProduction } from '../../models/AssetProduction.js';
import { ItemRequest } from '../../models/ItemRequest.js';
import { ItemRequestStatus } from '../../models/AssetCategory.js';
import { Product, ProductStatus } from '../../models/Product.js';
import { FarmerStrategySession } from '../../models/FarmerStrategySession.js';
import { User } from '../../models/User.js';
import { In, LessThan, MoreThanOrEqual, Not, IsNull } from 'typeorm';

export interface HeroMetrics {
    activeLands: number;
    openTasks: number;
    overdueTasks: number;
    pendingItemRequests: number; // New: pending item requests from investors
    monthlyRevenue: number;
    revenueTrend: number; // percentage change from last month
    lastMonthRevenue: number;
}

export interface SmartAlert {
    id: string;
    priority: 'critical' | 'warning' | 'info';
    title: string;
    message: string;
    actionRoute?: string;
    actionData?: Record<string, any>;
    itemId?: string;
    landId?: string;
}

export interface LandOperational {
    id: string;
    name: string;
    status: 'owned' | 'rented' | 'harvest-ready' | 'pending-requests';
    activeWorkers: number;
    openTasks: number;
    placedItems: number;
    hasPendingRequests: boolean;
    pendingRequestsCount: number;
    harvestReadyCount: number;
}

export interface ActiveWorker {
    id: string;
    name: string;
    profilePicture: string | null;
    currentActivity: string;
    status: 'active' | 'idle' | 'offline';
    assignedLandId: string | null;
    assignedLandName: string | null;
    currentTaskId: string | null;
    currentTaskTitle: string | null;
}

export interface AISessionPreview {
    id: string;
    title: string;
    createdAt: Date;
    messageCount: number;
}

export interface FarmerDashboardData {
    heroMetrics: HeroMetrics;
    alerts: SmartAlert[];
    lands: LandOperational[];
    workers: ActiveWorker[];
    aiSessions: AISessionPreview[];
}

type DashboardLocale = 'en' | 'fr' | 'es';

class FarmerDashboardService {
    private landRepo = AppDataSource.getRepository(Land);
    private rentalRepo = AppDataSource.getRepository(LandRental);
    private landWorkerRepo = AppDataSource.getRepository(LandWorker);
    private taskRepo = AppDataSource.getRepository(Task);
    private placedItemRepo = AppDataSource.getRepository(PlacedItem);
    private assetProductionRepo = AppDataSource.getRepository(AssetProduction);
    private itemRequestRepo = AppDataSource.getRepository(ItemRequest);
    private productRepo = AppDataSource.getRepository(Product);
    private sessionRepo = AppDataSource.getRepository(FarmerStrategySession);
    private userRepo = AppDataSource.getRepository(User);

    private normalizeLocale(rawLocale?: string): DashboardLocale {
        const lc = (rawLocale || 'en').toLowerCase();
        if (lc.startsWith('fr')) return 'fr';
        if (lc.startsWith('es')) return 'es';
        return 'en';
    }

    private tr(locale: DashboardLocale, key: string, params: Record<string, any> = {}): string {
        const s = {
            en: {
                lowDurabilityAlert: 'Low Durability Alert',
                durabilityWarning: 'Durability Warning',
                harvestReadySoon: 'Harvest Ready Soon',
                harvestOverdue: 'Harvest Overdue',
                unknownLand: 'Unknown Land',
                idle: 'Idle',
                pendingVerification: 'Pending verification',
                workingOnTask: 'Working on task',
                farmAnalysis: 'Farm Analysis',
                msgDurabilityCritical: `Item on ${params.land} has ${params.value}% durability remaining`,
                msgDurabilityWarning: `Item on ${params.land} is at ${params.value}% durability`,
                msgHarvestReadySoon: `Crop on ${params.land} is ready for harvest`,
                msgHarvestOverdue: `Crop on ${params.land} is past due for harvest`
            },
            fr: {
                lowDurabilityAlert: 'Alerte Durabilité Faible',
                durabilityWarning: 'Avertissement Durabilité',
                harvestReadySoon: 'Récolte Bientôt Prête',
                harvestOverdue: 'Récolte En Retard',
                unknownLand: 'Terrain Inconnu',
                idle: 'Inactif',
                pendingVerification: 'Vérification en attente',
                workingOnTask: 'Travail en cours',
                farmAnalysis: 'Analyse Agricole',
                msgDurabilityCritical: `L'élément sur ${params.land} a ${params.value}% de durabilité restante`,
                msgDurabilityWarning: `L'élément sur ${params.land} est à ${params.value}% de durabilité`,
                msgHarvestReadySoon: `La culture sur ${params.land} est bientôt prête à être récoltée`,
                msgHarvestOverdue: `La culture sur ${params.land} est en retard de récolte`
            },
            es: {
                lowDurabilityAlert: 'Alerta de Durabilidad Baja',
                durabilityWarning: 'Advertencia de Durabilidad',
                harvestReadySoon: 'Cosecha Casi Lista',
                harvestOverdue: 'Cosecha Atrasada',
                unknownLand: 'Terreno Desconocido',
                idle: 'Inactivo',
                pendingVerification: 'Verificación pendiente',
                workingOnTask: 'Trabajando en tarea',
                farmAnalysis: 'Análisis Agrícola',
                msgDurabilityCritical: `El objeto en ${params.land} tiene ${params.value}% de durabilidad restante`,
                msgDurabilityWarning: `El objeto en ${params.land} está al ${params.value}% de durabilidad`,
                msgHarvestReadySoon: `El cultivo en ${params.land} está listo para cosecha`,
                msgHarvestOverdue: `El cultivo en ${params.land} está atrasado para cosecha`
            }
        } as const;

        return s[locale][key as keyof typeof s.en] ?? s.en[key as keyof typeof s.en] ?? key;
    }

    async getDashboardData(userId: string, rawLocale?: string): Promise<FarmerDashboardData> {
        const locale = this.normalizeLocale(rawLocale);

        const [
            heroMetrics,
            alerts,
            lands,
            workers,
            aiSessions
        ] = await Promise.all([
            this.getHeroMetrics(userId),
            this.getSmartAlerts(userId, locale),
            this.getLandsOperational(userId, locale),
            this.getActiveWorkers(userId, locale),
            this.getRecentAISessions(userId, locale)
        ]);

        return {
            heroMetrics,
            alerts,
            lands,
            workers,
            aiSessions
        };
    }

    private async getHeroMetrics(userId: string): Promise<HeroMetrics> {
        // Get current date and month boundaries
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

        // Active Lands: owned lands + rented lands (where user is the investor/renter)
        const ownedLands = await this.landRepo.count({
            where: { owner_id: userId }
        });

        const rentedLands = await this.rentalRepo.count({
            where: {
                investor_id: userId,
                payment_status: In([PaymentStatus.PAID, PaymentStatus.PENDING])
            }
        });

        const activeLands = ownedLands + rentedLands;

        // Open Tasks: non-completed tasks on user's lands or assigned to user's workers
        const userLandIds = await this.getUserLandIds(userId);

        const openTasks = await this.taskRepo.count({
            where: {
                land_id: In(userLandIds),
                status: In([TaskStatus.OPEN, TaskStatus.ASSIGNED, TaskStatus.IN_PROGRESS, TaskStatus.COMPLETED])
            }
        });

        // Overdue Tasks: tasks that have been in progress for too long (>7 days without completion)
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const overdueTasks = await this.taskRepo.count({
            where: {
                land_id: In(userLandIds),
                status: TaskStatus.IN_PROGRESS,
                updatedAt: LessThan(sevenDaysAgo)
            }
        });

        // Pending Item Requests: requests with PENDING status on farmer's lands
        const pendingItemRequests = await this.itemRequestRepo.count({
            where: {
                land: { owner_id: userId },
                status: ItemRequestStatus.PENDING
            }
        });

        // Monthly Revenue: Sum of (itemRequest payments + product sales + land rentals) for current month
        const currentMonthRevenue = await this.calculateRevenue(userId, startOfMonth, now);
        const lastMonthRevenue = await this.calculateRevenue(userId, startOfLastMonth, endOfLastMonth);

        // Calculate trend percentage
        let revenueTrend = 0;
        if (lastMonthRevenue > 0) {
            revenueTrend = ((currentMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100;
        } else if (currentMonthRevenue > 0) {
            revenueTrend = 100; // 100% increase from 0
        }

        return {
            activeLands,
            openTasks,
            overdueTasks,
            pendingItemRequests,
            monthlyRevenue: currentMonthRevenue,
            revenueTrend: Math.round(revenueTrend * 100) / 100,
            lastMonthRevenue
        };
    }

    private async calculateRevenue(userId: string, startDate: Date, endDate: Date): Promise<number> {
        let totalRevenue = 0;

        // 1. Item Request payments (from investors who bought items on farmer's land)
        const itemRequests = await this.itemRequestRepo.find({
            where: {
                land: { owner_id: userId },
                status: ItemRequestStatus.APPROVED,
                updatedAt: MoreThanOrEqual(startDate)
            }
        });

        // Filter by end date in memory (TypeORM Between has issues)
        const filteredItemRequests = itemRequests.filter(
            ir => ir.updatedAt && ir.updatedAt <= endDate
        );

        totalRevenue += filteredItemRequests.reduce((sum, ir) => sum + Number(ir.price_paid || 0), 0);

        // 2. Product sales (farmer selling products)
        const products = await this.productRepo.find({
            where: {
                owner_id: userId,
                status: ProductStatus.SOLD,
                updatedAt: MoreThanOrEqual(startDate)
            }
        });

        const filteredProducts = products.filter(
            p => p.updatedAt && p.updatedAt <= endDate
        );

        totalRevenue += filteredProducts.reduce((sum, p) => sum + (Number(p.price || 0) * Number(p.quantity || 1)), 0);

        // 3. Land rental income (if farmer owns lands that are rented)
        const rentalIncome = await this.rentalRepo.find({
            where: {
                land: { owner_id: userId },
                payment_status: PaymentStatus.PAID,
                rental_start_date: MoreThanOrEqual(startDate)
            },
            relations: ['land']
        });

        const filteredRentals = rentalIncome.filter(
            r => r.rental_start_date && r.rental_start_date <= endDate
        );

        totalRevenue += filteredRentals.reduce((sum, r) => sum + Number(r.monthly_rent || 0), 0);

        return totalRevenue;
    }

    private async getSmartAlerts(userId: string, locale: DashboardLocale = 'en'): Promise<SmartAlert[]> {
        const alerts: SmartAlert[] = [];
        const userLandIds = await this.getUserLandIds(userId);

        // Get all placed items on user's lands with their state
        const placedItems = await this.placedItemRepo.find({
            where: {
                land_id: In(userLandIds),
                is_active: true
            },
            relations: ['land']
        });

        // Calculate durability for each item and create alerts
        for (const item of placedItems) {
            const durability = this.calculateDurability(item);
            const landName = item.land?.name || this.tr(locale, 'unknownLand');

            if (durability < 20) {
                alerts.push({
                    id: `durability-critical-${item.id}`,
                    priority: 'critical',
                    title: this.tr(locale, 'lowDurabilityAlert'),
                    message: this.tr(locale, 'msgDurabilityCritical', { land: landName, value: Math.round(durability) }),
                    actionRoute: '/land-grid',
                    actionData: { landId: item.land_id, itemId: item.id },
                    itemId: item.id,
                    landId: item.land_id
                });
            } else if (durability < 50) {
                alerts.push({
                    id: `durability-warning-${item.id}`,
                    priority: 'warning',
                    title: this.tr(locale, 'durabilityWarning'),
                    message: this.tr(locale, 'msgDurabilityWarning', { land: landName, value: Math.round(durability) }),
                    actionRoute: '/land-grid',
                    actionData: { landId: item.land_id, itemId: item.id },
                    itemId: item.id,
                    landId: item.land_id
                });
            }

            // Check harvest readiness based on completed_cycles
            if (item.state?.completed_cycles !== undefined && item.state?.cycle_days !== undefined) {
                const completedCycles = Number(item.state.completed_cycles) || 0;
                const totalCycles = Number(item.state.cycle_days) || 1;
                const cyclesRemaining = Math.max(0, totalCycles - completedCycles);

                if (cyclesRemaining <= 1 && cyclesRemaining > 0) {
                    alerts.push({
                        id: `harvest-ready-${item.id}`,
                        priority: 'info',
                        title: this.tr(locale, 'harvestReadySoon'),
                        message: this.tr(locale, 'msgHarvestReadySoon', { land: landName }),
                        actionRoute: '/land-grid',
                        actionData: { landId: item.land_id, focusHarvest: true },
                        itemId: item.id,
                        landId: item.land_id
                    });
                } else if (completedCycles >= totalCycles) {
                    alerts.push({
                        id: `harvest-overdue-${item.id}`,
                        priority: 'warning',
                        title: this.tr(locale, 'harvestOverdue'),
                        message: this.tr(locale, 'msgHarvestOverdue', { land: landName }),
                        actionRoute: '/land-grid',
                        actionData: { landId: item.land_id, focusHarvest: true },
                        itemId: item.id,
                        landId: item.land_id
                    });
                }
            }
        }

        // Sort alerts by priority: critical first, then warning, then info
        const priorityOrder = { critical: 0, warning: 1, info: 2 };
        alerts.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

        return alerts;
    }

    private calculateDurability(item: PlacedItem): number {
        // If durability is stored in state, use it
        if (item.state?.durability !== undefined) {
            return Math.max(0, Math.min(100, Number(item.state.durability)));
        }

        // Calculate durability based on time since placement and decay rate
        const placedAt = item.placed_at ? new Date(item.placed_at) : new Date();
        const now = new Date();
        const daysSincePlaced = Math.max(0, (now.getTime() - placedAt.getTime()) / (1000 * 60 * 60 * 24));

        // Decay rates per asset category
        const decayRates: Record<string, number> = {
            'MACHINE': 5,      // -5% per day
            'VEGETATION': 2,   // -2% per day
            'STRUCTURE': 1,    // -1% per day
            'ANIMAL': 3,       // -3% per day
            'TREE': 1.5        // -1.5% per day
        };

        const decayRate = decayRates[item.asset_category] || 2;
        const durability = Math.max(0, 100 - (daysSincePlaced * decayRate));

        return durability;
    }

    private async getLandsOperational(userId: string, locale: DashboardLocale = 'en'): Promise<LandOperational[]> {
        const lands = await this.landRepo.find({
            where: { owner_id: userId },
            relations: ['rentals', 'placed_items']
        });

        const landList: LandOperational[] = [];

        for (const land of lands) {
            // Check if land is rented (someone is paying for it)
            const isRented = land.rentals?.some(
                r => r.payment_status === PaymentStatus.PAID
            );

            // Count active workers
            const activeWorkers = await this.landWorkerRepo.count({
                where: {
                    land_id: land.id,
                    status: LandWorkerStatus.ACTIVE
                }
            });

            // Count open tasks
            const openTasks = await this.taskRepo.count({
                where: {
                    land_id: land.id,
                    status: In([TaskStatus.OPEN, TaskStatus.ASSIGNED, TaskStatus.IN_PROGRESS])
                }
            });

            // Count placed items
            const placedItems = land.placed_items?.length || 0;

            // Check pending item requests
            const pendingRequests = await this.itemRequestRepo.count({
                where: {
                    land_id: land.id,
                    status: ItemRequestStatus.PENDING
                }
            });

            // Check harvest-ready items
            const harvestReadyItems = land.placed_items?.filter(item => {
                const completed = Number(item.state?.completed_cycles) || 0;
                const total = Number(item.state?.cycle_days) || 1;
                return completed >= total;
            }).length || 0;

            let status: LandOperational['status'] = 'owned';
            if (isRented) {
                status = 'rented';
            } else if (harvestReadyItems > 0) {
                status = 'harvest-ready';
            } else if (pendingRequests > 0) {
                status = 'pending-requests';
            }

            landList.push({
                id: land.id,
                name: land.name,
                status,
                activeWorkers,
                openTasks,
                placedItems,
                hasPendingRequests: pendingRequests > 0,
                pendingRequestsCount: pendingRequests,
                harvestReadyCount: harvestReadyItems
            });
        }

        return landList;
    }

    private async getActiveWorkers(userId: string, locale: DashboardLocale = 'en'): Promise<ActiveWorker[]> {
        const userLandIds = await this.getUserLandIds(userId);

        // Get all active land workers
        const landWorkers = await this.landWorkerRepo.find({
            where: {
                land_id: In(userLandIds),
                status: LandWorkerStatus.ACTIVE
            },
            relations: ['worker']
        });

        const workers: ActiveWorker[] = [];

        for (const lw of landWorkers) {
            const worker = lw.worker;
            if (!worker) continue;

            // Get worker's current task if any
            const currentTask = await this.taskRepo.findOne({
                where: {
                    assigned_to: worker.id,
                    status: In([TaskStatus.IN_PROGRESS, TaskStatus.COMPLETED])
                },
                order: { updatedAt: 'DESC' }
            });

            // Get assigned land name
            const land = await this.landRepo.findOne({
                where: { id: lw.land_id }
            });

            let activity = this.tr(locale, 'idle');
            let status: ActiveWorker['status'] = 'idle';

            if (currentTask) {
                if (currentTask.status === TaskStatus.IN_PROGRESS) {
                    activity = currentTask.title || this.tr(locale, 'workingOnTask');
                    status = 'active';
                } else if (currentTask.status === TaskStatus.COMPLETED) {
                    activity = this.tr(locale, 'pendingVerification');
                    status = 'active';
                }
            }

            workers.push({
                id: worker.id,
                name: worker.profile?.name || worker.email || this.tr(locale, 'unknownLand'),
                profilePicture: worker.profile?.picture || null,
                currentActivity: activity,
                status,
                assignedLandId: lw.land_id,
                assignedLandName: land?.name || this.tr(locale, 'unknownLand'),
                currentTaskId: currentTask?.id || null,
                currentTaskTitle: currentTask?.title || null
            });
        }

        return workers;
    }

    private async getRecentAISessions(userId: string, locale: DashboardLocale = 'en'): Promise<AISessionPreview[]> {
        const sessions = await this.sessionRepo.find({
            where: { user_id: userId, is_active: true },
            order: { createdAt: 'DESC' },
            take: 3
        });

        return sessions.map(session => ({
            id: session.id,
            title: session.title || this.tr(locale, 'farmAnalysis'),
            createdAt: session.createdAt,
            messageCount: session.messages?.length || 0
        }));
    }

    private async getUserLandIds(userId: string): Promise<string[]> {
        // Get owned lands
        const ownedLands = await this.landRepo.find({
            where: { owner_id: userId },
            select: ['id']
        });

        // Get rented lands where user is the investor
        const rentedLands = await this.rentalRepo.find({
            where: {
                investor_id: userId,
                payment_status: PaymentStatus.PAID
            },
            select: ['land_id']
        });

        const landIds = [
            ...ownedLands.map(l => l.id),
            ...rentedLands.map(r => r.land_id)
        ];

        return [...new Set(landIds)]; // Remove duplicates
    }

    // Method to repair a placed item (restore durability to 100%)
    async repairPlacedItem(itemId: string, userId: string): Promise<PlacedItem | null> {
        const item = await this.placedItemRepo.findOne({
            where: { id: itemId },
            relations: ['land']
        });

        if (!item) return null;

        // Verify user owns the land
        if (item.land?.owner_id !== userId) {
            throw new Error('Unauthorized: You do not own this land');
        }

        // Update durability to 100%
        const newState = {
            ...item.state,
            durability: 100,
            last_repaired_at: new Date().toISOString()
        };

        item.state = newState;
        await this.placedItemRepo.save(item);

        return item;
    }
}

export const farmerDashboardService = new FarmerDashboardService();
