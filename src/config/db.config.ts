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

export const ensureAiAssistantSchema = async (dataSource: DataSource) => {
    const userTableRows = await dataSource.query(`
        SELECT COUNT(*) AS total
        FROM information_schema.tables
        WHERE table_schema = DATABASE()
          AND table_name = 'users'
    `) as Array<{ total: number | string }>;

    const userTableExists = Number(userTableRows?.[0]?.total || 0) > 0;
    if (!userTableExists) {
        console.warn('Skipping AI assistant schema bootstrap because users table is missing.');
        return;
    }

    await dataSource.query(`
        CREATE TABLE IF NOT EXISTS \`ai_assistant_chats\` (
            \`id\` varchar(36) NOT NULL,
            \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
            \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
            \`user_id\` varchar(36) NOT NULL,
            \`title\` varchar(180) NOT NULL,
            \`last_message_at\` datetime(6) NULL,
            \`is_active\` tinyint NOT NULL DEFAULT 1,
            PRIMARY KEY (\`id\`),
            KEY \`IDX_ai_assistant_chats_user_active\` (\`user_id\`, \`is_active\`),
            KEY \`IDX_ai_assistant_chats_last_message\` (\`last_message_at\`),
            CONSTRAINT \`FK_ai_assistant_chats_user\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
    `);

    await dataSource.query(`
        CREATE TABLE IF NOT EXISTS \`ai_assistant_messages\` (
            \`id\` varchar(36) NOT NULL,
            \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
            \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
            \`chat_id\` varchar(36) NOT NULL,
            \`user_id\` varchar(36) NOT NULL,
            \`role\` enum('user','assistant','system') NOT NULL,
            \`content\` text NOT NULL,
            \`edited_from_message_id\` varchar(36) NULL,
            \`meta\` text NULL,
            PRIMARY KEY (\`id\`),
            KEY \`IDX_ai_assistant_messages_chat_created\` (\`chat_id\`, \`createdAt\`),
            KEY \`IDX_ai_assistant_messages_user_created\` (\`user_id\`, \`createdAt\`),
            KEY \`IDX_ai_assistant_messages_edited_from\` (\`edited_from_message_id\`),
            CONSTRAINT \`FK_ai_assistant_messages_chat\` FOREIGN KEY (\`chat_id\`) REFERENCES \`ai_assistant_chats\`(\`id\`) ON DELETE CASCADE,
            CONSTRAINT \`FK_ai_assistant_messages_user\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE,
            CONSTRAINT \`FK_ai_assistant_messages_edited_from\` FOREIGN KEY (\`edited_from_message_id\`) REFERENCES \`ai_assistant_messages\`(\`id\`) ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
    `);
};

export const ensureCropCalendarSchema = async (dataSource: DataSource) => {
    const userTableRows = await dataSource.query(`
        SELECT COUNT(*) AS total
        FROM information_schema.tables
        WHERE table_schema = DATABASE()
          AND table_name = 'users'
    `) as Array<{ total: number | string }>;

    const userTableExists = Number(userTableRows?.[0]?.total || 0) > 0;
    if (!userTableExists) {
        console.warn('Skipping crop calendar schema bootstrap because users table is missing.');
        return;
    }

    // Create crop_plans table
    await dataSource.query(`
        CREATE TABLE IF NOT EXISTS \`crop_plans\` (
            \`id\` varchar(36) NOT NULL,
            \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
            \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
            \`land_id\` varchar(36) NOT NULL,
            \`variant_id\` varchar(36) NOT NULL,
            \`variant_name\` varchar(100) NOT NULL,
            \`asset_category\` varchar(50) NOT NULL,
            \`icon_url\` varchar(255) NULL,
            \`planned_planting_date\` date NOT NULL,
            \`expected_harvest_date\` date NULL,
            \`cycle_days\` int NULL,
            \`growth_days\` int NULL,
            \`is_perennial\` tinyint NOT NULL DEFAULT 0,
            \`status\` enum('planned','active','completed','cancelled') NOT NULL DEFAULT 'planned',
            \`notes\` text NULL,
            \`completed_at\` datetime(6) NULL,
            \`created_by\` varchar(36) NULL,
            PRIMARY KEY (\`id\`),
            KEY \`IDX_crop_plans_land_status\` (\`land_id\`, \`status\`),
            KEY \`IDX_crop_plans_planting_date\` (\`planned_planting_date\`),
            CONSTRAINT \`FK_crop_plans_land\` FOREIGN KEY (\`land_id\`) REFERENCES \`lands\`(\`id\`) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
    `);
    
    console.log('✅ Crop calendar schema ensured');
};

const columnExists = async (dataSource: DataSource, tableName: string, columnName: string) => {
    const rows = await dataSource.query(`
        SELECT COUNT(*) AS total
        FROM information_schema.columns
        WHERE table_schema = DATABASE()
          AND table_name = ?
          AND column_name = ?
    `, [tableName, columnName]) as Array<{ total: number | string }>;

    return Number(rows?.[0]?.total || 0) > 0;
};

const indexExists = async (dataSource: DataSource, tableName: string, indexName: string) => {
    const rows = await dataSource.query(`
        SELECT COUNT(*) AS total
        FROM information_schema.statistics
        WHERE table_schema = DATABASE()
          AND table_name = ?
          AND index_name = ?
    `, [tableName, indexName]) as Array<{ total: number | string }>;

    return Number(rows?.[0]?.total || 0) > 0;
};

export const ensureWorkerWalletSchema = async (dataSource: DataSource) => {
    const tableRows = await dataSource.query(`
        SELECT COUNT(*) AS total
        FROM information_schema.tables
        WHERE table_schema = DATABASE()
          AND table_name = 'transactions'
    `) as Array<{ total: number | string }>;

    if (Number(tableRows?.[0]?.total || 0) === 0) {
        console.warn('Skipping worker wallet schema bootstrap because transactions table is missing.');
        return;
    }

    await dataSource.query(`ALTER TABLE \`transactions\` MODIFY \`stripe_payment_intent_id\` varchar(255) NULL;`);
    await dataSource.query(`ALTER TABLE \`transactions\` MODIFY \`contract_id\` varchar(255) NULL;`);
    await dataSource.query(`ALTER TABLE \`transactions\` MODIFY \`investor_id\` varchar(255) NULL;`);
    await dataSource.query(`
        ALTER TABLE \`transactions\`
        MODIFY \`type\` enum('salary_upfront','salary_recurring','refund','withdrawal','task_earning','adjustment')
        NOT NULL DEFAULT 'salary_upfront';
    `);

    if (!(await columnExists(dataSource, 'transactions', 'stripe_transfer_id'))) {
        await dataSource.query(`ALTER TABLE \`transactions\` ADD \`stripe_transfer_id\` varchar(255) NULL;`);
    }

    if (!(await indexExists(dataSource, 'transactions', 'IDX_transactions_stripe_transfer_id'))) {
        await dataSource.query(`ALTER TABLE \`transactions\` ADD UNIQUE KEY \`IDX_transactions_stripe_transfer_id\` (\`stripe_transfer_id\`);`);
    }

    console.log('✅ Worker wallet schema ensured');
};

export const ensureProductsSchema = async (dataSource: DataSource) => {
    const tableRows = await dataSource.query(`
        SELECT COUNT(*) AS total
        FROM information_schema.tables
        WHERE table_schema = DATABASE()
          AND table_name = 'products'
    `) as Array<{ total: number | string }>;

    if (Number(tableRows?.[0]?.total || 0) === 0) {
        console.warn('Skipping products schema fix because products table is missing.');
        return;
    }

    // Drop legacy 'name' column if it exists (model uses 'title')
    if (await columnExists(dataSource, 'products', 'name')) {
        await dataSource.query(`ALTER TABLE \`products\` DROP COLUMN \`name\`;`);
        console.log('✅ Dropped legacy "name" column from products table');
    }

    console.log('✅ Products schema ensured');
};

export const ensureAppleSignInSchema = async (dataSource: DataSource) => {
    const tableRows = await dataSource.query(`
        SELECT COUNT(*) AS total
        FROM information_schema.tables
        WHERE table_schema = DATABASE()
          AND table_name = 'users'
    `) as Array<{ total: number | string }>;

    if (Number(tableRows?.[0]?.total || 0) === 0) {
        console.warn('Skipping Apple Sign-In schema bootstrap because users table is missing.');
        return;
    }

    // Add apple_id column if it doesn't exist
    if (!(await columnExists(dataSource, 'users', 'apple_id'))) {
        await dataSource.query(`ALTER TABLE \`users\` ADD \`apple_id\` varchar(255) NULL;`);
        console.log('✅ Added apple_id column to users table');
    }

    // Add unique index for apple_id if it doesn't exist
    if (!(await indexExists(dataSource, 'users', 'IDX_users_apple_id'))) {
        await dataSource.query(`ALTER TABLE \`users\` ADD UNIQUE KEY \`IDX_users_apple_id\` (\`apple_id\`);`);
        console.log('✅ Added unique index on apple_id');
    }

    console.log('✅ Apple Sign-In schema ensured');
};

export const ensureJobRequestSchema = async (dataSource: DataSource) => {
    const userTableRows = await dataSource.query(`
        SELECT COUNT(*) AS total
        FROM information_schema.tables
        WHERE table_schema = DATABASE()
          AND table_name = 'users'
    `) as Array<{ total: number | string }>;

    const userTableExists = Number(userTableRows?.[0]?.total || 0) > 0;
    if (!userTableExists) {
        console.warn('Skipping job request schema bootstrap because users table is missing.');
        return;
    }

    await dataSource.query(`
        CREATE TABLE IF NOT EXISTS \`job_requests\` (
            \`id\` varchar(36) NOT NULL,
            \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
            \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
            \`farmer_id\` varchar(36) NOT NULL,
            \`land_id\` varchar(36) NOT NULL,
            \`title\` varchar(255) NOT NULL,
            \`description\` text NOT NULL,
            \`required_skills\` text NULL,
            \`duration\` varchar(255) NULL,
            \`task_type\` varchar(255) NULL,
            \`status\` enum('open','closed') NOT NULL DEFAULT 'open',
            \`salary\` decimal(10,2) NULL,
            PRIMARY KEY (\`id\`),
            KEY \`IDX_job_requests_farmer\` (\`farmer_id\`),
            KEY \`IDX_job_requests_land\` (\`land_id\`),
            CONSTRAINT \`FK_job_requests_farmer\` FOREIGN KEY (\`farmer_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE,
            CONSTRAINT \`FK_job_requests_land\` FOREIGN KEY (\`land_id\`) REFERENCES \`lands\`(\`id\`) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
    `);

    console.log('✅ Job request schema ensured');
};

export const ensureJobApplicationSchema = async (dataSource: DataSource) => {
    const jobRequestTableRows = await dataSource.query(`
        SELECT COUNT(*) AS total
        FROM information_schema.tables
        WHERE table_schema = DATABASE()
          AND table_name = 'job_requests'
    `) as Array<{ total: number | string }>;

    const jobRequestTableExists = Number(jobRequestTableRows?.[0]?.total || 0) > 0;
    if (!jobRequestTableExists) {
        console.warn('Skipping job application schema bootstrap because job_requests table is missing.');
        return;
    }

    await dataSource.query(`
        CREATE TABLE IF NOT EXISTS \`job_applications\` (
            \`id\` varchar(36) NOT NULL,
            \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
            \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
            \`job_id\` varchar(36) NOT NULL,
            \`worker_id\` varchar(36) NOT NULL,
            \`status\` enum('pending','approved','rejected','cancelled') NOT NULL DEFAULT 'pending',
            \`notes\` text NULL,
            PRIMARY KEY (\`id\`),
            UNIQUE KEY \`IDX_job_applications_worker_job\` (\`job_id\`, \`worker_id\`),
            KEY \`IDX_job_applications_job\` (\`job_id\`),
            KEY \`IDX_job_applications_worker\` (\`worker_id\`),
            CONSTRAINT \`FK_job_applications_job\` FOREIGN KEY (\`job_id\`) REFERENCES \`job_requests\`(\`id\`) ON DELETE CASCADE,
            CONSTRAINT \`FK_job_applications_worker\` FOREIGN KEY (\`worker_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
    `);

    console.log('✅ Job application schema ensured');
};

export const ensureWorkforceSchema = async (dataSource: DataSource) => {
    const tableRows = await dataSource.query(`
        SELECT COUNT(*) AS total
        FROM information_schema.tables
        WHERE table_schema = DATABASE()
          AND table_name = 'land_workers'
    `) as Array<{ total: number | string }>;

    if (Number(tableRows?.[0]?.total || 0) === 0) {
        console.warn('Skipping workforce schema bootstrap because land_workers table is missing.');
        return;
    }

    // Add hiring_source column if it doesn't exist
    if (!(await columnExists(dataSource, 'land_workers', 'hiring_source'))) {
        await dataSource.query(`
            ALTER TABLE \`land_workers\` 
            ADD \`hiring_source\` enum('invitation','job_application','manual') NOT NULL DEFAULT 'manual',
            ADD \`started_at\` datetime NULL,
            ADD \`ended_at\` datetime NULL;
        `);
        console.log('✅ Added hiring_source and period columns to land_workers table');
    }

    // Add unique index if it doesn't exist
    if (!(await indexExists(dataSource, 'land_workers', 'unique_land_worker'))) {
        // Try-catch because TypeORM might have created a similar index with a different name
        try {
            await dataSource.query(`ALTER TABLE \`land_workers\` ADD UNIQUE KEY \`unique_land_worker\` (\`land_id\`, \`worker_id\`);`);
            console.log('✅ Added unique index on land_workers(land_id, worker_id)');
        } catch (e) {
            console.log('ℹ️ Skipping unique index creation (might already exist with different name)');
        }
    }

    console.log('✅ Workforce schema ensured');
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
