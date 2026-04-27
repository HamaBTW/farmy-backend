import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware.js';
import {
    getDashboardData,
    repairPlacedItem,
    refreshDashboard
} from '../../controllers/v1/farmerDashboard.controller.js';

const router = Router();

// Get full dashboard data
router.get('/dashboard', authenticate, getDashboardData);

// Refresh dashboard data (force re-fetch)
router.post('/dashboard/refresh', authenticate, refreshDashboard);

// Repair a placed item (restore durability)
router.post('/placed-items/:itemId/repair', authenticate, repairPlacedItem);

export default router;
