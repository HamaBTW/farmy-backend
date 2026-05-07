import { Router } from 'express';
import { JobApplicationController } from '../../controllers/v1/jobApplication.controller.js';
import { authenticate } from '../../middlewares/auth.middleware.js';

const router = Router();

// Worker routes
router.post('/:jobId/apply', authenticate, JobApplicationController.apply);
router.get('/my', authenticate, JobApplicationController.getMyApplications);

// Farmer routes
router.get('/:jobId/applications', authenticate, JobApplicationController.getJobApplications);
router.patch('/:applicationId/status', authenticate, JobApplicationController.updateStatus);

export default router;
