import 'reflect-metadata';
import dotenv from 'dotenv';
dotenv.config();

import { createServer } from 'http';
import app from './app.js';
import { AppDataSource, createDatabaseIfNotExists, ensureAiAssistantSchema, ensureCropCalendarSchema, ensureWorkerWalletSchema, ensureProductsSchema, ensureAppleSignInSchema, ensureJobRequestSchema, ensureJobApplicationSchema, ensureWorkforceSchema, ensureFeedbackSchema } from './config/db.config.js';
import { checkEnvVariables } from './middlewares/envCheck.middleware.js';
import { initSocket } from './socket/socket.js';
import logger from './utils/logger.js';
import { startSubscriptionCron } from './cron/subscriptionCron.js';

const port = process.env.PORT || 5000;
const server = createServer(app);

server.on('error', (error: any) => {
    if (error?.code === 'EADDRINUSE') {
        logger.error('❌ Port %s is already in use. Stop the existing process or change PORT.', port);
    } else {
        logger.error('❌ Server runtime error: %O', error);
    }
    process.exit(1);
});

const startServer = async () => {
    try {
        if (!checkEnvVariables()) {
            logger.error('❌ Missing required environment variables. Exiting...');
            process.exit(1);
        }

        await createDatabaseIfNotExists();
        await AppDataSource.initialize();
        await ensureAiAssistantSchema(AppDataSource);
        await ensureCropCalendarSchema(AppDataSource);
        await ensureWorkerWalletSchema(AppDataSource);
        await ensureProductsSchema(AppDataSource);
        await ensureAppleSignInSchema(AppDataSource);
        await ensureJobRequestSchema(AppDataSource);
        await ensureJobApplicationSchema(AppDataSource);
        await ensureWorkforceSchema(AppDataSource);
        await ensureFeedbackSchema(AppDataSource);
        logger.info('✅ Database connected successfully');
        logger.info(
            `🗄️ TypeORM synchronize is ${AppDataSource.options.synchronize ? 'ENABLED' : 'DISABLED'}`
        );

        startSubscriptionCron();

        initSocket(server);
        logger.info('🔌 Socket.io initialized');

        server.listen(port, () => {
            logger.info(`🚀 Server is running at http://localhost:${port}`);
            logger.info(`📖 Swagger docs available at http://localhost:${port}/api-docs`);
        });
    } catch (error) {
        logger.error('❌ Error during server startup: %O', error);
        process.exit(1);
    }
};

startServer();
