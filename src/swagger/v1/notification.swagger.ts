/**
 * @swagger
 * tags:
 *   name: Notifications
 *   description: In-app notification history management
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Notification:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: Unique notification ID
 *         user_id:
 *           type: string
 *           format: uuid
 *           description: ID of the user this notification belongs to
 *         title:
 *           type: string
 *           example: "New Rental!"
 *         message:
 *           type: string
 *           example: "John has rented your land: Green Orchard"
 *         type:
 *           type: string
 *           enum: [rental, purchase, item_request, proof, invitation, contract, wallet, system]
 *           description: Notification category
 *         is_read:
 *           type: boolean
 *           default: false
 *         data:
 *           type: object
 *           nullable: true
 *           description: Additional metadata related to the notification (e.g. land_id, contract_id)
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /v1/notifications:
 *   get:
 *     summary: Get my notifications
 *     description: Retrieves the latest 50 notifications for the authenticated user, ordered by most recent first.
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of notifications
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Notification'
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /v1/notifications/read-all:
 *   patch:
 *     summary: Mark all notifications as read
 *     description: Marks every unread notification for the authenticated user as read.
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All notifications marked as read
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: All notifications marked as read
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /v1/notifications/{id}/read:
 *   patch:
 *     summary: Mark a notification as read
 *     description: Marks a single notification as read. Only the owner of the notification can mark it.
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Notification ID
 *     responses:
 *       200:
 *         description: Notification marked as read
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Notification marked as read
 *       404:
 *         description: Notification not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /v1/notifications/{id}:
 *   delete:
 *     summary: Delete a notification
 *     description: Permanently removes a notification from the user's history. Only the owner can delete their own notifications.
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Notification ID
 *     responses:
 *       200:
 *         description: Notification deleted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Notification deleted
 *       404:
 *         description: Notification not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
