import { Router } from 'express';
import authRoutesV1 from './v1/auth.routes.js';

const router = Router();

// API Version 1 Routes
router.use('/v1/auth', authRoutesV1);

export default router;
