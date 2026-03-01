import admin from 'firebase-admin';
import path from 'path';
import { fileURLToPath } from 'url';
import { DeviceService } from './device.service.js';
import logger from '../../utils/logger.js';
import { AppDataSource } from '../../config/db.config.js';
import { Notification, NotificationType } from '../../models/Notification.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const deviceService = new DeviceService();

class FirebaseService {
    constructor() {
        this.initialize();
    }

    private initialize() {
        try {
            // Check if firebase is already initialized
            if (admin.apps.length > 0) return;

            // In a real scenario, the service account file should be provided.
            // We'll look for it in the config or root.
            const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH ||
                path.join(__dirname, '../../../firebase-service-account.json');

            admin.initializeApp({
                credential: admin.credential.cert(serviceAccountPath),
            });
            logger.info('🔥 Firebase Admin SDK initialized');
        } catch (error) {
            logger.error('❌ Failed to initialize Firebase Admin SDK:', error);
            // We don't throw here to allow the server to start even if Firebase fails
        }
    }

    async sendToUsers(
        userIds: string | string[],
        title: string,
        body: string,
        data?: any,
        type: NotificationType = NotificationType.SYSTEM
    ): Promise<admin.messaging.BatchResponse | void> {
        try {
            if (admin.apps.length === 0) {
                logger.error('❌ Firebase Admin SDK not initialized. Please check your service account file.');
                return;
            }

            const ids = Array.isArray(userIds) ? userIds : [userIds];
            const allTokens: string[] = [];

            for (const userId of ids) {
                const devices = await deviceService.getDevicesByUserId(userId);
                allTokens.push(...devices.map(d => d.token));
            }

            if (allTokens.length === 0) {
                logger.info(`No devices found for users: ${ids.join(', ')}`);
                return;
            }

            const message = {
                notification: {
                    title,
                    body,
                },
                data: data || {},
                apns: {
                    payload: {
                        aps: {
                            sound: 'default',
                            contentAvailable: true,
                        },
                    },
                },
                tokens: allTokens,
            };

            logger.info(`Sending notification to ${allTokens.length} tokens for users: ${ids.join(', ')}`);
            const response = await admin.messaging().sendEachForMulticast(message);
            logger.info(`Notification sent. Success: ${response.successCount}, Failure: ${response.failureCount}`);

            // Clean up invalid tokens
            if (response.failureCount > 0) {
                const tokensToRemove: string[] = [];
                response.responses.forEach((resp, idx) => {
                    if (!resp.success) {
                        logger.error(`Token ${idx} failed: ${resp.error?.code} - ${resp.error?.message}`);
                        const errorCode = resp.error?.code;
                        if (errorCode === 'messaging/invalid-registration-token' ||
                            errorCode === 'messaging/registration-token-not-registered') {
                            tokensToRemove.push(allTokens[idx]);
                        }
                    }
                });

                if (tokensToRemove.length > 0) {
                    for (const token of tokensToRemove) {
                        await deviceService.removeToken(token);
                    }
                    logger.info(`Removed ${tokensToRemove.length} invalid tokens`);
                }
            }

            // Persistent Storage (non-blocking save)
            const notificationRepo = AppDataSource.getRepository(Notification);
            const persistPromises = ids.map(uid => {
                const n = notificationRepo.create({
                    user_id: uid,
                    title,
                    message: body,
                    type,
                    data: data || null
                });
                return notificationRepo.save(n);
            });
            Promise.all(persistPromises).catch(err => logger.error('Failed to persist notifications:', err));

            return response;
        } catch (error) {
            logger.error('Error sending push notification:', error);
            throw error;
        }
    }
}

export const firebaseService = new FirebaseService();
