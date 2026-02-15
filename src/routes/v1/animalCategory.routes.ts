import { Router } from 'express';
import * as animalCategoryController from '../../controllers/v1/animalCategory.controller.js';

const router = Router();

// Public routes
router.get('/', animalCategoryController.getAllAnimalCategories);
router.get('/:id', animalCategoryController.getAnimalCategoryById);

export default router;
