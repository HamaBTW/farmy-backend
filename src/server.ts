import 'reflect-metadata';
import dotenv from 'dotenv';
dotenv.config();

import { createServer } from 'http';
import app from './app.js';
import { AppDataSource, createDatabaseIfNotExists } from './config/db.config.js';
import { checkEnvVariables } from './middlewares/envCheck.middleware.js';
import { initSocket } from './socket/socket.js';
import logger from './utils/logger.js';

const port = process.env.PORT || 5000;
const server = createServer(app);

const startServer = async () => {
    try {
        if (!checkEnvVariables()) {
            logger.error('❌ Missing required environment variables. Exiting...');
            process.exit(1);
        }

        await createDatabaseIfNotExists();
        await AppDataSource.initialize();
        logger.info('✅ Database connected successfully');

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
