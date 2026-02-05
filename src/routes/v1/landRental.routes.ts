import { Router } from 'express';
import * as landRentalController from '../../controllers/v1/landRental.controller.js';
import { validateRequest } from '../../middlewares/validation.middleware.js';
import { authenticate } from '../../middlewares/auth.middleware.js';
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
router.post('/', authenticate, validateRequest(createLandRentalSchema), landRentalController.createLandRental);
router.put('/:id', authenticate, validateRequest(updateLandRentalSchema), landRentalController.updateLandRental);
router.patch('/:id/payment', authenticate, validateRequest(updatePaymentStatusSchema), landRentalController.updatePaymentStatus);
router.delete('/:id', authenticate, landRentalController.deleteLandRental);

export default router;
