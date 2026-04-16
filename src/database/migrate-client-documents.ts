import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_hdwNBR08oOcV@ep-plain-king-ahntrqco-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require';

const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });

async function migrate() {
    try {
        const client = await pool.connect();
        try {
            console.log('Creating client_documents table...');

            await client.query(`
                CREATE TABLE IF NOT EXISTS client_documents (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    client_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    file_url TEXT NOT NULL,
                    file_name VARCHAR(255) NOT NULL,
                    file_type VARCHAR(100),
                    file_size BIGINT,
                    source VARCHAR(10) NOT NULL DEFAULT 'upload'
                        CHECK (source IN ('upload', 'message')),
                    message_id UUID,
                    uploaded_by UUID NOT NULL REFERENCES users(id),
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                );
            `);

            await client.query(`
                CREATE INDEX IF NOT EXISTS idx_client_documents_client_id ON client_documents(client_id);
            `);

            console.log('✅ client_documents ready');
        } finally {
            client.release();
        }
    } catch (e) {
        console.error('Migration error:', e);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

migrate();
