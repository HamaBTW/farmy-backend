import { Router } from 'express';
import { RoiController } from '../../controllers/v1/roi.controller.js';
import { authenticate, authorize } from '../../middlewares/auth.middleware.js';
import { UserRole } from '../../models/User.js';

const router = Router();

// Protect all routes and restrict to investors
router.use(authenticate);
router.use(authorize(UserRole.INVESTOR));

router.get('/dashboard', RoiController.getInvestorRoiDashboard);

export default router;
