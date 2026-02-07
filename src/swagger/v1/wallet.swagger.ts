/**
 * @swagger
 * tags:
 *   name: Wallet
 *   description: Wallet and payment management
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     PaymentMethod:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         type:
 *           type: string
 *           enum: [card, paypal, other]
 *         last4:
 *           type: string
 *         brand:
 *           type: string
 *         expiry_month:
 *           type: string
 *         expiry_year:
 *           type: string
 *         is_default:
 *           type: boolean
 *     WalletStatus:
 *       type: object
 *       properties:
 *         credits:
 *           type: number
 *         stripe_customer_id:
 *           type: string
 *         payment_methods:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/PaymentMethod'
 */

/**
 * @swagger
 * /v1/wallet/me:
 *   get:
 *     summary: Get wallet status
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Wallet status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/WalletStatus'
 */

/**
 * @swagger
 * /v1/wallet/create-setup-intent:
 *   post:
 *     summary: Create a Stripe Setup Intent for adding a payment method
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Setup intent created
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
 *                     setupIntent:
 *                       type: string
 *                     ephemeralKey:
 *                       type: string
 *                     customer:
 *                       type: string
 *                     publishableKey:
 *                       type: string
 */

/**
 * @swagger
 * /v1/wallet/create-payment-intent:
 *   post:
 *     summary: Create a Stripe Payment Intent for adding credits
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *             properties:
 *               amount:
 *                 type: number
 *                 description: Amount to charge
 *     responses:
 *       200:
 *         description: Payment intent created
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
 *                     paymentIntent:
 *                       type: string
 *                     ephemeralKey:
 *                       type: string
 *                     customer:
 *                       type: string
 *                     publishableKey:
 *                       type: string
 */

/**
 * @swagger
 * /v1/wallet/payment-methods:
 *   post:
 *     summary: Add a payment method (Internal use, usually handled via Stripe webhook)
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               type:
 *                 type: string
 *                 default: card
 *               last4:
 *                 type: string
 *               brand:
 *                 type: string
 *               expiry_month:
 *                 type: string
 *               expiry_year:
 *                 type: string
 *               is_default:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Payment method added
 */

/**
 * @swagger
 * /v1/wallet/charge:
 *   post:
 *     summary: Charge credits (For testing or simple flows)
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *             properties:
 *               amount:
 *                 type: number
 *     responses:
 *       200:
 *         description: Credits added
 */

/**
 * @swagger
 * /v1/wallet/payment-methods/{id}:
 *   delete:
 *     summary: Delete a payment method
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Payment method deleted
 */
