import { Router } from 'express';
import * as authController from '../../controllers/v1/auth.controller.js';
import { validateRequest } from '../../middlewares/validation.middleware.js';
import { registerSchema, loginSchema } from '../../validators/v1/auth.validator.js';

const router = Router();

router.post('/register', validateRequest(registerSchema), authController.register);
router.post('/login', validateRequest(loginSchema), authController.login);
router.post('/logout', authController.logout);
router.post('/refresh', authController.refresh);
router.post('/verify-email', authController.verifyEmail);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);
router.post('/resend-verification', authController.resendVerificationCode);
router.post('/resend-reset-code', authController.resendResetCode);
router.post('/google', authController.googleLogin);
router.post('/github', authController.githubLogin);

export default router;
