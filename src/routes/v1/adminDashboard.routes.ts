import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { AdminDashboardController } from '../../controllers/v1/adminDashboard.controller.js';

const router = Router();

// Get admin dashboard stats
router.get('/stats', authenticate, AdminDashboardController.getDashboardStats);

export default router;
