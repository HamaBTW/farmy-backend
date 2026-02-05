import { Router } from 'express';
import * as itemRequestController from '../../controllers/v1/itemRequest.controller.js';
import { validateRequest } from '../../middlewares/validation.middleware.js';
import { authenticate } from '../../middlewares/auth.middleware.js';
import {
    createItemRequestSchema,
    rejectItemRequestSchema,
    updatePlacedItemStateSchema,
    movePlacedItemSchema
} from '../../validators/v1/asset.validator.js';

const router = Router();

// Item Requests
router.get('/', authenticate, itemRequestController.getAllItemRequests);
router.get('/pending', authenticate, itemRequestController.getPendingItemRequests);
router.get('/my-requests', authenticate, itemRequestController.getMyItemRequests);
router.get('/:id', authenticate, itemRequestController.getItemRequestById);
router.post('/', authenticate, validateRequest(createItemRequestSchema), itemRequestController.createItemRequest);
router.post('/:id/approve', authenticate, itemRequestController.approveItemRequest);
router.post('/:id/reject', authenticate, validateRequest(rejectItemRequestSchema), itemRequestController.rejectItemRequest);
router.post('/:id/cancel', authenticate, itemRequestController.cancelItemRequest);

// Placed Items
router.get('/land/:landId/items', itemRequestController.getPlacedItems);
router.get('/placed/:id', authenticate, itemRequestController.getPlacedItemById);
router.patch('/placed/:id/state', authenticate, validateRequest(updatePlacedItemStateSchema), itemRequestController.updatePlacedItemState);
router.patch('/placed/:id/move', authenticate, validateRequest(movePlacedItemSchema), itemRequestController.movePlacedItem);
router.delete('/placed/:id', authenticate, itemRequestController.removePlacedItem);

export default router;
