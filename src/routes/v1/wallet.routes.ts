import { Router } from 'express';
import * as walletController from '../../controllers/v1/WalletController.js';
import { authenticate } from '../../middlewares/auth.middleware.js';

const router = Router();

router.use(authenticate);

router.get('/me', walletController.getWalletStatus);
router.post('/payment-methods', walletController.addPaymentMethod);
router.post('/create-setup-intent', walletController.createSetupIntent);
router.post('/confirm-setup', walletController.confirmSetup);
router.post('/create-payment-intent', walletController.createPaymentIntent);
router.post('/charge', walletController.chargeCredits);
router.delete('/payment-methods/:id', walletController.deletePaymentMethod);

export default router;
