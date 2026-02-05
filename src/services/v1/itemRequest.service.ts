import { AppDataSource } from '../../config/db.config.js';
import { ItemRequest } from '../../models/ItemRequest.js';
import { PlacedItem } from '../../models/PlacedItem.js';
import { AssetCategory, ItemRequestStatus } from '../../models/AssetCategory.js';
import { AppError } from '../../middlewares/error.middleware.js';
import { assetVariantService } from './assetVariant.service.js';
import { landService } from './land.service.js';

interface CreateItemRequestData {
    user_id: string;
    land_id: string;
    asset_category: AssetCategory;
    variant_id: string;
    position_x: number;
    position_y: number;
}

class ItemRequestService {
    private itemRequestRepo = AppDataSource.getRepository(ItemRequest);
    private placedItemRepo = AppDataSource.getRepository(PlacedItem);

    async create(data: CreateItemRequestData) {
        // Verify land exists and user owns it
        await landService.verifyOwnership(data.land_id, data.user_id);

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

        const itemRequest = this.itemRequestRepo.create({
            ...data,
            price_paid: (variant as any).final_price,
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

    async approve(id: string, adminId: string) {
        const request = await this.findById(id);

        if (request.status !== ItemRequestStatus.PENDING) {
            throw new AppError(400, `Request has already been ${request.status}`);
        }

        // Check if position is still available
        const isOccupied = await landService.isPositionOccupied(request.land_id, request.position_x, request.position_y);
        if (isOccupied) {
            throw new AppError(400, 'Position is now occupied. Please reject and refund.');
        }

        // Create placed item
        const placedItem = this.placedItemRepo.create({
            land_id: request.land_id,
            request_id: request.id,
            asset_category: request.asset_category,
            variant_id: request.variant_id,
            position_x: request.position_x,
            position_y: request.position_y,
            placed_at: new Date()
        });

        await this.placedItemRepo.save(placedItem);

        // Update request status
        request.status = ItemRequestStatus.APPROVED;
        request.processed_at = new Date();
        request.processed_by = adminId;

        return this.itemRequestRepo.save(request);
    }

    async reject(id: string, adminId: string, reason: string) {
        const request = await this.findById(id);

        if (request.status !== ItemRequestStatus.PENDING) {
            throw new AppError(400, `Request has already been ${request.status}`);
        }

        request.status = ItemRequestStatus.REJECTED;
        request.rejection_reason = reason;
        request.is_refunded = true;
        request.processed_at = new Date();
        request.processed_by = adminId;

        // TODO: Implement actual refund logic here

        return this.itemRequestRepo.save(request);
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
}

export const itemRequestService = new ItemRequestService();
