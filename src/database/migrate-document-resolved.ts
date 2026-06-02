import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL!;

const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });

async function migrate() {
    try {
        const client = await pool.connect();
        try {
            console.log('Adding resolved fields to generated_documents...');

            await client.query(`
                ALTER TABLE generated_documents
                ADD COLUMN IF NOT EXISTS resolved BOOLEAN NOT NULL DEFAULT false,
                ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMP WITH TIME ZONE,
                ADD COLUMN IF NOT EXISTS resolved_by UUID REFERENCES users(id);
            `);
            console.log('Added resolved columns');

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
