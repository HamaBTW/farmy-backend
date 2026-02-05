/**
 * @swagger
 * tags:
 *   - name: Asset Types
 *     description: Base asset type management (Animal, Vegetation, Structure, Machine)
 *   - name: Asset Variants
 *     description: Asset variant management with pricing and attributes
 *   - name: Lands
 *     description: User land management
 *   - name: Item Requests
 *     description: Item purchase requests with approval workflow
 *   - name: Placed Items
 *     description: Items placed on user land
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     AssetType:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         name:
 *           type: string
 *         description:
 *           type: string
 *         icon_url:
 *           type: string
 *         is_active:
 *           type: boolean
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *
 *     AnimalVariant:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         type_id:
 *           type: string
 *           format: uuid
 *         variant_code:
 *           type: string
 *         age:
 *           type: integer
 *         milk_production:
 *           type: number
 *         meat_yield:
 *           type: number
 *         base_price:
 *           type: number
 *         attributes:
 *           type: object
 *         image_url:
 *           type: string
 *         is_available:
 *           type: boolean
 *
 *     VegetationVariant:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         type_id:
 *           type: string
 *           format: uuid
 *         variant_code:
 *           type: string
 *         growth_days:
 *           type: integer
 *         yield_amount:
 *           type: number
 *         water_needs:
 *           type: number
 *         base_price:
 *           type: number
 *         attributes:
 *           type: object
 *         image_url:
 *           type: string
 *         is_available:
 *           type: boolean
 *
 *     StructureVariant:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         type_id:
 *           type: string
 *           format: uuid
 *         variant_code:
 *           type: string
 *         capacity:
 *           type: integer
 *         durability:
 *           type: integer
 *         upgrade_level:
 *           type: integer
 *         base_price:
 *           type: number
 *         attributes:
 *           type: object
 *         image_url:
 *           type: string
 *         is_available:
 *           type: boolean
 *
 *     MachineVariant:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         type_id:
 *           type: string
 *           format: uuid
 *         variant_code:
 *           type: string
 *         speed:
 *           type: number
 *         efficiency:
 *           type: number
 *         fuel_consumption:
 *           type: number
 *         base_price:
 *           type: number
 *         attributes:
 *           type: object
 *         image_url:
 *           type: string
 *         is_available:
 *           type: boolean
 *
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
 *         grid_width:
 *           type: integer
 *         grid_height:
 *           type: integer
 *         is_active:
 *           type: boolean
 *         createdAt:
 *           type: string
 *           format: date-time
 *
 *     ItemRequest:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         user_id:
 *           type: string
 *           format: uuid
 *         land_id:
 *           type: string
 *           format: uuid
 *         asset_category:
 *           type: string
 *           enum: [animal, vegetation, structure, machine]
 *         variant_id:
 *           type: string
 *           format: uuid
 *         position_x:
 *           type: integer
 *         position_y:
 *           type: integer
 *         price_paid:
 *           type: number
 *         status:
 *           type: string
 *           enum: [pending, approved, rejected]
 *         rejection_reason:
 *           type: string
 *         is_refunded:
 *           type: boolean
 *         processed_at:
 *           type: string
 *           format: date-time
 *
 *     PlacedItem:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         land_id:
 *           type: string
 *           format: uuid
 *         request_id:
 *           type: string
 *           format: uuid
 *         asset_category:
 *           type: string
 *           enum: [animal, vegetation, structure, machine]
 *         variant_id:
 *           type: string
 *           format: uuid
 *         position_x:
 *           type: integer
 *         position_y:
 *           type: integer
 *         rotation:
 *           type: integer
 *         state:
 *           type: object
 *         placed_at:
 *           type: string
 *           format: date-time
 *         is_active:
 *           type: boolean
 */

// ============ ASSET TYPES ============

/**
 * @swagger
 * /v1/assets/{category}/types:
 *   get:
 *     summary: Get all asset types for a category
 *     tags: [Asset Types]
 *     parameters:
 *       - in: path
 *         name: category
 *         required: true
 *         schema:
 *           type: string
 *           enum: [animal, vegetation, structure, machine]
 *       - in: query
 *         name: includeInactive
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: List of asset types
 *   post:
 *     summary: Create a new asset type
 *     tags: [Asset Types]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: category
 *         required: true
 *         schema:
 *           type: string
 *           enum: [animal, vegetation, structure, machine]
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
 *               description:
 *                 type: string
 *               icon_url:
 *                 type: string
 *     responses:
 *       201:
 *         description: Asset type created successfully
 */

/**
 * @swagger
 * /v1/assets/{category}/types/{id}:
 *   get:
 *     summary: Get asset type by ID
 *     tags: [Asset Types]
 *     parameters:
 *       - in: path
 *         name: category
 *         required: true
 *         schema:
 *           type: string
 *           enum: [animal, vegetation, structure, machine]
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Asset type details
 *       404:
 *         description: Asset type not found
 *   put:
 *     summary: Update asset type
 *     tags: [Asset Types]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: category
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               icon_url:
 *                 type: string
 *               is_active:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Asset type updated
 *   delete:
 *     summary: Delete asset type
 *     tags: [Asset Types]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: category
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Asset type deleted
 */

/**
 * @swagger
 * /v1/assets/{category}/types/{id}/variants:
 *   get:
 *     summary: Get asset type with all its variants
 *     tags: [Asset Types]
 *     parameters:
 *       - in: path
 *         name: category
 *         required: true
 *         schema:
 *           type: string
 *           enum: [animal, vegetation, structure, machine]
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Asset type with variants
 */

/**
 * @swagger
 * /v1/assets/{category}/types/{id}/toggle-active:
 *   patch:
 *     summary: Toggle asset type active status
 *     tags: [Asset Types]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: category
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Active status toggled
 */

// ============ ASSET VARIANTS ============

/**
 * @swagger
 * /v1/assets/{category}/variants:
 *   get:
 *     summary: Get all variants for a category
 *     tags: [Asset Variants]
 *     parameters:
 *       - in: path
 *         name: category
 *         required: true
 *         schema:
 *           type: string
 *           enum: [animal, vegetation, structure, machine]
 *       - in: query
 *         name: typeId
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: includeUnavailable
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: List of variants
 *   post:
 *     summary: Create a new variant
 *     tags: [Asset Variants]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: category
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - type_id
 *               - variant_code
 *               - base_price
 *             properties:
 *               type_id:
 *                 type: string
 *                 format: uuid
 *               variant_code:
 *                 type: string
 *               base_price:
 *                 type: number
 *               attributes:
 *                 type: object
 *               image_url:
 *                 type: string
 *     responses:
 *       201:
 *         description: Variant created
 */

/**
 * @swagger
 * /v1/assets/{category}/variants/{id}:
 *   get:
 *     summary: Get variant by ID
 *     tags: [Asset Variants]
 *     parameters:
 *       - in: path
 *         name: category
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Variant details
 *   put:
 *     summary: Update variant
 *     tags: [Asset Variants]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: category
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Variant updated
 *   delete:
 *     summary: Delete variant
 *     tags: [Asset Variants]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: category
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Variant deleted
 */

/**
 * @swagger
 * /v1/assets/{category}/variants/code/{code}:
 *   get:
 *     summary: Get variant by code (e.g., cow1, cow2)
 *     tags: [Asset Variants]
 *     parameters:
 *       - in: path
 *         name: category
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: code
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Variant details
 */

/**
 * @swagger
 * /v1/assets/{category}/variants/{id}/price:
 *   get:
 *     summary: Get variant with calculated price
 *     tags: [Asset Variants]
 *     parameters:
 *       - in: path
 *         name: category
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Variant with price
 */

// ============ LANDS ============

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
 *       - in: query
 *         name: includeInactive
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: List of lands
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
 *               description:
 *                 type: string
 *               grid_width:
 *                 type: integer
 *                 default: 10
 *               grid_height:
 *                 type: integer
 *                 default: 10
 *     responses:
 *       201:
 *         description: Land created
 */

/**
 * @swagger
 * /v1/lands/user/my-lands:
 *   get:
 *     summary: Get current user's lands
 *     tags: [Lands]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User's lands
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
 *     responses:
 *       200:
 *         description: Land details
 *   put:
 *     summary: Update land (owner only)
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
 *     responses:
 *       200:
 *         description: Land updated
 *   delete:
 *     summary: Delete land (owner only)
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
 *     responses:
 *       200:
 *         description: Land deleted
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
 *     responses:
 *       200:
 *         description: Land with items
 */

// ============ ITEM REQUESTS ============

/**
 * @swagger
 * /v1/item-requests:
 *   get:
 *     summary: Get all item requests (admin)
 *     tags: [Item Requests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: landId
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, approved, rejected]
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [animal, vegetation, structure, machine]
 *     responses:
 *       200:
 *         description: List of item requests
 *   post:
 *     summary: Create item purchase request
 *     tags: [Item Requests]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - land_id
 *               - asset_category
 *               - variant_id
 *               - position_x
 *               - position_y
 *             properties:
 *               land_id:
 *                 type: string
 *                 format: uuid
 *               asset_category:
 *                 type: string
 *                 enum: [animal, vegetation, structure, machine]
 *               variant_id:
 *                 type: string
 *                 format: uuid
 *               position_x:
 *                 type: integer
 *               position_y:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Item request created
 */

/**
 * @swagger
 * /v1/item-requests/pending:
 *   get:
 *     summary: Get all pending item requests (admin)
 *     tags: [Item Requests]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Pending requests
 */

/**
 * @swagger
 * /v1/item-requests/my-requests:
 *   get:
 *     summary: Get current user's item requests
 *     tags: [Item Requests]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User's requests
 */

/**
 * @swagger
 * /v1/item-requests/{id}:
 *   get:
 *     summary: Get item request by ID
 *     tags: [Item Requests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Request details
 */

/**
 * @swagger
 * /v1/item-requests/{id}/approve:
 *   post:
 *     summary: Approve item request (admin)
 *     tags: [Item Requests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Request approved, item placed
 */

/**
 * @swagger
 * /v1/item-requests/{id}/reject:
 *   post:
 *     summary: Reject item request (admin)
 *     tags: [Item Requests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - reason
 *             properties:
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Request rejected, user refunded
 */

/**
 * @swagger
 * /v1/item-requests/{id}/cancel:
 *   post:
 *     summary: Cancel own item request
 *     tags: [Item Requests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Request cancelled, refunded
 */

// ============ PLACED ITEMS ============

/**
 * @swagger
 * /v1/item-requests/land/{landId}/items:
 *   get:
 *     summary: Get all placed items on a land
 *     tags: [Placed Items]
 *     parameters:
 *       - in: path
 *         name: landId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: List of placed items
 */

/**
 * @swagger
 * /v1/item-requests/placed/{id}:
 *   get:
 *     summary: Get placed item by ID
 *     tags: [Placed Items]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Placed item details
 */

/**
 * @swagger
 * /v1/item-requests/placed/{id}/state:
 *   patch:
 *     summary: Update placed item state
 *     tags: [Placed Items]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - state
 *             properties:
 *               state:
 *                 type: object
 *     responses:
 *       200:
 *         description: State updated
 */

/**
 * @swagger
 * /v1/item-requests/placed/{id}/move:
 *   patch:
 *     summary: Move placed item to new position
 *     tags: [Placed Items]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - position_x
 *               - position_y
 *             properties:
 *               position_x:
 *                 type: integer
 *               position_y:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Item moved
 */

/**
 * @swagger
 * /v1/item-requests/placed/{id}:
 *   delete:
 *     summary: Remove placed item from land
 *     tags: [Placed Items]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Item removed
 */
