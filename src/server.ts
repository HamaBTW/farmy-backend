import 'reflect-metadata';
import dotenv from 'dotenv';
dotenv.config(); // Load envs first

import app from './app.js';
import { AppDataSource, createDatabaseIfNotExists } from './config/db.config.js';
import { checkEnvVariables } from './middlewares/envCheck.middleware.js';
import logger from './utils/logger.js';

const port = process.env.PORT || 5000;

const startServer = async () => {
    try {
        // Load environment variables verification
        if (!checkEnvVariables()) {
            logger.error('❌ Missing required environment variables. Exiting...');
            process.exit(1);
        }

        // Ensure database exists
        await createDatabaseIfNotExists();

        // Initialize TypeORM
        await AppDataSource.initialize();
        logger.info('✅ Database connected successfully');

        app.listen(port, () => {
            logger.info(`🚀 Server is running at http://localhost:${port}`);
            logger.info(`📖 Swagger docs available at http://localhost:${port}/api-docs`);
        });
    } catch (error) {
        logger.error('❌ Error during server startup: %O', error);
        process.exit(1);
    }
};

startServer();
