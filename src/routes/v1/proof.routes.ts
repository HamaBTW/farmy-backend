import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { uploadMem } from '../../middlewares/upload.middleware.js';
import * as proofController from '../../controllers/v1/proof.controller.js';

const router = Router();

// Manual Proof Requests
router.post('/request-proof', authenticate, proofController.requestProof);
router.get('/my-proofs', authenticate, proofController.getMyProofs);
router.post('/submit-proof/:id', authenticate, uploadMem.single('proof_image'), proofController.submitProof);

export default router;
