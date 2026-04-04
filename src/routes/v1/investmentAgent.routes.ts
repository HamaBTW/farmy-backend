import { Router } from 'express';
import { getInvestmentRecommendations, getInvestmentHistory, getInvestmentSession } from '../../controllers/v1/investmentAgent.controller.js';
import { authenticate } from '../../middlewares/auth.middleware.js';

const router = Router();

router.use(authenticate);

// /api/v1/investment-agent/recommend
router.post('/recommend', getInvestmentRecommendations);

// /api/v1/investment-agent/history
router.get('/history', getInvestmentHistory);

// /api/v1/investment-agent/session/:sessionId
router.get('/session/:sessionId', getInvestmentSession);

export default router;
