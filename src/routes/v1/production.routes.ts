import { Router } from 'express';
import * as productionController from '../../controllers/v1/production.controller.js';
import { validateRequest } from '../../middlewares/validation.middleware.js';
import { authenticate } from '../../middlewares/auth.middleware.js';
import {
    createProductTypeSchema,
    updateProductTypeSchema,
    addProductionSchema,
    updateProductionSchema
} from '../../validators/v1/asset.validator.js';

const router = Router();

// Product Types
router.get('/products', productionController.getAllProductTypes);
router.get('/products/:id', productionController.getProductTypeById);
router.post('/products', authenticate, validateRequest(createProductTypeSchema), productionController.createProductType);
router.put('/products/:id', authenticate, validateRequest(updateProductTypeSchema), productionController.updateProductType);
router.delete('/products/:id', authenticate, productionController.deleteProductType);

// Asset Productions
router.get('/:category/variants/:variantId/productions', productionController.getVariantProductions);
router.get('/:category/variants/:variantId/full', productionController.getVariantWithProductions);
router.post('/:category/variants/:variantId/productions', authenticate, validateRequest(addProductionSchema), productionController.addProductionToVariant);
router.put('/productions/:id', authenticate, validateRequest(updateProductionSchema), productionController.updateProduction);
router.delete('/productions/:id', authenticate, productionController.removeProduction);

export default router;
