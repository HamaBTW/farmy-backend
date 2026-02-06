/**
 * @swagger
 * tags:
 *   name: Lands
 *   description: Land management endpoints
 */

/**
 * @swagger
 * /v1/lands:
 *   get:
 *     summary: Get all lands
 *     tags: [Lands]
 *     parameters:
 *       - in: query
 *         name: ownerId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter lands by owner ID
 *       - in: query
 *         name: includeInactive
 *         schema:
 *           type: boolean
 *         description: Include inactive lands in results
 *     responses:
 *       200:
 *         description: List of lands retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Land'
 */

/**
 * @swagger
 * /v1/lands/{id}:
 *   get:
 *     summary: Get land by ID
 *     tags: [Lands]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Land ID
 *     responses:
 *       200:
 *         description: Land retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Land'
 *       404:
 *         description: Land not found
 */

/**
 * @swagger
 * /v1/lands/{id}/items:
 *   get:
 *     summary: Get land with all placed items
 *     tags: [Lands]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Land ID
 *     responses:
 *       200:
 *         description: Land with items retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/LandWithItems'
 *       404:
 *         description: Land not found
 */

/**
 * @swagger
 * /v1/lands/user/my-lands:
 *   get:
 *     summary: Get authenticated user's lands
 *     tags: [Lands]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User's lands retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Land'
 *       401:
 *         description: Not authenticated
 */

/**
 * @swagger
 * /v1/lands:
 *   post:
 *     summary: Create a new land
 *     tags: [Lands]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 100
 *                 example: Green Valley Farm
 *               description:
 *                 type: string
 *                 maxLength: 500
 *                 example: Fertile land perfect for crops
 *               width_m:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 10000
 *                 default: 10
 *                 example: 15
 *               height_m:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 10000
 *                 default: 10
 *                 example: 15
 *               grid_width:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 10000
 *                 default: 10
 *                 description: Legacy field (use width_m instead)
 *               grid_height:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 10000
 *                 default: 10
 *                 description: Legacy field (use height_m instead)
 *               boundaries:
 *                 type: object
 *                 description: Polygon boundaries (optional)
 *     responses:
 *       201:
 *         description: Land created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/Land'
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Not authenticated
 */

/**
 * @swagger
 * /v1/lands/{id}:
 *   put:
 *     summary: Update land details
 *     tags: [Lands]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Land ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 100
 *               description:
 *                 type: string
 *                 maxLength: 500
 *               width_m:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 10000
 *               height_m:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 10000
 *               grid_width:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 10000
 *               grid_height:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 10000
 *               boundaries:
 *                 type: object
 *               is_active:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Land updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/Land'
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: You do not own this land
 *       404:
 *         description: Land not found
 */

/**
 * @swagger
 * /v1/lands/{id}:
 *   delete:
 *     summary: Delete a land
 *     tags: [Lands]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Land ID
 *     responses:
 *       200:
 *         description: Land deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: You do not own this land
 *       404:
 *         description: Land not found
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Land:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         owner_id:
 *           type: string
 *           format: uuid
 *         name:
 *           type: string
 *         description:
 *           type: string
 *           nullable: true
 *         width_m:
 *           type: number
 *           format: float
 *         height_m:
 *           type: number
 *           format: float
 *         grid_width:
 *           type: integer
 *           description: Calculated grid columns (Read-only)
 *         grid_height:
 *           type: integer
 *           description: Calculated grid rows (Read-only)
 *         boundaries:
 *           type: object
 *           nullable: true
 *         is_active:
 *           type: boolean
 *           default: true
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *         owner:
 *           type: object
 *           description: Land owner details
 *     LandWithItems:
 *       allOf:
 *         - $ref: '#/components/schemas/Land'
 *         - type: object
 *           properties:
 *             placed_items:
 *               type: array
 *               items:
 *                 type: object
 *                 description: Placed item details
 */
