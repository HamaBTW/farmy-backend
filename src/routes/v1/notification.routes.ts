import { Router } from 'express';
import { NotificationController } from '../../controllers/v1/notification.controller.js';
import { authenticate } from '../../middlewares/auth.middleware.js';

const router = Router();
const notificationController = new NotificationController();

router.get('/', authenticate, notificationController.getMyNotifications.bind(notificationController));
router.patch('/:id/read', authenticate, notificationController.markAsRead.bind(notificationController));
router.patch('/read-all', authenticate, notificationController.markAllAsRead.bind(notificationController));
router.delete('/:id', authenticate, notificationController.delete.bind(notificationController));

export default router;
