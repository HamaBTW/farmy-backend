import { Router } from 'express';
import { getInvestmentRecommendations } from '../../controllers/v1/investmentAgent.controller.js';

const router = Router();

// /api/v1/investment-agent/recommend
router.post('/recommend', getInvestmentRecommendations);

export default router;
