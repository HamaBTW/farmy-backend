import { Router } from 'express';
import * as landResourceController from '../../controllers/v1/landResource.controller.js';
import { authenticate } from '../../middlewares/auth.middleware.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Land resource routes
router.get('/:landId/resources', landResourceController.getLandResources);
router.post('/:landId/resources', landResourceController.addLandResource);
router.put('/:landId/resources/:resourceId', landResourceController.updateLandResource);
router.delete('/:landId/resources/:resourceId', landResourceController.deleteLandResource);

// Land stats routes
router.get('/:id/stats', landResourceController.getLandStats);
router.put('/:id/stats', landResourceController.updateLandStats);

export default router;
