import { DataSource } from 'typeorm';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import mysql from 'mysql2/promise';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const parseBooleanEnv = (value: string | undefined, defaultValue: boolean) => {
    if (value == null || value.trim() === '') return defaultValue;

    const normalized = value.trim().toLowerCase();
    if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
    if (['0', 'false', 'no', 'off'].includes(normalized)) return false;

    return defaultValue;
};

const dbSynchronize = parseBooleanEnv(process.env.DB_SYNCHRONIZE, false);
const dbLogging = parseBooleanEnv(process.env.DB_LOGGING, false);

export const createDatabaseIfNotExists = async () => {
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            port: Number(process.env.DB_PORT) || 3306,
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
        });

        await connection.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME || 'farmy'}\`;`);
        console.log(`✅ Database "${process.env.DB_NAME || 'farmy'}" checked/created successfully`);
        await connection.end();
    } catch (error) {
        console.error(`❌ Error creating database:`, error);
        throw error;
    }
};

export const AppDataSource = new DataSource({
    type: 'mysql',
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    username: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'farmy',
    synchronize: dbSynchronize,
    logging: dbLogging,
    entities: [path.join(__dirname, '../models/*.{ts,js}')], // Support both TS (dev) and JS (prod)
    migrations: [path.join(__dirname, '/migrations/*.js')], // Use the correct path
    subscribers: [],
});
