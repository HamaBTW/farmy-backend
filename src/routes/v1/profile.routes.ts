import { Router } from 'express';
import * as profileController from '../../controllers/v1/profile.controller.js';
import { validateRequest } from '../../middlewares/validation.middleware.js';
import { updateProfileSchema } from '../../validators/v1/profile.validator.js';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { upload } from '../../middlewares/upload.middleware.js';

const router = Router();

// Single entry point for edit profile
router.patch('/me', authenticate, validateRequest(updateProfileSchema), profileController.updateProfile);
router.get('/check-username/:username', authenticate, profileController.checkUsername);
router.post('/picture', authenticate, upload.single('profile_picture'), profileController.uploadProfilePicture);


export default router;
