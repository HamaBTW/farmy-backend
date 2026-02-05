import { AppDataSource } from '../../config/db.config.js';
import { AnimalVariant } from '../../models/AnimalVariant.js';
import { VegetationVariant } from '../../models/VegetationVariant.js';
import { StructureVariant } from '../../models/StructureVariant.js';
import { MachineVariant } from '../../models/MachineVariant.js';
import { AssetCategory } from '../../models/AssetCategory.js';
import { AppError } from '../../middlewares/error.middleware.js';
import { assetTypeService } from './assetType.service.js';

interface CreateVariantData {
    type_id: string;
    variant_code: string;
    base_price: number;
    attributes?: Record<string, any>;
    image_url?: string;
    // Animal specific
    age?: number;
    milk_production?: number;
    meat_yield?: number;
    // Vegetation specific
    growth_days?: number;
    yield_amount?: number;
    water_needs?: number;
    // Structure specific
    capacity?: number;
    durability?: number;
    upgrade_level?: number;
    // Machine specific
    speed?: number;
    efficiency?: number;
    fuel_consumption?: number;
}

class AssetVariantService {
    private animalVariantRepo = AppDataSource.getRepository(AnimalVariant);
    private vegetationVariantRepo = AppDataSource.getRepository(VegetationVariant);
    private structureVariantRepo = AppDataSource.getRepository(StructureVariant);
    private machineVariantRepo = AppDataSource.getRepository(MachineVariant);

    private getRepository(category: AssetCategory) {
        switch (category) {
            case AssetCategory.ANIMAL:
                return this.animalVariantRepo;
            case AssetCategory.VEGETATION:
                return this.vegetationVariantRepo;
            case AssetCategory.STRUCTURE:
                return this.structureVariantRepo;
            case AssetCategory.MACHINE:
                return this.machineVariantRepo;
            default:
                throw new AppError(400, 'Invalid asset category');
        }
    }

    async create(category: AssetCategory, data: CreateVariantData) {
        // Verify type exists
        await assetTypeService.findById(category, data.type_id);

        const repo = this.getRepository(category);
        const existing = await repo.findOne({ where: { variant_code: data.variant_code } as any });
        if (existing) {
            throw new AppError(400, `Variant with code "${data.variant_code}" already exists`);
        }

        const entity = repo.create(data as any);
        return (repo as any).save(entity);
    }

    async findAll(category: AssetCategory, typeId?: string, includeUnavailable = false) {
        const repo = this.getRepository(category);
        const where: any = {};

        if (typeId) {
            where.type_id = typeId;
        }
        if (!includeUnavailable) {
            where.is_available = true;
        }

        return repo.find({
            where,
            relations: ['type'],
            order: { variant_code: 'ASC' } as any
        });
    }

    async findById(category: AssetCategory, id: string) {
        const repo = this.getRepository(category);
        const entity = await repo.findOne({
            where: { id } as any,
            relations: ['type']
        });
        if (!entity) {
            throw new AppError(404, `${category} variant not found`);
        }
        return entity;
    }

    async findByVariantCode(category: AssetCategory, variantCode: string) {
        const repo = this.getRepository(category);
        const entity = await repo.findOne({
            where: { variant_code: variantCode } as any,
            relations: ['type']
        });
        if (!entity) {
            throw new AppError(404, `${category} variant with code "${variantCode}" not found`);
        }
        return entity;
    }

    async update(category: AssetCategory, id: string, data: Partial<CreateVariantData & { is_available: boolean }>) {
        const repo = this.getRepository(category);
        const entity = await this.findById(category, id);

        if (data.variant_code && data.variant_code !== (entity as any).variant_code) {
            const existing = await repo.findOne({ where: { variant_code: data.variant_code } as any });
            if (existing) {
                throw new AppError(400, `Variant with code "${data.variant_code}" already exists`);
            }
        }

        if (data.type_id) {
            await assetTypeService.findById(category, data.type_id);
        }

        Object.assign(entity, data);
        return (repo as any).save(entity);
    }

    async delete(category: AssetCategory, id: string) {
        const repo = this.getRepository(category);
        await this.findById(category, id);
        await repo.delete(id);
        return { message: `${category} variant deleted successfully` };
    }

    async toggleAvailable(category: AssetCategory, id: string) {
        const entity = await this.findById(category, id);
        (entity as any).is_available = !(entity as any).is_available;
        const repo = this.getRepository(category);
        return (repo as any).save(entity);
    }

    async getVariantWithPrice(category: AssetCategory, variantId: string) {
        const variant = await this.findById(category, variantId);
        return {
            ...variant,
            final_price: (variant as any).base_price
        };
    }
}

export const assetVariantService = new AssetVariantService();
