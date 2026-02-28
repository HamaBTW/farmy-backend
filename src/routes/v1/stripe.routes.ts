import { Router } from 'express';
import express from 'express';
import { stripeWebhookController } from '../../controllers/v1/stripeWebhook.controller.js';

const router = Router();

// Crucial: Webhooks must use express.raw to retrieve the raw body for Stripe signature validation.
router.post('/webhook', express.raw({ type: 'application/json' }), stripeWebhookController.handleWebhook);

export default router;
