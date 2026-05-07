import 'dotenv/config';
import mysql from 'mysql2/promise';

async function migrate() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'farmy'
    });

    try {
        console.log('Adding hiring_source column...');
        await connection.query(`
            ALTER TABLE land_workers 
            ADD COLUMN IF NOT EXISTS hiring_source ENUM('invitation', 'job_application', 'manual') DEFAULT 'manual',
            ADD COLUMN IF NOT EXISTS started_at DATETIME NULL,
            ADD COLUMN IF NOT EXISTS ended_at DATETIME NULL
        `);
        console.log('Adding unique constraint on (land_id, worker_id)...');
        // We need to check if it exists first or use a try-catch
        try {
            await connection.query(`
                ALTER TABLE land_workers 
                ADD UNIQUE INDEX IF NOT EXISTS unique_land_worker (land_id, worker_id)
            `);
        } catch (e: any) {
            console.log('Unique index might already exist or failed:', e.message);
        }
        
        console.log('Migration completed successfully.');
    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        await connection.end();
    }
}

migrate();
