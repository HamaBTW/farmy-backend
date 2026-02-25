/**
 * @swagger
 * tags:
 *   name: Devices
 *   description: Push Notification Device Management
 */

/**
 * @swagger
 * /v1/devices/register:
 *   post:
 *     summary: Register or update a device token
 *     tags: [Devices]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *             properties:
 *               token:
 *                 type: string
 *                 description: FCM registration token
 *               fingerprint:
 *                 type: string
 *                 description: Unique device identifier
 *               platform:
 *                 type: string
 *                 enum: [android, ios, web, other]
 *     responses:
 *       200:
 *         description: Device registered successfully
 *       400:
 *         description: Missing token
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /v1/devices/unregister:
 *   post:
 *     summary: Remove a device token
 *     tags: [Devices]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *             properties:
 *               token:
 *                 type: string
 *     responses:
 *       200:
 *         description: Device unregistered successfully
 */

/**
 * @swagger
 * /v1/devices/test-send:
 *   post:
 *     summary: Send a test push notification to a user
 *     tags: [Devices]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - title
 *               - body
 *             properties:
 *               userId:
 *                 type: string
 *               title:
 *                 type: string
 *               body:
 *                 type: string
 *               data:
 *                 type: object
 *     responses:
 *       200:
 *         description: Test notification sent
 *       500:
 *         description: Error sending notification
 */
