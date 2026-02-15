import { Router } from 'express';
import * as taskController from '../../controllers/v1/task.controller.js';
import { authenticate } from '../../middlewares/auth.middleware.js';

const router = Router();

// Worker's own tasks
router.get('/me', authenticate, taskController.getMyTasks);

// Land-specific task routes
router.post('/lands/:landId/tasks', authenticate, taskController.createTask);
router.get('/lands/:landId/tasks', authenticate, taskController.getLandTasks);

// Task-specific actions
router.patch('/:taskId/assign', authenticate, taskController.assignTask);
router.post('/:taskId/complete', authenticate, taskController.completeTask);

export default router;
