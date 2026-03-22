import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_hdwNBR08oOcV@ep-plain-king-ahntrqco-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require';

const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });

async function migrate() {
    try {
        const client = await pool.connect();
        try {
            console.log('Adding verification fields to generated_documents...');

            await client.query(`
                ALTER TABLE generated_documents
                ADD COLUMN IF NOT EXISTS verification_code VARCHAR(100),
                ADD COLUMN IF NOT EXISTS firmante_nombre VARCHAR(255),
                ADD COLUMN IF NOT EXISTS firmante_cargo VARCHAR(255),
                ADD COLUMN IF NOT EXISTS firma_electronica TEXT,
                ADD COLUMN IF NOT EXISTS cadena_original TEXT,
                ADD COLUMN IF NOT EXISTS sello_digital TEXT,
                ADD COLUMN IF NOT EXISTS cert_inicio DATE,
                ADD COLUMN IF NOT EXISTS cert_fin DATE;
            `);
            console.log('✅ Added verification columns');

            await client.query(`
                CREATE UNIQUE INDEX IF NOT EXISTS idx_generated_documents_verification
                ON generated_documents(verification_code);
            `);
            console.log('✅ Created unique index on verification_code');

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
