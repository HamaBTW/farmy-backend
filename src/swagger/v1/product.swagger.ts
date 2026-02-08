/**
 * @swagger
 * tags:
 *   name: Products
 *   description: Marketplace product management
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Product:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         title:
 *           type: string
 *         description:
 *           type: string
 *         price:
 *           type: number
 *         quantity:
 *           type: number
 *         unit:
 *           type: string
 *         status:
 *           type: string
 *           enum: [available, sold, hidden]
 *         images:
 *           type: array
 *           items:
 *             type: string
 *         owner_id:
 *           type: string
 *           format: uuid
 *         product_type_id:
 *           type: string
 *           format: uuid
 *         land_id:
 *           type: string
 *           format: uuid
 *         land_rental_id:
 *           type: string
 *           format: uuid
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /products:
 *   post:
 *     summary: Create a new product listing
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - price
 *               - quantity
 *               - unit
 *               - product_type_id
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               price:
 *                 type: number
 *               quantity:
 *                 type: number
 *               unit:
 *                 type: string
 *               product_type_id:
 *                 type: string
 *                 format: uuid
 *               land_id:
 *                 type: string
 *                 format: uuid
 *               land_rental_id:
 *                 type: string
 *                 format: uuid
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: Product created successfully
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
 *                   $ref: '#/components/schemas/Product'
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 * 
 *   get:
 *     summary: Get all products
 *     tags: [Products]
 *     parameters:
 *       - in: query
 *         name: ownerId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by owner ID
 *       - in: query
 *         name: landId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by land ID
 *       - in: query
 *         name: productTypeId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by product type ID
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [available, sold, hidden]
 *         description: Filter by status
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by title
 *     responses:
 *       200:
 *         description: List of products
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
 *                     $ref: '#/components/schemas/Product'
 * 
 * /products/{id}:
 *   get:
 *     summary: Get product by ID
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Product details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Product'
 *       404:
 *         description: Product not found
 * 
 *   patch:
 *     summary: Update product
 *     tags: [Products]
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
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               price:
 *                 type: number
 *               quantity:
 *                 type: number
 *               unit:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [available, sold, hidden]
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Product updated successfully
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
 *                   $ref: '#/components/schemas/Product'
 *       403:
 *         description: Not authorized to update this product
 *       404:
 *         description: Product not found
 * 
 *   delete:
 *     summary: Delete product
 *     tags: [Products]
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
 *         description: Product deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       403:
 *         description: Not authorized to delete this product
 *       404:
 *         description: Product not found
 *
 *   /products/{id}/buy:
 *     post:
 *       summary: Buy a product
 *       tags: [Products]
 *       security:
 *         - bearerAuth: []
 *       parameters:
 *         - in: path
 *           name: id
 *           required: true
 *           schema:
 *             type: string
 *             format: uuid
 *       responses:
 *         200:
 *           description: Purchase successful
 *           content:
 *             application/json:
 *               schema:
 *                 type: object
 *                 properties:
 *                   success:
 *                     type: boolean
 *                   message:
 *                     type: string
 *                   product:
 *                     $ref: '#/components/schemas/Product'
 *                   new_balance:
 *                     type: number
 *         400:
 *           description: Invalid request (e.g. self-purchase, insufficient funds, product unavailable)
 *         404:
 *           description: Product or User not found
 */
