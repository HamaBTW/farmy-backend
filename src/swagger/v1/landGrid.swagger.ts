/**
 * @swagger
 * tags:
 *   name: Land Grid
 *   description: Grid system and asset footprint calculations
 */

/**
 * @swagger
 * /v1/land-grid/{id}/grid:
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
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     land_id:
 *                       type: string
 *                       format: uuid
 *                     grid_width:
 *                       type: integer
 *                     grid_height:
 *                       type: integer
 *                     geometry_hash:
 *                       type: string
 *                       nullable: true
 *                     has_polygon_boundaries:
 *                       type: boolean
 *                     playable_mask:
 *                       type: array
 *                       items:
 *                         type: array
 *                         items:
 *                           type: boolean
 *                     matrix:
 *                       type: array
 *                       items:
 *                         type: array
 *                         items:
 *                           type: object
 *                           nullable: true
 */

/**
 * @swagger
 * /v1/land-grid/assets/{category}/variants/{id}/footprint:
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
 *           enum: [animal, vegetation, tree, structure, machine]
 *         description: Asset category
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
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     variant_id:
 *                       type: string
 *                     category:
 *                       type: string
 *                     base_size:
 *                       type: object
 *                       properties:
 *                         width:
 *                           type: number
 *                         height:
 *                           type: number
 *                     rotation:
 *                       type: number
 *                     total_squares:
 *                       type: number
 *                     squares:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           x:
 *                             type: number
 *                           y:
 *                             type: number
 */
