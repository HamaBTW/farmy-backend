import admin from 'firebase-admin';
import path from 'path';
import { fileURLToPath } from 'url';
import { DeviceService } from './device.service.js';
import logger from '../../utils/logger.js';

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

    async sendToUser(userId: string, title: string, body: string, data?: any): Promise<admin.messaging.BatchResponse | void> {
        try {
            const devices = await deviceService.getDevicesByUserId(userId);
            const tokens = devices.map(d => d.token);

            if (tokens.length === 0) {
                logger.info(`No devices found for user ${userId}`);
                return;
            }

            const message = {
                notification: {
                    title,
                    body,
                },
                data: data || {},
                tokens: tokens,
            };

            const response = await admin.messaging().sendEachForMulticast(message);

            // Clean up invalid tokens
            if (response.failureCount > 0) {
                const tokensToRemove: string[] = [];
                response.responses.forEach((resp, idx) => {
                    if (!resp.success) {
                        const errorCode = resp.error?.code;
                        if (errorCode === 'messaging/invalid-registration-token' ||
                            errorCode === 'messaging/registration-token-not-registered') {
                            tokensToRemove.push(tokens[idx]);
                        }
                    }
                });

                if (tokensToRemove.length > 0) {
                    for (const token of tokensToRemove) {
                        await deviceService.removeToken(token);
                    }
                    logger.info(`Removed ${tokensToRemove.length} invalid tokens for user ${userId}`);
                }
            }

            return response;
        } catch (error) {
            logger.error('Error sending push notification:', error);
            throw error;
        }
    }
}

export const firebaseService = new FirebaseService();
