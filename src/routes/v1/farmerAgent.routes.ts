import { Router } from 'express';
import { farmerAgentController } from '../../controllers/v1/farmerAgent.controller.js';
import { authenticate } from '../../middlewares/auth.middleware.js';

const router = Router();

router.use(authenticate);

// /api/v1/farmer-agent/analyze
router.post('/analyze', farmerAgentController.analyze);
router.get('/history', farmerAgentController.getHistory);
router.get('/session/:sessionId', farmerAgentController.getSessionDetails);
router.delete('/session/:sessionId', farmerAgentController.deleteSession);

export default router;
