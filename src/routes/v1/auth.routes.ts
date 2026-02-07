import { Router } from 'express';
import * as authController from '../../controllers/v1/auth.controller.js';
import * as twoFactorController from '../../controllers/v1/twoFactor.controller.js';
import { validateRequest } from '../../middlewares/validation.middleware.js';
import { registerSchema, loginSchema, changePasswordSchema } from '../../validators/v1/auth.validator.js';
import { authenticate } from '../../middlewares/auth.middleware.js';

const router = Router();

router.get('/me', authenticate, authController.getProfile);
router.get('/users/:id', authenticate, authController.getPublicUser);
router.post('/register', validateRequest(registerSchema), authController.register);
router.post('/login', validateRequest(loginSchema), authController.login);
router.post('/login/verify-2fa', authController.verify2fa);
router.post('/logout', authController.logout);
router.post('/refresh', authController.refresh);
router.post('/verify-email', authController.verifyEmail);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);
router.post('/change-password', authenticate, validateRequest(changePasswordSchema), authController.changePassword);
router.post('/resend-verification', authController.resendVerificationCode);
router.post('/resend-reset-code', authController.resendResetCode);
router.post('/google', authController.googleLogin);
router.get('/google/login', authController.googleLoginInit);
router.get('/google/callback', authController.googleLoginCallback);
router.get('/google/status', authController.googleLoginStatus);
router.post('/github', authController.githubLogin);

// 2FA Setup/Manage (Protected)
router.get('/2fa/setup', authenticate, twoFactorController.setup2FA);
router.post('/2fa/verify', authenticate, twoFactorController.verifyAndEnable2FA);
router.post('/2fa/disable', authenticate, twoFactorController.disable2FA);

export default router;
