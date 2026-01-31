import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { AppError } from '../../middlewares/error.middleware.js';

class FirebaseService {
    private isInitialized = false;

    private init() {
        if (this.isInitialized) return;

        try {
            const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || './src/config/firebase-service-account.json';
            const serviceAccount = JSON.parse(readFileSync(resolve(serviceAccountPath), 'utf8'));

            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
                projectId: process.env.FIREBASE_PROJECT_ID,
            });

            this.isInitialized = true;
        } catch (error) {
            console.error('Firebase initialization failed:', error);
            // We don't throw here to allow the app to start even if Firebase fails
        }
    }

    async verifyFirebaseToken(idToken: string) {
        this.init();
        if (!this.isInitialized) {
            throw new AppError(500, 'Firebase service not initialized');
        }

        try {
            const decodedToken = await admin.auth().verifyIdToken(idToken);
            return {
                uid: decodedToken.uid,
                email: decodedToken.email!,
                name: decodedToken.name,
                picture: decodedToken.picture,
            };
        } catch (error) {
            console.error('Firebase token verification failed:', error);
            throw new AppError(401, 'Invalid Firebase token');
        }
    }
}

export const firebaseService = new FirebaseService();
