import { Router } from 'express';
import * as landGridController from '../../controllers/v1/landGrid.controller.js';
import { authenticate } from '../../middlewares/auth.middleware.js';

const router = Router();

router.get('/:id/grid', authenticate, landGridController.getLandGrid);

router.get('/assets/:category/variants/:id/footprint', authenticate, landGridController.getVariantFootprint);

export default router;
