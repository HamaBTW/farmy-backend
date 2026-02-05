import { Router } from 'express';
import authRoutesV1 from './v1/auth.routes.js';

import kycRoutesV1 from './v1/kyc.routes.js';

const router = Router();
console.log('Registering /v1/auth routes');
// API Version 1 Routes
router.use('/v1/auth', authRoutesV1);

console.log('Registering /v1/kyc routes');
router.use('/v1/kyc', kycRoutesV1);

export default router;
