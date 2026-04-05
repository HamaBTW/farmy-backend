import { Router } from 'express';
import * as assetTaskController from '../../controllers/v1/assetTask.controller.js';
import { authenticate } from '../../middlewares/auth.middleware.js';

const router = Router();

// Get tasks defined for a specific variant
router.get('/variant/:variantId', authenticate, assetTaskController.getTasksByVariant);

export default router;
