import { AppDataSource } from '../../config/db.config.js';
import { ProductType } from '../../models/ProductType.js';
import { AssetProduction } from '../../models/AssetProduction.js';
import { AssetCategory } from '../../models/AssetCategory.js';
import { AppError } from '../../middlewares/error.middleware.js';
import { assetVariantService } from './assetVariant.service.js';

class ProductionService {
    private productTypeRepo = AppDataSource.getRepository(ProductType);
    private assetProductionRepo = AppDataSource.getRepository(AssetProduction);

    // ============ PRODUCT TYPES ============

    async createProductType(data: { name: string; unit: string; description?: string; icon_url?: string }) {
        const existing = await this.productTypeRepo.findOne({ where: { name: data.name } });
        if (existing) {
            throw new AppError(400, `Product type "${data.name}" already exists`);
        }
        const entity = this.productTypeRepo.create(data);
        return this.productTypeRepo.save(entity);
    }

    async findAllProductTypes(includeInactive = false) {
        const where = includeInactive ? {} : { is_active: true };
        return this.productTypeRepo.find({ where, order: { name: 'ASC' } });
    }

    async findProductTypeById(id: string) {
        const entity = await this.productTypeRepo.findOne({ where: { id } });
        if (!entity) {
            throw new AppError(404, 'Product type not found');
        }
        return entity;
    }

    async updateProductType(id: string, data: Partial<{ name: string; unit: string; description: string; icon_url: string; is_active: boolean }>) {
        const entity = await this.findProductTypeById(id);

        if (data.name && data.name !== entity.name) {
            const existing = await this.productTypeRepo.findOne({ where: { name: data.name } });
            if (existing) {
                throw new AppError(400, `Product type "${data.name}" already exists`);
            }
        }

        Object.assign(entity, data);
        return this.productTypeRepo.save(entity);
    }

    async deleteProductType(id: string) {
        await this.findProductTypeById(id);
        await this.productTypeRepo.delete(id);
        return { message: 'Product type deleted successfully' };
    }

    // ============ ASSET PRODUCTIONS ============

    async addProduction(data: {
        variant_id: string;
        asset_category: AssetCategory;
        product_id: string;
        rate_per_cycle: number;
        cycle_days?: number;
        on_harvest_only?: boolean;
        min_level?: number;
        conditions?: Record<string, any>;
    }) {
        // Verify variant exists
        await assetVariantService.findById(data.asset_category, data.variant_id);
        // Verify product exists
        await this.findProductTypeById(data.product_id);

        // Check for duplicate
        const existing = await this.assetProductionRepo.findOne({
            where: {
                variant_id: data.variant_id,
                asset_category: data.asset_category,
                product_id: data.product_id
            }
        });
        if (existing) {
            throw new AppError(400, 'This variant already has this production defined');
        }

        const entity = this.assetProductionRepo.create(data);
        return this.assetProductionRepo.save(entity);
    }

    async getProductionsForVariant(category: AssetCategory, variantId: string) {
        return this.assetProductionRepo.find({
            where: { variant_id: variantId, asset_category: category },
            relations: ['product']
        });
    }

    async updateProduction(productionId: string, data: Partial<{
        rate_per_cycle: number;
        cycle_days: number;
        on_harvest_only: boolean;
        min_level: number;
        conditions: Record<string, any>;
    }>) {
        const entity = await this.assetProductionRepo.findOne({ where: { id: productionId } });
        if (!entity) {
            throw new AppError(404, 'Asset production not found');
        }

        Object.assign(entity, data);
        return this.assetProductionRepo.save(entity);
    }

    async removeProduction(productionId: string) {
        const entity = await this.assetProductionRepo.findOne({ where: { id: productionId } });
        if (!entity) {
            throw new AppError(404, 'Asset production not found');
        }
        await this.assetProductionRepo.delete(productionId);
        return { message: 'Production removed successfully' };
    }

    async getVariantWithProductions(category: AssetCategory, variantId: string) {
        const variant = await assetVariantService.findById(category, variantId);
        const productions = await this.getProductionsForVariant(category, variantId);
        return {
            ...variant,
            productions
        };
    }
}

export const productionService = new ProductionService();
