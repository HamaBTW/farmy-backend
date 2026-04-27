import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { getMyHederaRegistry, generateInvoice } from '../../controllers/v1/hedera.controller.js';

const router = Router();

// GET /api/v1/hedera/my-registry
router.get('/my-registry', authenticate, getMyHederaRegistry);

// GET /api/v1/hedera/invoice?from=YYYY-MM-DD&to=YYYY-MM-DD&types=land_rental,item_purchase,product_purchase
router.get('/invoice', authenticate, generateInvoice);

export default router;
