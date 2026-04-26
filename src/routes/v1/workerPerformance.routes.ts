import { Router } from 'express';
import * as workerPerformanceController from '../../controllers/v1/workerPerformance.controller.js';
import { authenticate } from '../../middlewares/auth.middleware.js';

const router = Router();

// Get worker performance dashboard data (all workers with summary)
router.get('/workers/performance', authenticate, workerPerformanceController.getWorkerPerformance);

// Get top performers
router.get('/workers/performance/top', authenticate, workerPerformanceController.getTopPerformers);

// Get underperformers (needs attention)
router.get('/workers/performance/underperformers', authenticate, workerPerformanceController.getUnderperformers);

export default router;
