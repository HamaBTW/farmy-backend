import { Router } from 'express';
import * as landGridController from '../../controllers/v1/landGrid.controller.js';
import { authenticate } from '../../middlewares/auth.middleware.js';

const router = Router();

/**
 * @swagger
 * /api/v1/lands/{id}/grid:
 *   get:
 *     summary: Get the grid matrix for a land
 *     tags: [Land Grid]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The land ID
 *     responses:
 *       200:
 *         description: Grid matrix retrieved successfully
 */
router.get('/:id/grid', authenticate, landGridController.getLandGrid);

/**
 * @swagger
 * /api/v1/assets/{category}/variants/{id}/footprint:
 *   get:
 *     summary: Get the grid footprint for an asset variant
 *     tags: [Land Grid]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: category
 *         required: true
 *         schema:
 *           type: string
 *         description: Asset category (animal, vegetation, tree, structure, machine)
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The variant ID
 *       - in: query
 *         name: rotation
 *         schema:
 *           type: integer
 *           enum: [0, 90, 180, 270]
 *         description: |
 *           Rotation in degrees. 
 *           Examples: 
 *           - A 3x1 asset at 0° takes 3 horizontal squares.
 *           - A 3x1 asset at 90° takes 3 vertical squares.
 *           - A 2x2 asset takes 4 squares (2 width x 2 height).
 *     responses:
 *       200:
 *         description: Footprint retrieved successfully
 */
router.get('/assets/:category/variants/:id/footprint', authenticate, landGridController.getVariantFootprint);

export default router;
