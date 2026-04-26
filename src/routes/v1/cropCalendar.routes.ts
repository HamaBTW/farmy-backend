import { Router } from 'express';
import * as cropCalendarController from '../../controllers/v1/cropCalendar.controller.js';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { validateRequest } from '../../middlewares/validation.middleware.js';
import {
    createCropPlanSchema,
    updateCropPlanSchema,
    upcomingHarvestsQuerySchema,
} from '../../validators/v1/cropCalendar.validator.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Crop cycles (derived from placed items)
router.get('/lands/:landId/crop-cycles', cropCalendarController.getCropCycles);

// Crop plans
router.get('/lands/:landId/crop-plans', cropCalendarController.getCropPlans);
router.post('/crop-plans', validateRequest(createCropPlanSchema), cropCalendarController.createCropPlan);
router.patch('/crop-plans/:id', validateRequest(updateCropPlanSchema), cropCalendarController.updateCropPlan);
router.delete('/crop-plans/:id', cropCalendarController.deleteCropPlan);

// User's crop plans across all lands
router.get('/my-crop-plans', cropCalendarController.getMyCropPlans);
router.get('/upcoming-harvests', validateRequest(upcomingHarvestsQuerySchema), cropCalendarController.getUpcomingHarvests);

export default router;
