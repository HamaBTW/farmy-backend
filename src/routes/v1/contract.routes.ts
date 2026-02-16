import { Router } from 'express';
import * as contractController from '../../controllers/v1/contract.controller.js';
import { authenticate, authorize } from '../../middlewares/auth.middleware.js';

const router = Router();

// Investor: Hire an approved worker
router.post('/lands/:landId/hire-worker', authenticate, authorize('investor'), contractController.hireWorker);

// Worker: Respond to contract (approve/decline)
router.post('/contracts/:id/respond', authenticate, contractController.respondToContract);

// Both: Negotiate contract terms
router.post('/contracts/:id/negotiate', authenticate, contractController.negotiateContract);

// Both: Get negotiation history for a contract
router.get('/contracts/:id/negotiations', authenticate, contractController.getNegotiationHistory);

// Investor: Create payment intent for contract
router.post('/contracts/:id/pay', authenticate, authorize('investor'), contractController.createContractPayment);

// Get contracts for a land
router.get('/lands/:landId/contracts', authenticate, contractController.getContractsByLand);

// Investor: Get negotiating contracts for a land
router.get('/lands/:landId/contracts/negotiating', authenticate, authorize('investor'), contractController.getNegotiatingContracts);

// Get active contracts for a land
router.get('/lands/:landId/contracts/active', authenticate, contractController.getActiveContracts);

// Worker: Get my contracts
router.get('/me/contracts', authenticate, contractController.getWorkerContracts);

// Worker: Get my balance
router.get('/me/balance', authenticate, contractController.getWorkerBalance);

// Get single contract by ID
router.get('/contracts/:id', authenticate, contractController.getContractById);

// Investor: Suspend contract
router.patch('/contracts/:id/suspend', authenticate, authorize('investor'), contractController.suspendContract);

// Investor: Terminate contract
router.patch('/contracts/:id/terminate', authenticate, authorize('investor'), contractController.terminateContract);

// Stripe webhook (no auth, raw body)
router.post('/webhook/stripe', contractController.stripeWebhook);

export default router;
