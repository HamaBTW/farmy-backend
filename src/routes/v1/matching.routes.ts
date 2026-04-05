import { Router } from 'express';
import * as smartMatchingController from '../../controllers/v1/smartMatching.controller.js';
import * as matchingController from '../../controllers/v1/matching.controller.js';
import { authenticate } from '../../middlewares/auth.middleware.js';

const router = Router();

// Smart Recommendations (AI-powered)
router.get('/recommendations/products', authenticate, smartMatchingController.getSmartProductRecommendations);
router.get('/recommendations/lands', authenticate, smartMatchingController.getSmartLandRecommendations);

// Legacy endpoints
router.get('/smart-matches', authenticate, matchingController.getSmartMatches);
router.post('/request', authenticate, matchingController.sendMatchRequest);

export default router;