import { Router } from 'express';
import * as workerWalletController from '../../controllers/v1/workerWallet.controller.js';
import { authenticate } from '../../middlewares/auth.middleware.js';

const router = Router();

router.use(authenticate);

router.get('/overview', workerWalletController.getWalletOverview);
router.get('/transactions', workerWalletController.getTransactionHistory);
router.get('/earnings', workerWalletController.getTaskEarnings);
router.post('/withdraw', workerWalletController.requestWithdrawal);

export default router;
