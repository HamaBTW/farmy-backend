import { AppDataSource } from '../../config/db.config.js';
import { AnimalType } from '../../models/AnimalType.js';
import { VegetationType } from '../../models/VegetationType.js';
import { TreeType } from '../../models/TreeType.js';
import { StructureType } from '../../models/StructureType.js';
import { MachineType } from '../../models/MachineType.js';
import { AssetCategory } from '../../models/AssetCategory.js';
import { AppError } from '../../middlewares/error.middleware.js';

class AssetTypeService {
    private animalTypeRepo = AppDataSource.getRepository(AnimalType);
    private vegetationTypeRepo = AppDataSource.getRepository(VegetationType);
    private treeTypeRepo = AppDataSource.getRepository(TreeType);
    private structureTypeRepo = AppDataSource.getRepository(StructureType);
    private machineTypeRepo = AppDataSource.getRepository(MachineType);

    private getRepository(category: AssetCategory) {
        switch (category) {
            case AssetCategory.ANIMAL:
                return this.animalTypeRepo;
            case AssetCategory.VEGETATION:
                return this.vegetationTypeRepo;
            case AssetCategory.TREE:
                return this.treeTypeRepo;
            case AssetCategory.STRUCTURE:
                return this.structureTypeRepo;
            case AssetCategory.MACHINE:
                return this.machineTypeRepo;
            default:
                throw new AppError(400, 'Invalid asset category');
        }
    }

    async create(category: AssetCategory, data: { name: string; description?: string; icon_url?: string }) {
        const repo = this.getRepository(category);
        const existing = await repo.findOne({ where: { name: data.name } as any });
        if (existing) {
            throw new AppError(400, `${category} type with name "${data.name}" already exists`);
        }
        const entity = repo.create(data as any);
        return (repo as any).save(entity);
    }

    async findAll(category: AssetCategory, includeInactive = false) {
        const repo = this.getRepository(category);
        const where = includeInactive ? {} : { is_active: true };
        return repo.find({ where: where as any, order: { name: 'ASC' } as any });
    }

    async findAllWithVariants(category: AssetCategory, includeInactive = false) {
        const repo = this.getRepository(category);
        const where = includeInactive ? {} : { is_active: true };
        return repo.find({
            where: where as any,
            order: { name: 'ASC' } as any,
            relations: ['variants']
        });
    }

    async findById(category: AssetCategory, id: string) {
        const repo = this.getRepository(category);
        const entity = await repo.findOne({ where: { id } as any });
        if (!entity) {
            throw new AppError(404, `${category} type not found`);
        }
        return entity;
    }

    async findByIdWithVariants(category: AssetCategory, id: string) {
        const repo = this.getRepository(category);
        const entity = await repo.findOne({
            where: { id } as any,
            relations: ['variants']
        });
        if (!entity) {
            throw new AppError(404, `${category} type not found`);
        }
        return entity;
    }

    async update(category: AssetCategory, id: string, data: Partial<{ name: string; description: string; icon_url: string; is_active: boolean }>) {
        const repo = this.getRepository(category);
        const entity = await this.findById(category, id);

        if (data.name && data.name !== (entity as any).name) {
            const existing = await repo.findOne({ where: { name: data.name } as any });
            if (existing) {
                throw new AppError(400, `${category} type with name "${data.name}" already exists`);
            }
        }

        Object.assign(entity, data);
        return (repo as any).save(entity);
    }

    async delete(category: AssetCategory, id: string) {
        const repo = this.getRepository(category);
        await this.findById(category, id);
        await repo.delete(id);
        return { message: `${category} type deleted successfully` };
    }

    async toggleActive(category: AssetCategory, id: string) {
        const entity = await this.findById(category, id);
        (entity as any).is_active = !(entity as any).is_active;
        const repo = this.getRepository(category);
        return (repo as any).save(entity);
    }
}

export const assetTypeService = new AssetTypeService();
