import { Router } from 'express';
import { FeedbackController } from '../../controllers/v1/feedback.controller.js';
import { authenticate } from '../../middlewares/auth.middleware.js';

const router = Router();

router.use(authenticate);

router.post('/', FeedbackController.create);
router.get('/my', FeedbackController.getMyFeedbacks);
router.get('/:id', FeedbackController.getDetails);
router.delete('/:id', FeedbackController.delete);

// Admin routes (would ideally have an isAdmin middleware)
router.patch('/:id/status', FeedbackController.updateStatus);

export default router;
