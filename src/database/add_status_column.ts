
import { Pool } from 'pg';

const connectionString = 'postgresql://neondb_owner:npg_hdwNBR08oOcV@ep-plain-king-ahntrqco-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require';

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
