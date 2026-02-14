import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

async function applyUpdate() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        port: Number(process.env.DB_PORT) || 3306,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'farmy',
    });

    try {
        const sql = fs.readFileSync('docs/update_cow_jersey.sql', 'utf8');
        // Clean SQL comments and split if multiple statements (though here it is one)
        const cleanSql = sql.replace(/--.*$/gm, '').trim();

        await connection.execute(cleanSql);
        console.log('✅ Successfully updated Cow Jersey sprites in database.');

        const [rows] = await connection.execute(
            "SELECT variant_code, sprites FROM animal_variants WHERE variant_code = 'cow_dairy_jersey'"
        );
        console.log('Verification:', JSON.stringify(rows, null, 2));
    } catch (error) {
        console.error('❌ Error applying DB update:', error);
    } finally {
        await connection.end();
    }
}

applyUpdate();
