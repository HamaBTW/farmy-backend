/**
 * @swagger
 * tags:
 *   name: ProductTypes
 *   description: Product type management
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     ProductType:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         name:
 *           type: string
 *         unit:
 *           type: string
 *         description:
 *           type: string
 *         icon_url:
 *           type: string
 *         is_active:
 *           type: boolean
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /product-types:
 *   get:
 *     summary: Get all product types
 *     tags: [ProductTypes]
 *     responses:
 *       200:
 *         description: List of product types
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
 *                     $ref: '#/components/schemas/ProductType'
 */
