import { Router } from 'express';
import { authenticate, authorize } from '../../middlewares/auth.middleware.js';
import { validateRequest } from '../../middlewares/validation.middleware.js';
import { updateDeliveryStatusSchema } from '../../validators/v1/delivery.validator.js';
import {
    getVendorDeliveries,
    getVendorDeliveryStats,
    getVendorDeliveryDetail,
    updateVendorDeliveryStatus
} from '../../controllers/v1/vendorDelivery.controller.js';

const router = Router();

// All vendor delivery routes require authentication + vendor role
router.use(authenticate, authorize('farmer', 'investor', 'admin'));

// GET /api/v1/vendor/deliveries/stats – aggregated statistics
router.get('/stats', getVendorDeliveryStats);

// GET /api/v1/vendor/deliveries – paginated list
router.get('/', getVendorDeliveries);

// GET /api/v1/vendor/deliveries/:id – single delivery detail
router.get('/:id', getVendorDeliveryDetail);

// PATCH /api/v1/vendor/deliveries/:id/status – update status
router.patch(
    '/:id/status',
    validateRequest(updateDeliveryStatusSchema),
    updateVendorDeliveryStatus
);

export default router;
