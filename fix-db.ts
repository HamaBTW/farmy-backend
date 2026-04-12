import mysql from 'mysql2/promise';

async function run() {
    const conn = await mysql.createConnection({
        host: 'localhost',
        port: 3306,
        user: 'root',
        password: '',
        database: 'farmy'
    });
    const [rows]: any[] = await conn.query(`
        SELECT CONSTRAINT_NAME 
        FROM information_schema.KEY_COLUMN_USAGE 
        WHERE TABLE_NAME = 'user_subscriptions' AND COLUMN_NAME = 'user_id' AND CONSTRAINT_NAME != 'PRIMARY';
    `);
    
    for (const row of rows) {
        if (row.CONSTRAINT_NAME) {
            console.log('Dropping FK', row.CONSTRAINT_NAME);
            await conn.query(`ALTER TABLE user_subscriptions DROP FOREIGN KEY \`${row.CONSTRAINT_NAME}\``);
        }
    }
    await conn.query(`ALTER TABLE user_subscriptions DROP INDEX \`IDX_user_subscriptions_user_id\``).catch(e => console.log('Index drop failed', e.message));
    console.log('Done');
    process.exit(0);
}
run();
