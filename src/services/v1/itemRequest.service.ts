import { AppDataSource } from '../../config/db.config.js';
import { ItemRequest } from '../../models/ItemRequest.js';
import { PlacedItem } from '../../models/PlacedItem.js';
import { LandRental } from '../../models/LandRental.js';
import { User } from '../../models/User.js';
import { AssetCategory, ItemRequestStatus } from '../../models/AssetCategory.js';
import { AppError } from '../../middlewares/error.middleware.js';
import { assetVariantService } from './assetVariant.service.js';
import { landService } from './land.service.js';
import { stripeService } from './StripeService.js';
import { getIO } from '../../socket/socket.js';

interface CreateItemRequestData {
    user_id: string;
    land_id: string;
    asset_category: AssetCategory;
    variant_id: string;
    position_x: number;
    position_y: number;
    payment_method_id?: string;
}

class ItemRequestService {
    private itemRequestRepo = AppDataSource.getRepository(ItemRequest);
    private placedItemRepo = AppDataSource.getRepository(PlacedItem);
    private landRentalRepo = AppDataSource.getRepository(LandRental);
    private userRepo = AppDataSource.getRepository(User);

    async create(data: CreateItemRequestData) {
        // Verify land exists and user is owner OR investor
        try {
            await landService.verifyOwnership(data.land_id, data.user_id);
        } catch (error) {
            // Not the owner, check if legitimate investor
            const rental = await this.landRentalRepo.findOne({
                where: {
                    land_id: data.land_id,
                    investor_id: data.user_id
                }
            });

            if (!rental) {
                throw new AppError(403, 'You do not have permission to place items on this land.');
            }
        }

        // Verify position is valid
        const isValid = await landService.isPositionValid(data.land_id, data.position_x, data.position_y);
        if (!isValid) {
            throw new AppError(400, 'Position is outside land boundaries');
        }

        // Check if position is already occupied
        const isOccupied = await landService.isPositionOccupied(data.land_id, data.position_x, data.position_y);
        if (isOccupied) {
            throw new AppError(400, 'Position is already occupied');
        }

        // Get variant and price
        const variant = await assetVariantService.getVariantWithPrice(data.asset_category, data.variant_id);
        if (!(variant as any).is_available) {
            throw new AppError(400, 'This variant is not available for purchase');
        }

        const price = (variant as any).final_price;

        if (price > 0) {
            const user = await this.userRepo.findOne({ where: { id: data.user_id } });
            if (!user) throw new AppError(404, 'User not found');

            if (data.payment_method_id) {
                // If user doesn't have stripe customer id, create one 
                if (!user.stripe_customer_id) {
                    const customer = await stripeService.createCustomer(user.email, (user.profile as any)?.name);
                    user.stripe_customer_id = customer.id;
                    await this.userRepo.save(user);
                }

                try {
                    await stripeService.chargeSavedCard(
                        price,
                        'usd',
                        user.stripe_customer_id,
                        data.payment_method_id
                    );
                } catch (error: any) {
                    throw new AppError(402, `Payment failed: ${error.message}`);
                }
            } else {
                // Pay with Credits
                if (Number(user.credits) >= price) {
                    user.credits = Number(user.credits) - Number(price);
                    await this.userRepo.save(user);
                } else {
                    throw new AppError(402, 'Insufficient credits. Please top up or provide a payment method.');
                }
            }
        }

        const itemRequest = this.itemRequestRepo.create({
            ...data,
            price_paid: price,
            status: ItemRequestStatus.PENDING
        });

        return this.itemRequestRepo.save(itemRequest);
    }

    async findAll(filters?: {
        user_id?: string;
        land_id?: string;
        status?: ItemRequestStatus;
        asset_category?: AssetCategory;
    }) {
        const where: any = {};
        if (filters?.user_id) where.user_id = filters.user_id;
        if (filters?.land_id) where.land_id = filters.land_id;
        if (filters?.status) where.status = filters.status;
        if (filters?.asset_category) where.asset_category = filters.asset_category;

        return this.itemRequestRepo.find({
            where,
            relations: ['user', 'land'],
            order: { createdAt: 'DESC' }
        });
    }

    async findById(id: string) {
        const request = await this.itemRequestRepo.findOne({
            where: { id },
            relations: ['user', 'land', 'placed_item']
        });
        if (!request) {
            throw new AppError(404, 'Item request not found');
        }
        return request;
    }

    async findByUser(userId: string) {
        return this.itemRequestRepo.find({
            where: { user_id: userId },
            relations: ['land'],
            order: { createdAt: 'DESC' }
        });
    }

    async findPending() {
        return this.itemRequestRepo.find({
            where: { status: ItemRequestStatus.PENDING },
            relations: ['user', 'land'],
            order: { createdAt: 'ASC' }
        });
    }

    async findIncomingForFarmer(farmerId: string) {
        const requests = await this.itemRequestRepo.find({
            where: {
                land: { owner_id: farmerId },
                status: ItemRequestStatus.PENDING
            },
            relations: ['user', 'land'],
            order: { createdAt: 'ASC' }
        });

        // Enrich with item details
        const enrichedRequests = await Promise.all(requests.map(async (request) => {
            try {
                const variant = await assetVariantService.findById(request.asset_category, request.variant_id);
                return {
                    ...request,
                    item_details: {
                        name: (variant as any).type?.name || 'Unknown Item',
                        variant_name: (variant as any).variant_code || 'Standard',
                        image_url: (variant as any).image_url || (variant as any).type?.icon_url || null,
                    }
                };
            } catch (e) {
                console.error(`Failed to fetch variant details for request ${request.id}`, e);
                return {
                    ...request,
                    item_details: { name: 'Unknown Item', variant_name: 'Unknown', image_url: null }
                };
            }
        }));

        return enrichedRequests;
    }

    async findInvestorInventory(investorId: string, landId?: string) {
        // Fetch ALL requests (Pending, Approved, Rejected)
        const where: any = { user_id: investorId };
        if (landId) {
            where.land_id = landId;
        }

        const requests = await this.itemRequestRepo.find({
            where,
            relations: ['land', 'placed_item'],
            order: { createdAt: 'DESC' }
        });

        // Aggregate details
        const enrichedItems = await Promise.all(requests.map(async (request) => {
            try {
                const variant = await assetVariantService.findById(request.asset_category, request.variant_id);
                return {
                    ...request,
                    details: {
                        name: (variant as any).type?.name || 'Unknown',
                        variant_name: (variant as any).variant_code,
                        image_url: (variant as any).image_url || (variant as any).type?.icon_url,
                    }
                };
            } catch (e) {
                console.error(`Failed to fetch variant details for request ${request.id}`, e);
                return {
                    ...request,
                    details: { name: 'Unknown Item', variant_name: 'Unknown', image_url: null }
                };
            }
        }));

        return enrichedItems;
    }

    async approve(id: string, adminId: string) {
        const request = await this.findById(id);

        if (request.status !== ItemRequestStatus.PENDING) {
            throw new AppError(400, `Request has already been ${request.status}`);
        }

        // Update request status to APPROVED (Do NOT place item yet)
        request.status = ItemRequestStatus.APPROVED;
        request.processed_at = new Date();
        request.processed_by = adminId;

        const savedRequest = await this.itemRequestRepo.save(request);

        // Notify Investor
        try {
            getIO().to(request.user_id).emit('notification', {
                type: 'success',
                title: 'Request Approved',
                message: `Your request for ${request.asset_category} has been approved! You can now place it on your land.`
            });
        } catch (error) {
            console.error('Failed to send notification:', error);
        }

        return savedRequest;
    }

    async reject(id: string, adminId: string, reason: string) {
        const request = await this.findById(id);

        if (request.status !== ItemRequestStatus.PENDING) {
            throw new AppError(400, `Request has already been ${request.status}`);
        }

        request.status = ItemRequestStatus.REJECTED;
        request.rejection_reason = reason;
        request.is_refunded = true;

        // Remove any zombie placed item if it exists
        const placedItem = await this.placedItemRepo.findOne({ where: { request_id: request.id } });
        if (placedItem) {
            await this.placedItemRepo.remove(placedItem);
        }

        request.processed_at = new Date();
        request.processed_by = adminId;

        // Refund logic
        if (request.price_paid > 0) {
            const user = await this.userRepo.findOne({ where: { id: request.user_id } });
            if (user) {
                user.credits = Number(user.credits) + Number(request.price_paid);
                await this.userRepo.save(user);
            }
        }

        const savedRequest = await this.itemRequestRepo.save(request);

        // Notify Investor
        try {
            getIO().to(request.user_id).emit('notification', {
                type: 'error',
                title: 'Request Rejected',
                message: `Your request for ${request.asset_category} was rejected. Refund of $${request.price_paid} processed.`
            });
        } catch (error) {
            console.error('Failed to send notification:', error);
        }

        return savedRequest;
    }

    async cancel(id: string, userId: string) {
        const request = await this.findById(id);

        if (request.user_id !== userId) {
            throw new AppError(403, 'You cannot cancel this request');
        }

        if (request.status !== ItemRequestStatus.PENDING) {
            throw new AppError(400, 'Only pending requests can be cancelled');
        }

        request.status = ItemRequestStatus.REJECTED;
        request.rejection_reason = 'Cancelled by user';
        request.is_refunded = true;
        request.processed_at = new Date();

        // TODO: Implement actual refund logic here

        return this.itemRequestRepo.save(request);
    }

    // Placed Items methods
    async getPlacedItems(landId: string) {
        return this.placedItemRepo.find({
            where: { land_id: landId, is_active: true },
            order: { placed_at: 'DESC' }
        });
    }

    async getPlacedItemById(id: string) {
        const item = await this.placedItemRepo.findOne({
            where: { id },
            relations: ['land', 'request']
        });
        if (!item) {
            throw new AppError(404, 'Placed item not found');
        }
        return item;
    }

    async updatePlacedItemState(id: string, userId: string, state: Record<string, any>) {
        const item = await this.getPlacedItemById(id);

        // Verify ownership
        await landService.verifyOwnership(item.land_id, userId);

        item.state = { ...item.state, ...state };
        return this.placedItemRepo.save(item);
    }

    async movePlacedItem(id: string, userId: string, newX: number, newY: number) {
        const item = await this.getPlacedItemById(id);

        // Verify ownership
        await landService.verifyOwnership(item.land_id, userId);

        // Verify new position is valid
        const isValid = await landService.isPositionValid(item.land_id, newX, newY);
        if (!isValid) {
            throw new AppError(400, 'New position is outside land boundaries');
        }

        // Check if new position is occupied (excluding current item)
        const land = await landService.findByIdWithItems(item.land_id);
        const isOccupied = land.placed_items.some(
            i => i.id !== id && i.position_x === newX && i.position_y === newY && i.is_active
        );
        if (isOccupied) {
            throw new AppError(400, 'New position is already occupied');
        }

        item.position_x = newX;
        item.position_y = newY;
        return this.placedItemRepo.save(item);
    }

    async removePlacedItem(id: string, userId: string) {
        const item = await this.getPlacedItemById(id);

        // Verify ownership
        await landService.verifyOwnership(item.land_id, userId);

        item.is_active = false;
        return this.placedItemRepo.save(item);
    }
    async place(requestId: string, userId: string, x: number, y: number, rotation: number = 0) {
        const request = await this.findById(requestId);

        if (request.user_id !== userId) {
            throw new AppError(403, 'You do not have permission to place this item');
        }

        if (request.status !== ItemRequestStatus.APPROVED) {
            throw new AppError(400, `Cannot place item. Request status is ${request.status}`);
        }

        // Check if already placed
        const existingPlacement = await this.placedItemRepo.findOne({ where: { request_id: requestId } });
        if (existingPlacement && existingPlacement.is_active) {
            throw new AppError(400, 'Item is already placed');
        }

        // Verify land ownership/permissions
        try {
            await landService.verifyOwnership(request.land_id, userId);
        } catch (error) {
            // Check if investor rental
            const rental = await this.landRentalRepo.findOne({
                where: { land_id: request.land_id, investor_id: userId }
            });
            if (!rental) {
                throw new AppError(403, 'You do not have permission to place items on this land');
            }
        }

        // Verify position
        const isValid = await landService.isPositionValid(request.land_id, x, y);
        if (!isValid) throw new AppError(400, 'Position is outside land boundaries');

        const isOccupied = await landService.isPositionOccupied(request.land_id, x, y);
        if (isOccupied) throw new AppError(400, 'Position is already occupied');

        // Create Placed Item
        const placedItem = this.placedItemRepo.create({
            land_id: request.land_id,
            request_id: request.id,
            asset_category: request.asset_category,
            variant_id: request.variant_id,
            position_x: x,
            position_y: y,
            rotation: rotation,
            is_active: true,
            state: { state: 'idle' } // Default state
        });

        const savedItem = await this.placedItemRepo.save(placedItem);

        // Update request status to PLACED if we want to distinguish, 
        // OR just keep APPROVED. API usually filters by placed_item existence?
        // Let's keep it APPROVED for now as "Approved" means "Owned" in some contexts.
        // But wait, if I filter inventory by "Approved", I might want to exclude placed ones?
        // let's check findInvestorInventory in service.

        return savedItem;
    }
}

export const itemRequestService = new ItemRequestService();
