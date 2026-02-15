import { Router } from 'express';
import * as landWorkerController from '../../controllers/v1/landWorker.controller.js';
import { authenticate } from '../../middlewares/auth.middleware.js';

const router = Router();

// Worker's own assigned lands
router.get('/me/lands', authenticate, landWorkerController.getMyAssignedLands);

// Land-specific workforce routes
router.get('/lands/:landId/workers', authenticate, landWorkerController.getLandWorkers);
router.get('/lands/:landId/workers/active', authenticate, landWorkerController.getActiveLandWorkers);
router.get('/lands/:landId/workforce-stats', authenticate, landWorkerController.getWorkforceStats);
router.post('/lands/:landId/workers', authenticate, landWorkerController.assignWorker);
router.delete('/lands/:landId/workers/:workerId', authenticate, landWorkerController.removeWorker);

export default router;
