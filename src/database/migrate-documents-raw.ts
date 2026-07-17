import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL!;

const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });

/**
 * Permite documentos subidos directamente (sin plantilla ni cliente):
 * hace template_id y client_id opcionales en generated_documents.
 */
async function migrate() {
    try {
        const client = await pool.connect();
        try {
            console.log('Haciendo template_id y client_id opcionales en generated_documents...');
            await client.query(`ALTER TABLE generated_documents ALTER COLUMN template_id DROP NOT NULL;`);
            await client.query(`ALTER TABLE generated_documents ALTER COLUMN client_id DROP NOT NULL;`);
            console.log('✅ template_id y client_id ahora son opcionales');
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('❌ Error en migracion:', error);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

migrate();
