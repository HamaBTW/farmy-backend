import { Router } from 'express';
import { authenticate, authorize } from '../../middlewares/auth.middleware.js';
import { validateRequest } from '../../middlewares/validation.middleware.js';
import {
    updateDeliveryStatusSchema,
    updateDeliveryLocationSchema
} from '../../validators/v1/delivery.validator.js';
import {
    getDeliveryByOrder,
    getDeliveryById,
    getMyDeliveries,
    updateDeliveryStatus,
    updateDeliveryLocation
} from '../../controllers/v1/delivery.controller.js';

const router = Router();

// All delivery routes require authentication
router.use(authenticate);

// ── Customer / Buyer routes (read-only) ──────────────────────

// List all deliveries for the authenticated user
router.get('/me', getMyDeliveries);

// Get delivery tracking info by order (purchase) ID
router.get('/order/:orderId', getDeliveryByOrder);

// Get delivery tracking info by delivery ID
router.get('/:id', getDeliveryById);

// ── Seller / Admin routes (write) ────────────────────────────

// Update delivery status (strict state machine + role-based)
router.patch(
    '/:id/status',
    authorize('farmer', 'investor', 'admin'),
    validateRequest(updateDeliveryStatusSchema),
    updateDeliveryStatus
);

// Update driver/delivery location
router.patch(
    '/:id/location',
    authorize('farmer', 'investor', 'admin'),
    validateRequest(updateDeliveryLocationSchema),
    updateDeliveryLocation
);

export default router;
