import { AppDataSource } from '../../config/db.config.js';
import { Product, ProductStatus } from '../../models/Product.js';
import { User } from '../../models/User.js';
import { AppError } from '../../middlewares/error.middleware.js';
import { FindOptionsWhere, Like } from 'typeorm';
import { firebaseService } from './firebase.service.js';
import { NotificationType } from '../../models/Notification.js';

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
    land_id?: string | null;
    land_rental_id?: string | null;
}

class ProductService {
    private productRepo = AppDataSource.getRepository(Product);
    private userRepo = AppDataSource.getRepository(User);

    async create(data: CreateProductData) {
        // Sanitize empty strings from multipart forms
        if (!data.land_id || data.land_id.trim() === '') data.land_id = undefined;
        if (!data.land_rental_id || data.land_rental_id.trim() === '') data.land_rental_id = undefined;

        if (data.land_id && data.land_rental_id) {
            throw new AppError(400, 'A product cannot be linked to both a land and a land rental simultaneously.');
        }

        if (data.land_id) {
            const { Land } = await import('../../models/Land.js');
            const land = await AppDataSource.getRepository(Land).findOne({ 
                where: { id: data.land_id, owner_id: data.owner_id } 
            });
            if (!land) {
                throw new AppError(403, 'You do not own the selected land or it does not exist.');
            }
        }

        if (data.land_rental_id) {
            const { LandRental } = await import('../../models/LandRental.js');
            const rental = await AppDataSource.getRepository(LandRental).findOne({ 
                where: { id: data.land_rental_id, investor_id: data.owner_id } 
            });
            if (!rental) {
                throw new AppError(403, 'You do not rent the selected land or it does not exist.');
            }
        }

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

        // Sanitize empty strings from multipart forms
        if ('land_id' in data && (!data.land_id || (typeof data.land_id === 'string' && data.land_id.trim() === ''))) {
            data.land_id = null;
        }
        if ('land_rental_id' in data && (!data.land_rental_id || (typeof data.land_rental_id === 'string' && data.land_rental_id.trim() === ''))) {
            data.land_rental_id = null;
        }

        // Handle land origin updates with mutual exclusivity
        if ('land_id' in data || 'land_rental_id' in data) {
            if (data.land_id && data.land_rental_id) {
                throw new AppError(400, 'A product cannot be linked to both a land and a land rental simultaneously.');
            }

            if (data.land_id) {
                const { Land } = await import('../../models/Land.js');
                const land = await AppDataSource.getRepository(Land).findOne({
                    where: { id: data.land_id, owner_id: userId }
                });
                if (!land) {
                    throw new AppError(403, 'You do not own the selected land or it does not exist.');
                }
                product.land_id = data.land_id;
                product.land_rental_id = null;
                // Clear relation objects to prevent TypeORM from reverting FK changes
                product.land = land;
                product.land_rental = null;
            } else if (data.land_rental_id) {
                const { LandRental } = await import('../../models/LandRental.js');
                const rental = await AppDataSource.getRepository(LandRental).findOne({
                    where: { id: data.land_rental_id, investor_id: userId }
                });
                if (!rental) {
                    throw new AppError(403, 'You do not rent the selected land or it does not exist.');
                }
                product.land_rental_id = data.land_rental_id;
                product.land_id = null;
                // Clear relation objects to prevent TypeORM from reverting FK changes
                product.land_rental = rental;
                product.land = null;
            } else {
                // Both are null/empty — unlink
                product.land_id = null;
                product.land_rental_id = null;
                product.land = null;
                product.land_rental = null;
            }

            delete data.land_id;
            delete data.land_rental_id;
        }

        // Handle image updates
        if (data.newImages && data.newImages.length > 0) {
            const currentImages = product.images || [];
            data.images = [...currentImages, ...data.newImages];
            delete data.newImages;
        }

        // Apply remaining fields
        const { land_id: _lid, land_rental_id: _lrid, newImages: _ni, ...safeData } = data as any;
        Object.assign(product, safeData);

        // Use query builder to ensure FK columns are written directly
        await this.productRepo
            .createQueryBuilder()
            .update()
            .set({
                title: product.title,
                description: product.description,
                price: product.price,
                quantity: product.quantity,
                unit: product.unit,
                status: product.status,
                images: product.images,
                land_id: product.land_id,
                land_rental_id: product.land_rental_id,
            })
            .where('id = :id', { id })
            .execute();

        // Return the fully hydrated product
        return this.findById(id);
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

            // Create Purchase Record
            const { ProductPurchase } = await import('../../models/ProductPurchase.js');
            const purchase = transactionalEntityManager.create(ProductPurchase, {
                product_id: product.id,
                buyer_id: buyerId,
                seller_id: product.owner_id,
                product_name: product.title,
                quantity: quantity,
                total_price: totalPrice,
            });
            const savedPurchase = await transactionalEntityManager.save(purchase);

            // Non-blocking Hedera Record
            const { hederaService } = await import('./HederaService.js');
            hederaService.recordPurchase({
                type: 'item_purchase',
                user_id: buyerId,
                item_id: savedPurchase.id,
                item_name: `Product Purchase: ${product.title} (x${quantity})`,
                amount: totalPrice,
                currency: 'usd',
                payment_method: 'credits',
                timestamp: new Date().toISOString(),
                metadata: {
                    purchase_id: savedPurchase.id,
                    product_id: product.id,
                    seller_id: product.owner_id,
                    quantity: quantity,
                    unit_price: unitPrice,
                },
            }).then(async (hederaTxId) => {
                if (hederaTxId) {
                    savedPurchase.hedera_transaction_id = hederaTxId;
                    await AppDataSource.getRepository(ProductPurchase).save(savedPurchase);
                }
            }).catch((err) => {
                console.error('[HederaService] Non-fatal error recording product purchase:', err);
            });

            // Notify Seller (non-blocking)
            const buyerName = buyer.profile?.name || buyer.email.split('@')[0];
            firebaseService.sendToUsers(
                product.owner_id,
                'Item Sold!',
                `${buyerName} bought ${quantity} of ${product.title}.`,
                { product_id: product.id, quantity, total_price: totalPrice },
                NotificationType.PURCHASE
            ).catch(err => console.error('[ProductService] Failed to send notification:', err));

            // Create Delivery record (non-blocking)
            const { deliveryService } = await import('./delivery.service.js');
            deliveryService.createForOrder({
                orderId: savedPurchase.id,
                buyerId: buyerId,
                sellerId: product.owner_id,
                deliveryAddress: buyer.profile?.city ?? undefined,
                destinationLatitude: buyer.location?.latitude,
                destinationLongitude: buyer.location?.longitude,
                estimatedMinutes: 60
            }).catch(err => console.error('[ProductService] Failed to create delivery:', err));

            return {
                success: true,
                message: 'Purchase successful',
                product,
                purchase_id: savedPurchase.id,
                new_balance: buyer.credits,
                remaining_quantity: product.quantity
            };
        });
    }
}

export const productService = new ProductService();
