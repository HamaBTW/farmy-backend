import { AppDataSource } from '../../config/db.config.js';
import { Product, ProductStatus } from '../../models/Product.js';
import { AppError } from '../../middlewares/error.middleware.js';
import { FindOptionsWhere, Like } from 'typeorm';

interface CreateProductData {
    title: string;
    description?: string;
    price: number;
    quantity: number;
    unit: string;
    product_type_id: string;
    owner_id: string;
    land_id?: string;
    land_rental_id?: string;
    images?: string[];
}

interface UpdateProductData {
    title?: string;
    description?: string;
    price?: number;
    quantity?: number;
    unit?: string;
    status?: ProductStatus;
    images?: string[];
}

class ProductService {
    private productRepo = AppDataSource.getRepository(Product);

    async create(data: CreateProductData) {
        const product = this.productRepo.create({
            ...data,
            status: ProductStatus.AVAILABLE
        });

        return this.productRepo.save(product);
    }

    async findAll(filters: {
        owner_id?: string;
        land_id?: string;
        product_type_id?: string;
        status?: ProductStatus;
        search?: string;
    }) {
        const where: FindOptionsWhere<Product> = {};

        if (filters.owner_id) where.owner_id = filters.owner_id;
        if (filters.land_id) where.land_id = filters.land_id;
        if (filters.product_type_id) where.product_type_id = filters.product_type_id;
        if (filters.status) where.status = filters.status;
        if (filters.search) {
            where.title = Like(`%${filters.search}%`);
        }

        return this.productRepo.find({
            where,
            relations: ['owner', 'product_type', 'land', 'land_rental'],
            order: { createdAt: 'DESC' }
        });
    }

    async findById(id: string) {
        const product = await this.productRepo.findOne({
            where: { id },
            relations: ['owner', 'product_type', 'land', 'land_rental']
        });

        if (!product) {
            throw new AppError(404, 'Product not found');
        }

        return product;
    }

    async update(id: string, userId: string, data: UpdateProductData) {
        const product = await this.findById(id);

        if (product.owner_id !== userId) {
            throw new AppError(403, 'You are not authorized to update this product');
        }

        Object.assign(product, data);

        return this.productRepo.save(product);
    }

    async delete(id: string, userId: string) {
        const product = await this.findById(id);

        if (product.owner_id !== userId) {
            throw new AppError(403, 'You are not authorized to delete this product');
        }

        // Soft delete by setting status to HIDDEN or actually removing if desired.
        // For marketplace, usually hiding is safer or marking as deleted.
        // Let's just remove it for now as per standard CRUD, or use soft delete pattern if BaseEntity supports it.
        // BaseEntity usually extends TypeORM BaseEntity.

        // Let's implement soft delete via status for now to be safe, or Entity.remove() if we want hard delete.
        // User asked to "remove/hide". Let's use remove for now, or updating status to hidden.
        // Let's stick to simple remove for simplicity unless status is preferred. 
        // Actually, let's just use remove() which is hard delete, but since we have HIDDEN status, maybe update status?
        // Let's do hard delete for "DELETE" endpoint.

        return this.productRepo.remove(product);
    }
}

export const productService = new ProductService();
