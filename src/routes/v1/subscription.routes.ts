import { Router } from 'express';
import { subscriptionController } from '../../controllers/v1/subscription.controller.js';
import { authenticate } from '../../middlewares/auth.middleware.js';

const router = Router();

// Public/Authenticated plans
router.get('/plans', subscriptionController.getPlans);

// Protected routes
router.use(authenticate);

router.get('/current', subscriptionController.getCurrentSubscription);
router.post('/subscribe/stripe', subscriptionController.createCheckoutSession);
router.post('/subscribe/credits', subscriptionController.upgradeWithCredits);
router.post('/subscribe/confirm', subscriptionController.confirmStripePayment);

// Admin/Internal only (could be gated further)
router.post('/seed', subscriptionController.seedPlans);

export default router;
