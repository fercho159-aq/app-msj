import { Pool } from 'pg';

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_hdwNBR08oOcV@ep-plain-king-ahntrqco-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require';

async function runMigration() {
    console.log('🚀 Agregando columnas para edicion y eliminacion de mensajes...');

    const pool = new Pool({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });
    const client = await pool.connect();

    try {
        // Columna para saber si fue editado y cuando
        await client.query(`ALTER TABLE messages ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ DEFAULT NULL`);
        console.log('✅ Columna edited_at agregada');

        // Columna para soft delete
        await client.query(`ALTER TABLE messages ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL`);
        console.log('✅ Columna deleted_at agregada');

        // Columna para saber quien elimino (consultor puede eliminar mensajes de otros)
        await client.query(`ALTER TABLE messages ADD COLUMN IF NOT EXISTS deleted_by UUID DEFAULT NULL REFERENCES users(id)`);
        console.log('✅ Columna deleted_by agregada');

        console.log('✨ Migracion completada.');
    } catch (error) {
        console.error('❌ Error:', error);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

runMigration().catch(console.error);
