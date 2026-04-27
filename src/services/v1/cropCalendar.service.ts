import { AppDataSource } from '../../config/db.config.js';
import { CropPlan, CropPlanStatus } from '../../models/CropPlan.js';
import { PlacedItem } from '../../models/PlacedItem.js';
import { Land } from '../../models/Land.js';
import { Repository, IsNull, Not } from 'typeorm';

export class CropCalendarService {
    private cropPlanRepository: Repository<CropPlan>;
    private placedItemRepository: Repository<PlacedItem>;
    private landRepository: Repository<Land>;

    constructor() {
        this.cropPlanRepository = AppDataSource.getRepository(CropPlan);
        this.placedItemRepository = AppDataSource.getRepository(PlacedItem);
        this.landRepository = AppDataSource.getRepository(Land);
    }

    /**
     * Get crop cycles (from placed items) for a land
     * These are the actual growing crops derived from placed items
     */
    async getCropCycles(landId: string, userId: string): Promise<any[]> {
        // Verify land ownership
        const land = await this.landRepository.findOne({
            where: { id: landId, owner_id: userId }
        });

        if (!land) {
            throw new Error('Land not found or access denied');
        }

        // Get placed items that are vegetation or trees
        const placedItems = await this.placedItemRepository.find({
            where: { land_id: landId },
            relations: ['request']
        });

        return placedItems
            .filter(item => {
                const category = item.asset_category?.toLowerCase();
                return category === 'vegetation' || category === 'tree';
            })
            .map(item => {
                // Calculate status based on planted date
                const plantedAt = item.createdAt || new Date();
                const now = new Date();
                const daysGrowing = Math.floor((now.getTime() - plantedAt.getTime()) / (1000 * 60 * 60 * 24));
                const totalDays = 30; // Default, should be fetched from variant
                const progress = Math.min(daysGrowing / totalDays, 1);
                
                let status = 'growing';
                if (progress >= 1) status = 'ready';
                if (item.is_active === false) status = 'completed';

                return {
                    id: item.id,
                    land_id: landId,
                    variant_id: item.variant_id,
                    asset_category: item.asset_category,
                    variant_name: 'Unknown', // Will be populated by frontend service
                    placed_at: item.createdAt,
                    growth_days: null,
                    cycle_days: 30,
                    is_perennial: false,
                    status,
                    progress,
                    days_growing: daysGrowing,
                    next_harvest: progress >= 1 ? null : new Date(plantedAt.getTime() + totalDays * 24 * 60 * 60 * 1000),
                    harvest_count: 0,
                };
            });
    }

    /**
     * Get crop plans for a land
     */
    async getCropPlans(landId: string, userId: string): Promise<CropPlan[]> {
        // Verify land ownership
        const land = await this.landRepository.findOne({
            where: { id: landId, owner_id: userId }
        });

        if (!land) {
            throw new Error('Land not found or access denied');
        }

        return this.cropPlanRepository.find({
            where: { land_id: landId },
            order: { planned_planting_date: 'ASC' }
        });
    }

    /**
     * Create a new crop plan
     */
    async createCropPlan(data: Partial<CropPlan>, userId: string): Promise<CropPlan> {
        // Verify land ownership
        const land = await this.landRepository.findOne({
            where: { id: data.land_id, owner_id: userId }
        });

        if (!land) {
            throw new Error('Land not found or access denied');
        }

        // Calculate expected harvest date if not provided
        if (!data.expected_harvest_date && data.planned_planting_date) {
            const days = data.growth_days || data.cycle_days || 30;
            const harvestDate = new Date(data.planned_planting_date);
            harvestDate.setDate(harvestDate.getDate() + days);
            data.expected_harvest_date = harvestDate;
        }

        const plan = this.cropPlanRepository.create({
            ...data,
            created_by: userId,
            status: CropPlanStatus.PLANNED
        });

        return this.cropPlanRepository.save(plan);
    }

    /**
     * Update a crop plan
     */
    async updateCropPlan(
        planId: string, 
        userId: string, 
        updates: Partial<CropPlan>
    ): Promise<CropPlan | null> {
        const plan = await this.cropPlanRepository.findOne({
            where: { id: planId },
            relations: ['land']
        });

        if (!plan) {
            throw new Error('Crop plan not found');
        }

        // Verify ownership
        const land = await this.landRepository.findOne({
            where: { id: plan.land_id, owner_id: userId }
        });

        if (!land) {
            throw new Error('Access denied');
        }

        // Recalculate expected harvest if planting date or days changed
        if ((updates.planned_planting_date || updates.growth_days || updates.cycle_days) 
            && !updates.expected_harvest_date) {
            const plantingDate = updates.planned_planting_date || plan.planned_planting_date;
            const days = updates.growth_days || updates.cycle_days || plan.growth_days || plan.cycle_days || 30;
            const harvestDate = new Date(plantingDate);
            harvestDate.setDate(harvestDate.getDate() + days);
            updates.expected_harvest_date = harvestDate;
        }

        await this.cropPlanRepository.update(planId, updates);
        return this.cropPlanRepository.findOne({ where: { id: planId } });
    }

    /**
     * Delete a crop plan
     */
    async deleteCropPlan(planId: string, userId: string): Promise<boolean> {
        const plan = await this.cropPlanRepository.findOne({
            where: { id: planId }
        });

        if (!plan) {
            throw new Error('Crop plan not found');
        }

        // Verify ownership
        const land = await this.landRepository.findOne({
            where: { id: plan.land_id, owner_id: userId }
        });

        if (!land) {
            throw new Error('Access denied');
        }

        const result = await this.cropPlanRepository.delete(planId);
        return result.affected ? result.affected > 0 : false;
    }

    /**
     * Get all crop plans for a user across all lands
     */
    async getAllCropPlans(userId: string): Promise<CropPlan[]> {
        const lands = await this.landRepository.find({
            where: { owner_id: userId }
        });

        const landIds = lands.map(l => l.id);

        if (landIds.length === 0) return [];

        return this.cropPlanRepository.find({
            where: { land_id: { $in: landIds } as any },
            order: { planned_planting_date: 'ASC' }
        });
    }

    /**
     * Get upcoming harvests across all lands
     */
    async getUpcomingHarvests(userId: string, days: number = 30): Promise<any[]> {
        const lands = await this.landRepository.find({
            where: { owner_id: userId }
        });

        const landIds = lands.map(l => l.id);
        if (landIds.length === 0) return [];

        const now = new Date();
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + days);

        // Get plans ready for harvest
        const plans = await this.cropPlanRepository.find({
            where: {
                land_id: { $in: landIds } as any,
                status: CropPlanStatus.ACTIVE,
                expected_harvest_date: { $lte: futureDate } as any
            }
        });

        return plans;
    }
}

export const cropCalendarService = new CropCalendarService();
