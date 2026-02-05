/**
 * @swagger
 * tags:
 *   name: Land Rentals
 *   description: Land rental management endpoints
 */

/**
 * @swagger
 * /v1/land-rentals:
 *   get:
 *     summary: Get all land rentals
 *     tags: [Land Rentals]
 *     parameters:
 *       - in: query
 *         name: landId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter rentals by land ID
 *       - in: query
 *         name: investorId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter rentals by investor ID
 *       - in: query
 *         name: paymentStatus
 *         schema:
 *           type: string
 *           enum: [pending, paid, overdue, cancelled]
 *         description: Filter rentals by payment status
 *     responses:
 *       200:
 *         description: List of land rentals retrieved successfully
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
 *                     $ref: '#/components/schemas/LandRental'
 */

/**
 * @swagger
 * /v1/land-rentals/active:
 *   get:
 *     summary: Get active land rentals
 *     tags: [Land Rentals]
 *     parameters:
 *       - in: query
 *         name: landId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter active rentals by land ID
 *     responses:
 *       200:
 *         description: Active rentals retrieved successfully
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
 *                     $ref: '#/components/schemas/LandRental'
 */

/**
 * @swagger
 * /v1/land-rentals/overdue:
 *   get:
 *     summary: Get rentals with overdue payments
 *     tags: [Land Rentals]
 *     responses:
 *       200:
 *         description: Overdue rentals retrieved successfully
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
 *                     $ref: '#/components/schemas/LandRental'
 */

/**
 * @swagger
 * /v1/land-rentals/{id}:
 *   get:
 *     summary: Get land rental by ID
 *     tags: [Land Rentals]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Land rental ID
 *     responses:
 *       200:
 *         description: Land rental retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/LandRentalDetailed'
 *       404:
 *         description: Land rental not found
 */

/**
 * @swagger
 * /v1/land-rentals/land/{landId}:
 *   get:
 *     summary: Get all rentals for a specific land
 *     tags: [Land Rentals]
 *     parameters:
 *       - in: path
 *         name: landId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Land ID
 *     responses:
 *       200:
 *         description: Land rentals retrieved successfully
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
 *                     $ref: '#/components/schemas/LandRental'
 */

/**
 * @swagger
 * /v1/land-rentals/owner/my-rentals:
 *   get:
 *     summary: Get authenticated user's rentals as land owner
 *     tags: [Land Rentals]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Owner's rentals retrieved successfully
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
 *                     $ref: '#/components/schemas/LandRental'
 *       401:
 *         description: Not authenticated
 */

/**
 * @swagger
 * /v1/land-rentals/investor/my-rentals:
 *   get:
 *     summary: Get authenticated user's rentals as investor
 *     tags: [Land Rentals]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Investor's rentals retrieved successfully
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
 *                     $ref: '#/components/schemas/LandRental'
 *       401:
 *         description: Not authenticated
 */

/**
 * @swagger
 * /v1/land-rentals:
 *   post:
 *     summary: Create a new land rental agreement
 *     tags: [Land Rentals]
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
 *               - investor_id
 *               - rental_start_date
 *               - monthly_rent
 *               - payment_due_date
 *             properties:
 *               land_id:
 *                 type: string
 *                 format: uuid
 *                 example: land-001-uuid-test-0000-000000000001
 *               investor_id:
 *                 type: string
 *                 format: uuid
 *                 example: investor-01-uuid-test-0000-000000000001
 *               rental_start_date:
 *                 type: string
 *                 format: date-time
 *                 example: 2026-02-06T00:00:00Z
 *               rental_end_date:
 *                 type: string
 *                 format: date-time
 *                 nullable: true
 *                 example: 2026-12-31T23:59:59Z
 *               monthly_rent:
 *                 type: number
 *                 format: decimal
 *                 minimum: 0.01
 *                 example: 500.00
 *               payment_due_date:
 *                 type: string
 *                 format: date-time
 *                 example: 2026-03-06T00:00:00Z
 *               payment_status:
 *                 type: string
 *                 enum: [pending, paid, overdue, cancelled]
 *                 default: pending
 *     responses:
 *       201:
 *         description: Land rental created successfully
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
 *                   $ref: '#/components/schemas/LandRental'
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Not authenticated
 *       404:
 *         description: Land or investor not found
 */

/**
 * @swagger
 * /v1/land-rentals/{id}:
 *   put:
 *     summary: Update land rental details
 *     tags: [Land Rentals]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Land rental ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               rental_start_date:
 *                 type: string
 *                 format: date-time
 *               rental_end_date:
 *                 type: string
 *                 format: date-time
 *                 nullable: true
 *               monthly_rent:
 *                 type: number
 *                 format: decimal
 *                 minimum: 0.01
 *               payment_due_date:
 *                 type: string
 *                 format: date-time
 *               payment_status:
 *                 type: string
 *                 enum: [pending, paid, overdue, cancelled]
 *               payment_date:
 *                 type: string
 *                 format: date-time
 *                 nullable: true
 *     responses:
 *       200:
 *         description: Land rental updated successfully
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
 *                   $ref: '#/components/schemas/LandRental'
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: You do not have permission to update this rental
 *       404:
 *         description: Land rental not found
 */

/**
 * @swagger
 * /v1/land-rentals/{id}/payment:
 *   patch:
 *     summary: Update payment status
 *     tags: [Land Rentals]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Land rental ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - payment_status
 *             properties:
 *               payment_status:
 *                 type: string
 *                 enum: [pending, paid, overdue, cancelled]
 *                 example: paid
 *               payment_date:
 *                 type: string
 *                 format: date-time
 *                 nullable: true
 *                 example: 2026-02-06T10:30:00Z
 *     responses:
 *       200:
 *         description: Payment status updated successfully
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
 *                   $ref: '#/components/schemas/LandRental'
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: You do not have permission to update this rental
 *       404:
 *         description: Land rental not found
 */

/**
 * @swagger
 * /v1/land-rentals/{id}:
 *   delete:
 *     summary: Delete a land rental agreement
 *     tags: [Land Rentals]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Land rental ID
 *     responses:
 *       200:
 *         description: Land rental deleted successfully
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
 *         description: Only the land owner can delete rental agreements
 *       404:
 *         description: Land rental not found
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     LandRental:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         land_id:
 *           type: string
 *           format: uuid
 *         investor_id:
 *           type: string
 *           format: uuid
 *         rental_start_date:
 *           type: string
 *           format: date-time
 *         rental_end_date:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         monthly_rent:
 *           type: number
 *           format: decimal
 *         payment_status:
 *           type: string
 *           enum: [pending, paid, overdue, cancelled]
 *           default: pending
 *         payment_due_date:
 *           type: string
 *           format: date-time
 *         payment_date:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     LandRentalDetailed:
 *       allOf:
 *         - $ref: '#/components/schemas/LandRental'
 *         - type: object
 *           properties:
 *             land:
 *               $ref: '#/components/schemas/Land'
 *             investor:
 *               type: object
 *               description: Investor user details
 */
