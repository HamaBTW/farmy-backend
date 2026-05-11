import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { UserManagementController } from '../../controllers/v1/userManagement.controller.js';

const router = Router();

// Get users list with filters
router.get('/', authenticate, UserManagementController.getUsers);

// Update user details
router.put('/:id', authenticate, UserManagementController.updateUser);

// Create new admin
router.post('/admins', authenticate, UserManagementController.createAdmin);

// Export users
router.get('/export', authenticate, UserManagementController.exportUsers);

export default router;
