
import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL!;

const pool = new Pool({
    connectionString,
    ssl: {
        rejectUnauthorized: false, // For Neon DB
    },
});

async function migrate() {
    try {
        console.log('Checking/Adding password column to users table...');

        const client = await pool.connect();
        try {
            await client.query(`
                ALTER TABLE users 
                ADD COLUMN IF NOT EXISTS password VARCHAR(255)
            `);
        } finally {
            client.release();
        }

        console.log('✅ Password column checked/added successfully');

        await pool.end();
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

migrate();
