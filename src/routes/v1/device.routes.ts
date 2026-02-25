import { Router } from 'express';
import { DeviceController } from '../../controllers/v1/device.controller.js';
import { authenticate } from '../../middlewares/auth.middleware.js';

const router = Router();
const deviceController = new DeviceController();

router.post('/register', authenticate, deviceController.register);
router.post('/unregister', authenticate, deviceController.unregister);
router.post('/test-send', authenticate, deviceController.testSend);

export default router;
