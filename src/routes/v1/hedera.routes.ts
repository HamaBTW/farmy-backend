import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { getMyHederaRegistry } from '../../controllers/v1/hedera.controller.js';

const router = Router();

// GET /api/v1/hedera/my-registry
router.get('/my-registry', authenticate, getMyHederaRegistry);

export default router;
