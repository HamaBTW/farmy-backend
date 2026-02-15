import { AppDataSource } from '../../config/db.config.js';
import { Product, ProductStatus } from '../../models/Product.js';
import { User } from '../../models/User.js';
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
    newImages?: string[];
}

class ProductService {
    private productRepo = AppDataSource.getRepository(Product);
    private userRepo = AppDataSource.getRepository(User);

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

        // Handle image updates
        if (data.newImages && data.newImages.length > 0) {
            // Append new images to existing ones
            // Ensure images array exists
            const currentImages = product.images || [];
            data.images = [...currentImages, ...data.newImages];
            delete data.newImages; // Remove auxiliary property
        }

        Object.assign(product, data);

        return this.productRepo.save(product);
    }

    async delete(id: string, userId: string) {
        const product = await this.findById(id);

        if (product.owner_id !== userId) {
            throw new AppError(403, 'You are not authorized to delete this product');
        }

        return this.productRepo.remove(product);
    }

    async buy(id: string, buyerId: string, quantity: number = 1) {
        return AppDataSource.transaction(async (transactionalEntityManager) => {
            const product = await transactionalEntityManager.findOne(Product, {
                where: { id },
                relations: ['owner']
            });

            if (!product) {
                throw new AppError(404, 'Product not found');
            }

            if (product.status !== ProductStatus.AVAILABLE) {
                throw new AppError(400, 'Product is not available for sale');
            }

            if (Number(product.quantity) < quantity) {
                throw new AppError(400, `Insufficient stock. Only ${product.quantity} available.`);
            }

            if (product.owner_id === buyerId) {
                throw new AppError(400, 'You cannot buy your own product');
            }

            const buyer = await transactionalEntityManager.findOne(User, { where: { id: buyerId } });
            if (!buyer) {
                throw new AppError(404, 'Buyer not found');
            }

            const unitPrice = Number(product.price);
            const totalPrice = unitPrice * quantity; // Calculate total price

            if (Number(buyer.credits) < totalPrice) {
                throw new AppError(400, 'Insufficient credits');
            }

            // Deduct from buyer
            buyer.credits = Number(buyer.credits) - totalPrice;
            await transactionalEntityManager.save(buyer);

            // Add to owner
            const owner = await transactionalEntityManager.findOne(User, { where: { id: product.owner_id } });
            if (owner) {
                owner.credits = Number(owner.credits) + totalPrice;
                await transactionalEntityManager.save(owner);
            }

            // Decrement quantity
            product.quantity = Number(product.quantity) - quantity;

            // Update status only if out of stock
            if (product.quantity === 0) {
                product.status = ProductStatus.SOLD;
            }

            await transactionalEntityManager.save(product);

            return {
                success: true,
                message: 'Purchase successful',
                product,
                new_balance: buyer.credits,
                remaining_quantity: product.quantity
            };
        });
    }
}

export const productService = new ProductService();
