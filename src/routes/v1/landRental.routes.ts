import { Router } from 'express';
import * as landRentalController from '../../controllers/v1/landRental.controller.js';
import { validateRequest } from '../../middlewares/validation.middleware.js';
import { authenticate, authorize } from '../../middlewares/auth.middleware.js';
import {
  createLandRentalSchema,
  updateLandRentalSchema,
  updatePaymentStatusSchema
} from '../../validators/v1/landRental.validator.js';

const router = Router();

// Public routes
router.get('/', landRentalController.getAllLandRentals);
router.get('/active', landRentalController.getActiveRentals);
router.get('/overdue', landRentalController.getOverduePayments);
router.get('/:id', landRentalController.getLandRentalById);
router.get('/land/:landId', landRentalController.getRentalsByLand);

// Protected routes (requires authentication)
router.get('/owner/my-rentals', authenticate, landRentalController.getMyRentalsAsOwner);
router.get('/investor/my-rentals', authenticate, landRentalController.getMyRentalsAsInvestor);
router.post('/', authenticate, authorize('farmer', 'investor', 'admin'), validateRequest(createLandRentalSchema), landRentalController.createLandRental);
router.put('/:id', authenticate, authorize('farmer', 'investor', 'admin'), validateRequest(updateLandRentalSchema), landRentalController.updateLandRental);
router.patch('/:id/payment', authenticate, authorize('farmer', 'investor', 'admin'), validateRequest(updatePaymentStatusSchema), landRentalController.updatePaymentStatus);
router.delete('/:id', authenticate, authorize('farmer', 'admin'), landRentalController.deleteLandRental);

export default router;
