import 'reflect-metadata';
import app from './app.js';
import dotenv from 'dotenv';
import { AppDataSource, createDatabaseIfNotExists } from './config/db.config.js';

dotenv.config();

const port = process.env.PORT || 5000;

const startServer = async () => {
    try {
        // Ensure database exists
        await createDatabaseIfNotExists();

        // Initialize TypeORM
        await AppDataSource.initialize();
        console.log('✅ Database connected successfully');

        app.listen(port, () => {
            console.log(`🚀 Server is running at http://localhost:${port}`);
            console.log(`📖 Swagger docs available at http://localhost:${port}/api-docs`);
        });
    } catch (error) {
        console.error('❌ Error during server startup:', error);
        process.exit(1);
    }
};

startServer();
