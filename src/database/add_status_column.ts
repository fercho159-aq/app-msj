
import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL!;

const pool = new Pool({
    connectionString,
    ssl: {
        rejectUnauthorized: false,
    },
});

async function migrate() {
    try {
        console.log('Adding status column to users table...');

        const client = await pool.connect();
        try {
            await client.query(`
                ALTER TABLE users 
                ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'offline'
            `);
        } finally {
            client.release();
        }

        console.log('✅ Status column added successfully');

        await pool.end();
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

migrate();
