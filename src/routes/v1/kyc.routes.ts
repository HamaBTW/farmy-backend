import { Router } from 'express';
import * as kycController from '../../controllers/v1/kyc.controller.js';
import { authenticate } from '../../middlewares/auth.middleware.js';

import { uploadKycImages } from '../../middlewares/upload.middleware.js';

const router = Router();

console.log('Loading KYC routes...');

// Ping test
router.get('/ping', (req, res) => {
    console.log('KYC Ping hit');
    res.json({ message: 'pong' });
});

// Submit KYC (Protected + File Upload)
router.post('/start', authenticate, uploadKycImages, kycController.startKyc);

export default router;
