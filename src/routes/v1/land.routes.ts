import { Router } from 'express';
import * as landController from '../../controllers/v1/land.controller.js';
import { validateRequest } from '../../middlewares/validation.middleware.js';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { createLandSchema, updateLandSchema } from '../../validators/v1/asset.validator.js';

const router = Router();

// Public routes
router.get('/', landController.getAllLands);
router.get('/:id', landController.getLandById);
router.get('/:id/items', landController.getLandWithItems);

// Protected routes (requires authentication)
router.get('/user/my-lands', authenticate, landController.getMyLands);
router.post('/', authenticate, validateRequest(createLandSchema), landController.createLand);
router.put('/:id', authenticate, validateRequest(updateLandSchema), landController.updateLand);
router.delete('/:id', authenticate, landController.deleteLand);

export default router;
