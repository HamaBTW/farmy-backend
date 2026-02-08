import { Router } from 'express';
import { getAllProductTypes } from '../../controllers/v1/productType.controller.js';

const router = Router();

router.get('/', getAllProductTypes);

export default router;
