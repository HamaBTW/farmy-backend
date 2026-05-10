import { AppDataSource } from '../../config/db.config.js';
import { ItemRequest } from '../../models/ItemRequest.js';
import { PlacedItem } from '../../models/PlacedItem.js';
import { LandRental } from '../../models/LandRental.js';
import { User } from '../../models/User.js';
import { AssetCategory, ItemRequestStatus, ItemRequestType } from '../../models/AssetCategory.js';
import { AppError } from '../../middlewares/error.middleware.js';
import { firebaseService } from './firebase.service.js';
import { NotificationType } from '../../models/Notification.js';
import { assetVariantService } from './assetVariant.service.js';
import { landService } from './land.service.js';
import { stripeService } from './StripeService.js';
import { getIO } from '../../socket/socket.js';
import { hederaService } from './HederaService.js';

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
        let posX = data.position_x;
        let posY = data.position_y;

        console.log(`[ItemRequestService] Initial position check: (${posX}, ${posY}) for land ${data.land_id}`);
        
        let isValid = await landService.isPositionValid(data.land_id, posX, posY);
        let isOccupied = await landService.isPositionOccupied(data.land_id, posX, posY);

        if (!isValid || isOccupied) {
            console.warn(`[ItemRequestService] Position (${posX}, ${posY}) is ${!isValid ? 'invalid' : 'occupied'}. Finding fallback...`);
            
            const land = await landService.findById(data.land_id);
            const mask = (landService as any).getPlayableMaskForLand(land);
            const landWithItems = await landService.findByIdWithItems(data.land_id);
            
            let found = false;
            // Search for first available valid cell
            for (let y = 0; y < land.grid_height && !found; y++) {
                for (let x = 0; x < land.grid_width && !found; x++) {
                    const cellValid = !mask || (mask[y] && mask[y][x]);
                    const cellOccupied = landWithItems.placed_items.some(i => i.position_x === x && i.position_y === y && i.is_active);
                    
                    if (cellValid && !cellOccupied) {
                        posX = x;
                        posY = y;
                        found = true;
                        console.log(`[ItemRequestService] Found fallback position: (${posX}, ${posY})`);
                    }
                }
            }

            if (!found) {
                throw new AppError(400, 'No available space on this land for new items.');
            }
        }

        // Update data with potentially new position
        data.position_x = posX;
        data.position_y = posY;

        // Get variant and price
        console.log(`[ItemRequestService] Looking up variant ${data.variant_id} for category ${data.asset_category}`);
        const variant = await assetVariantService.getVariantWithPrice(data.asset_category, data.variant_id);
        if (!(variant as any).is_available) {
            console.warn(`[ItemRequestService] Variant ${data.variant_id} is not available`);
            throw new AppError(400, 'This variant is not available for purchase');
        }

        const price = (variant as any).final_price;
        console.log(`[ItemRequestService] Price: ${price}`);

        const user = await this.userRepo.findOne({ where: { id: data.user_id } });
        if (!user) throw new AppError(404, 'User not found');

        if (price > 0) {
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
            status: ItemRequestStatus.PENDING,
            type: ItemRequestType.BUY
        });

        const savedRequest = await this.itemRequestRepo.save(itemRequest);

        // Record purchase on Hedera (non-blocking — failure won't cancel the purchase)
        try {
            const variantDetails = (variant as any);
            const hederaTxId = await hederaService.recordPurchase({
                type: 'item_purchase',
                user_id: data.user_id,
                item_id: data.variant_id,
                item_name: variantDetails.type?.name || variantDetails.variant_code || 'Unknown Item',
                asset_category: data.asset_category,
                land_id: data.land_id,
                amount: price,
                currency: 'usd',
                payment_method: data.payment_method_id ? 'stripe' : (price > 0 ? 'credits' : 'free'),
                timestamp: new Date().toISOString(),
                metadata: { request_id: savedRequest.id },
            });

            if (hederaTxId) {
                savedRequest.hedera_transaction_id = hederaTxId;
                await this.itemRequestRepo.save(savedRequest);
            }
        } catch (hederaError) {
            console.error('[HederaService] Non-fatal error recording item purchase on Hedera:', hederaError);
        }

        // Notify Land Owner (non-blocking)
        const land = await landService.findById(data.land_id);
        const variantDetails = (variant as any);
        const itemName = variantDetails.type?.name || variantDetails.variant_code || 'Item';

        const requesterName = user.profile?.name || user.email.split('@')[0];
        firebaseService.sendToUsers(
            land.owner_id,
            'New Purchase Request!',
            `${requesterName} wants to buy ${itemName} for ${land.name}.`,
            { land_id: land.id, request_id: savedRequest.id, asset_category: data.asset_category },
            NotificationType.ITEM_REQUEST
        ).catch(err => console.error('[ItemRequestService] Failed to send notification:', err));

        return savedRequest;
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
                const typeLabel = request.type === ItemRequestType.PLACEMENT ? 'Placement' : 'Purchase';
                return {
                    ...request,
                    item_details: {
                        name: (variant as any).type?.name || 'Unknown Item',
                        display_name: `${typeLabel}: ${(variant as any).type?.name || 'Item'}`,
                        variant_name: (variant as any).variant_code || 'Standard',
                        image_url: (variant as any).image_url || (variant as any).type?.icon_url || null,
                        sprites: (variant as any).sprites || null,
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
            where: {
                ...where,
                type: ItemRequestType.BUY // Only show purchase requests in inventory
            },
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
                        sprites: (variant as any).sprites || null,
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

        // Notify Investor (Mark Available)
        try {
            const variant = await assetVariantService.findById(request.asset_category, request.variant_id);
            const itemName = (variant as any).type?.name || 'Item';
            const location = request.type === ItemRequestType.PLACEMENT ? 'Land' : 'Inventory';

            firebaseService.sendToUsers(
                request.user_id,
                'Item Available!',
                `Your ${itemName} is now available in your ${location}.`,
                { request_id: request.id, land_id: request.land_id, asset_category: request.asset_category },
                NotificationType.ITEM_REQUEST
            ).catch(err => console.error('[ItemRequestService] Failed to send notification:', err));
        } catch (e) { }

        // Activation logic: If this is a placement request, activate the item
        if (request.type === ItemRequestType.PLACEMENT && request.parent_id) {
            // Find the PlacedItem linked to the PARENT (BUY) request
            const placedItem = await this.placedItemRepo.findOne({ where: { request_id: request.parent_id } });
            if (placedItem) {
                placedItem.is_active = true;
                await this.placedItemRepo.save(placedItem);
            }
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
            const variant = await assetVariantService.findById(request.asset_category, request.variant_id);
            const itemName = (variant as any).type?.name || 'Item';

            firebaseService.sendToUsers(
                request.user_id,
                'Request Declined',
                `Your request for ${itemName} was not approved.`,
                { request_id: request.id, reason },
                NotificationType.ITEM_REQUEST
            ).catch(err => console.error('[ItemRequestService] Failed to send notification:', err));

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
        const items = await this.placedItemRepo.find({
            where: { land_id: landId },
            order: { placed_at: 'DESC' }
        });

        // Enrich with variant details
        return Promise.all(items.map(async (item) => {
            try {
                const variant = await assetVariantService.findById(item.asset_category, item.variant_id);
                return {
                    ...item,
                    details: {
                        name: (variant as any).type?.name || 'Unknown',
                        variant_name: (variant as any).variant_code,
                        image_url: (variant as any).image_url || (variant as any).type?.icon_url,
                    }
                };
            } catch (e) {
                return {
                    ...item,
                    details: { name: 'Unknown Item', variant_name: 'Unknown', image_url: null }
                };
            }
        }));
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
        console.log(`[ItemRequestService] Placing request ${requestId} for user ${userId} at (${x}, ${y})`);
        const request = await this.findById(requestId);

        if (request.user_id !== userId) {
            console.warn(`[ItemRequestService] Permission denied: Request user ${request.user_id} !== current user ${userId}`);
            throw new AppError(403, 'You do not have permission to place this item');
        }

        if (request.status !== ItemRequestStatus.APPROVED) {
            console.warn(`[ItemRequestService] Invalid status: ${request.status}`);
            throw new AppError(400, `Cannot place item. Request status is ${request.status}`);
        }

        // Check if already placed or pending placement
        const existingPlacement = await this.placedItemRepo.findOne({ where: { request_id: requestId } });
        if (existingPlacement) {
            console.warn(`[ItemRequestService] Item already has a placement: ${existingPlacement.id}`);
            throw new AppError(400, 'Item already has a placement. Please move it if it is already active.');
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
                console.warn(`[ItemRequestService] Permission denied for land ${request.land_id}`);
                throw new AppError(403, 'You do not have permission to place items on this land');
            }
        }

        // Verify position
        const isValid = await landService.isPositionValid(request.land_id, x, y);
        if (!isValid) {
            console.warn(`[ItemRequestService] Position (${x}, ${y}) is outside land boundaries`);
            throw new AppError(400, 'Position is outside land boundaries');
        }

        const isOccupied = await landService.isPositionOccupied(request.land_id, x, y);
        if (isOccupied) {
            console.warn(`[ItemRequestService] Position (${x}, ${y}) is already occupied`);
            throw new AppError(400, 'Position is already occupied');
        }

        console.log(`[ItemRequestService] Creating placed item shadow...`);

        // Create Placed Item (Inactive Shadow)
        // Link it to the BUY request ID so the inventory knows it's placed
        const placedItem = this.placedItemRepo.create({
            land_id: request.land_id,
            request_id: request.id,
            asset_category: request.asset_category,
            variant_id: request.variant_id,
            position_x: x,
            position_y: y,
            rotation: rotation,
            is_active: false,
            state: { state: 'idle' }
        });

        await this.placedItemRepo.save(placedItem);

        // Create a NEW Item Request for PLACEMENT approval
        const placementRequest = this.itemRequestRepo.create({
            user_id: userId,
            land_id: request.land_id,
            asset_category: request.asset_category,
            variant_id: request.variant_id,
            position_x: x,
            position_y: y,
            price_paid: 0,
            status: ItemRequestStatus.PENDING,
            type: ItemRequestType.PLACEMENT,
            parent_id: request.id // Link to the original BUY request
        });

        const savedPlacementRequest = await this.itemRequestRepo.save(placementRequest);

        // Notify Land Owner (non-blocking)
        try {
            const variant = await assetVariantService.findById(request.asset_category, request.variant_id);
            const itemName = (variant as any).type?.name || 'Item';
            const land = await landService.findById(request.land_id);
            const requesterName = request.user?.profile?.name || request.user?.email.split('@')[0] || 'Someone';

            firebaseService.sendToUsers(
                land.owner_id,
                'Placement Request!',
                `${requesterName} wants to place ${itemName} on ${land.name}.`,
                { land_id: land.id, request_id: savedPlacementRequest.id },
                NotificationType.ITEM_REQUEST
            ).catch(err => console.error('[ItemRequestService] Failed to send notification:', err));
        } catch (e) { }

        return savedPlacementRequest;
    }
}

export const itemRequestService = new ItemRequestService();
