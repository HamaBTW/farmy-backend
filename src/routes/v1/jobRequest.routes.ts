import { Router } from 'express';
import { JobRequestController } from '../../controllers/v1/jobRequest.controller.js';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { validateRequest } from '../../middlewares/validation.middleware.js';
import { createJobRequestSchema } from '../../validators/v1/jobRequest.validator.js';

const router = Router();

router.use(authenticate);

router.post('/', validateRequest(createJobRequestSchema), JobRequestController.create);
router.get('/my', JobRequestController.getMyJobs);
router.get('/', JobRequestController.getAll);
router.get('/recommended', JobRequestController.getRecommended);
router.put('/:id', JobRequestController.update);

export default router;
