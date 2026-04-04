import { Router } from 'express';
import { getFarmerAnalysis } from '../../controllers/v1/farmerAgent.controller.js';
import { authenticate } from '../../middlewares/auth.middleware.js';

const router = Router();

router.use(authenticate);

// /api/v1/farmer-agent/analyze
router.post('/analyze', getFarmerAnalysis);

export default router;
