import { Router } from 'express';
import * as walletController from '../../controllers/v1/WalletController.js';
import { authenticate } from '../../middlewares/auth.middleware.js';

const router = Router();

router.use(authenticate);

router.get('/me', walletController.getWalletStatus);
router.post('/payment-methods', walletController.addPaymentMethod);
router.post('/charge', walletController.chargeCredits);
router.delete('/payment-methods/:id', walletController.deletePaymentMethod);

export default router;
