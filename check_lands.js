import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function checkLands() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        port: Number(process.env.DB_PORT) || 3306,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'farmy',
    });

    try {
        const [rows] = await connection.execute(
            "SELECT id, name, width_m, height_m FROM lands"
        );
        console.log('Lands:', JSON.stringify(rows, null, 2));
    } catch (error) {
        console.error('Error querying DB:', error);
    } finally {
        await connection.end();
    }
}

checkLands();
