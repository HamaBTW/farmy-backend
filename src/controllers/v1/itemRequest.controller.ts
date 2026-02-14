import { Request, Response, NextFunction } from 'express';
import { itemRequestService } from '../../services/v1/itemRequest.service.js';
import { AuthRequest } from '../../middlewares/auth.middleware.js';
import { AssetCategory, ItemRequestStatus } from '../../models/AssetCategory.js';
import { AppError } from '../../middlewares/error.middleware.js';

// Item Request endpoints
export const createItemRequest = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const result = await itemRequestService.create({
            ...req.body,
            user_id: req.user!.id
        });

        res.status(201).json({
            success: true,
            message: 'Item request created successfully. Awaiting approval.',
            data: result
        });
    } catch (error) {
        next(error);
    }
};

export const getAllItemRequests = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const filters = {
            user_id: req.query.userId as string | undefined,
            land_id: req.query.landId as string | undefined,
            status: req.query.status as ItemRequestStatus | undefined,
            asset_category: req.query.category as AssetCategory | undefined
        };
        const result = await itemRequestService.findAll(filters);

        res.status(200).json({
            success: true,
            data: result
        });
    } catch (error) {
        next(error);
    }
};

export const getMyItemRequests = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const result = await itemRequestService.findByUser(req.user!.id);

        res.status(200).json({
            success: true,
            data: result
        });
    } catch (error) {
        next(error);
    }
};

export const getPendingItemRequests = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const result = await itemRequestService.findPending();

        res.status(200).json({
            success: true,
            data: result
        });
    } catch (error) {
        next(error);
    }
};

export const getItemRequestById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const result = await itemRequestService.findById(req.params.id as string);

        res.status(200).json({
            success: true,
            data: result
        });
    } catch (error) {
        next(error);
    }
};

export const getIncomingRequestsForFarmer = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const result = await itemRequestService.findIncomingForFarmer(req.user!.id);
        res.status(200).json({
            success: true,
            data: result
        });
    } catch (error) {
        next(error);
    }
};

export const getInvestorInventory = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const landId = req.query.landId as string | undefined;
        const result = await itemRequestService.findInvestorInventory(req.user!.id, landId);
        res.status(200).json({
            success: true,
            data: result
        });
    } catch (error) {
        next(error);
    }
};

export const approveItemRequest = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        console.log(`[ItemRequest] Approving request ${req.params.id} by admin ${req.user!.id}`);
        const result = await itemRequestService.approve(req.params.id as string, req.user!.id);

        res.status(200).json({
            success: true,
            message: 'Item request approved. Item placed on land.',
            data: result
        });
    } catch (error) {
        console.error('[ItemRequest] Approve Error:', error);
        next(error);
    }
};

export const rejectItemRequest = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { reason } = req.body;
        if (!reason) {
            throw new AppError(400, 'Rejection reason is required');
        }
        const result = await itemRequestService.reject(req.params.id as string, req.user!.id, reason);

        res.status(200).json({
            success: true,
            message: 'Item request rejected. User will be refunded.',
            data: result
        });
    } catch (error) {
        next(error);
    }
};

export const cancelItemRequest = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const result = await itemRequestService.cancel(req.params.id as string, req.user!.id);

        res.status(200).json({
            success: true,
            message: 'Item request cancelled. You will be refunded.',
            data: result
        });
    } catch (error) {
        next(error);
    }
};

export const placeItemRequest = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { position_x, position_y, rotation } = req.body;
        const result = await itemRequestService.place(
            req.params.id as string,
            req.user!.id,
            position_x,
            position_y,
            rotation
        );

        res.status(200).json({
            success: true,
            message: 'Item placed successfully',
            data: result
        });
    } catch (error) {
        next(error);
    }
};

// Placed Items endpoints
export const getPlacedItems = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const result = await itemRequestService.getPlacedItems(req.params.landId as string);

        res.status(200).json({
            success: true,
            data: result
        });
    } catch (error) {
        next(error);
    }
};

export const getPlacedItemById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const result = await itemRequestService.getPlacedItemById(req.params.id as string);

        res.status(200).json({
            success: true,
            data: result
        });
    } catch (error) {
        next(error);
    }
};

export const updatePlacedItemState = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const result = await itemRequestService.updatePlacedItemState(
            req.params.id as string,
            req.user!.id,
            req.body.state
        );

        res.status(200).json({
            success: true,
            message: 'Item state updated successfully',
            data: result
        });
    } catch (error) {
        next(error);
    }
};

export const movePlacedItem = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { position_x, position_y } = req.body;
        const result = await itemRequestService.movePlacedItem(
            req.params.id as string,
            req.user!.id,
            position_x,
            position_y
        );

        res.status(200).json({
            success: true,
            message: 'Item moved successfully',
            data: result
        });
    } catch (error) {
        next(error);
    }
};

export const removePlacedItem = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const result = await itemRequestService.removePlacedItem(req.params.id as string, req.user!.id);

        res.status(200).json({
            success: true,
            message: 'Item removed from land',
            data: result
        });
    } catch (error) {
        next(error);
    }
};
