import { Router } from 'express';
import * as workerProfileController from '../../controllers/v1/workerProfile.controller.js';
import { authenticate, authorize } from '../../middlewares/auth.middleware.js';

const router = Router();

// Create worker profile (customer only)
router.post('/', authenticate, authorize('customer'), workerProfileController.createWorkerProfile);

// Get my worker profile
router.get('/me', authenticate, workerProfileController.getMyWorkerProfile);

// Update my worker profile
router.put('/me', authenticate, workerProfileController.updateMyWorkerProfile);

// Browse marketplace (verified workers only)
router.get('/marketplace', authenticate, workerProfileController.getMarketplace);

// Get specific worker profile
router.get('/:profileId', authenticate, workerProfileController.getWorkerProfileById);

// Admin: verify/reject worker profile
router.patch('/:profileId/verify', authenticate, authorize('admin'), workerProfileController.verifyWorkerProfile);

export default router;
