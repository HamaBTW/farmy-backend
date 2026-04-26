import { Router } from 'express';
import * as assetTypeController from '../../controllers/v1/assetType.controller.js';
import * as assetVariantController from '../../controllers/v1/assetVariant.controller.js';
import { validateRequest } from '../../middlewares/validation.middleware.js';
import { authenticate } from '../../middlewares/auth.middleware.js';
import {
    createAssetTypeSchema,
    updateAssetTypeSchema,
    updateVariantSchema
} from '../../validators/v1/asset.validator.js';

const router = Router();

// Asset Types CRUD
router.get('/:category/types', assetTypeController.getAllAssetTypes);
router.get('/:category/types/with-variants', assetTypeController.getAllAssetTypesWithVariants);
router.get('/:category/types/:id', assetTypeController.getAssetTypeById);
router.get('/:category/types/:id/variants', assetTypeController.getAssetTypeWithVariants);
router.post('/:category/types', authenticate, validateRequest(createAssetTypeSchema), assetTypeController.createAssetType);
router.put('/:category/types/:id', authenticate, validateRequest(updateAssetTypeSchema), assetTypeController.updateAssetType);
router.patch('/:category/types/:id/toggle-active', authenticate, assetTypeController.toggleAssetTypeActive);
router.delete('/:category/types/:id', authenticate, assetTypeController.deleteAssetType);

// Asset Variants CRUD
router.get('/:category/variants', assetVariantController.getAllAssetVariants);
router.get('/:category/variants/:id', assetVariantController.getAssetVariantById);
router.get('/:category/variants/code/:code', assetVariantController.getAssetVariantByCode);
router.get('/:category/variants/:id/price', assetVariantController.getAssetVariantPrice);
router.post('/:category/variants', authenticate, assetVariantController.createAssetVariant);
router.put('/:category/variants/:id', authenticate, validateRequest(updateVariantSchema), assetVariantController.updateAssetVariant);
router.patch('/:category/variants/:id/toggle-available', authenticate, assetVariantController.toggleAssetVariantAvailable);
router.delete('/:category/variants/:id', authenticate, assetVariantController.deleteAssetVariant);

export default router;
