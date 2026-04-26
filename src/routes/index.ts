import { Router } from 'express';
import authRoutesV1 from './v1/auth.routes.js';
import kycRoutesV1 from './v1/kyc.routes.js';
import assetRoutesV1 from './v1/asset.routes.js';
import landRoutesV1 from './v1/land.routes.js';
import landRentalRoutesV1 from './v1/landRental.routes.js';
import itemRequestRoutesV1 from './v1/itemRequest.routes.js';
import productionRoutesV1 from './v1/production.routes.js';
import landGridRoutesV1 from './v1/landGrid.routes.js';
import walletRoutesV1 from './v1/wallet.routes.js';
import productRoutesV1 from './v1/product.routes.js';
import hederaRoutesV1 from './v1/hedera.routes.js';
import proofRoutesV1 from './v1/proof.routes.js';
import deviceRoutesV1 from './v1/device.routes.js';
import notificationRoutesV1 from './v1/notification.routes.js';

import aiRoutesV1 from './v1/ai.routes.js';


const router = Router();

// Health check route
router.get('/v1/health', (req, res) => {
    res.status(200).json({ success: true, message: 'API is online' });
});

console.log('Registering /v1/auth routes');
// API Version 1 Routes
router.use('/v1/auth', authRoutesV1);

import profileRoutesV1 from './v1/profile.routes.js';
console.log('Registering /v1/profile routes');
router.use('/v1/profile', profileRoutesV1);

console.log('Registering /v1/kyc routes');
router.use('/v1/kyc', kycRoutesV1);

console.log('Registering /v1/assets routes');
router.use('/v1/assets', assetRoutesV1);

import assetTaskRoutesV1 from './v1/assetTask.routes.js';
console.log('Registering /v1/asset-tasks routes');
router.use('/v1/asset-tasks', assetTaskRoutesV1);

console.log('Registering /v1/lands routes');
router.use('/v1/lands', landRoutesV1);

console.log('Registering /v1/land-rentals routes');
router.use('/v1/land-rentals', landRentalRoutesV1);

console.log('Registering /v1/item-requests routes');
router.use('/v1/item-requests', itemRequestRoutesV1);

console.log('Registering /v1/production routes');
router.use('/v1/production', productionRoutesV1);

console.log('Registering /v1/land-grid routes');
router.use('/v1/land-grid', landGridRoutesV1);

console.log('Registering /v1/wallet routes');
router.use('/v1/wallet', walletRoutesV1);

console.log('Registering /v1/products routes');
router.use('/v1/products', productRoutesV1);

console.log('Registering /v1/hedera routes');
router.use('/v1/hedera', hederaRoutesV1);

import productTypeRoutesV1 from './v1/productType.routes.js';
console.log('Registering /v1/product-types routes');
router.use('/v1/product-types', productTypeRoutesV1);

// Worker System Routes
import workerProfileRoutesV1 from './v1/workerProfile.routes.js';
console.log('Registering /v1/worker-profile routes');
router.use('/v1/worker-profile', workerProfileRoutesV1);

import landWorkerRoutesV1 from './v1/landWorker.routes.js';
console.log('Registering /v1/workforce routes');
router.use('/v1/workforce', landWorkerRoutesV1);

import taskRoutesV1 from './v1/task.routes.js';
console.log('Registering /v1/tasks routes');
router.use('/v1/tasks', taskRoutesV1);

// Worker Lifecycle Routes (Invitation + Contract)
import invitationRoutesV1 from './v1/invitation.routes.js';
console.log('Registering /v1/workforce invitation routes');
router.use('/v1/workforce', invitationRoutesV1);

import contractRoutesV1 from './v1/contract.routes.js';
console.log('Registering /v1/workforce contract routes');
router.use('/v1/workforce', contractRoutesV1);

console.log('Registering /v1/proofs routes');
router.use('/v1/proofs', proofRoutesV1);

console.log('Registering /v1/devices routes');
router.use('/v1/devices', deviceRoutesV1);

console.log('Registering /v1/notifications routes');
router.use('/v1/notifications', notificationRoutesV1);

console.log('Registering /v1/ai routes');
router.use('/v1/ai', aiRoutesV1);

import investmentAgentRoutesV1 from './v1/investmentAgent.routes.js';
console.log('Registering /v1/investment-agent routes');
router.use('/v1/investment-agent', investmentAgentRoutesV1);

import farmerAgentRoutesV1 from './v1/farmerAgent.routes.js';
console.log('Registering /v1/farmer-agent routes');
router.use('/v1/farmer-agent', farmerAgentRoutesV1);

import cropCalendarRoutesV1 from './v1/cropCalendar.routes.js';
console.log('Registering /v1/crop-calendar routes');
router.use('/v1', cropCalendarRoutesV1);

import subscriptionRoutesV1 from './v1/subscription.routes.js';
console.log('Registering /v1/subscriptions routes');
router.use('/v1/subscriptions', subscriptionRoutesV1);

export default router;



