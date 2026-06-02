import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL!;

const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });

async function migrate() {
    try {
        const client = await pool.connect();
        try {
            console.log('Adding fiscal and registration fields to users table...');
            await client.query(`
                ALTER TABLE users
                ADD COLUMN IF NOT EXISTS razon_social VARCHAR(255),
                ADD COLUMN IF NOT EXISTS tipo_persona VARCHAR(20),
                ADD COLUMN IF NOT EXISTS terms_accepted BOOLEAN DEFAULT FALSE,
                ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMP WITH TIME ZONE;
            `);
            console.log('✅ Fiscal fields added successfully.');
        } finally {
            client.release();
        }
    } catch (e) {
        console.error('Migration error:', e);
        process.exit(1);
    } finally {
        await pool.end();
        process.exit(0);
    }
}

migrate();
