import { Pool } from 'pg';

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_hdwNBR08oOcV@ep-plain-king-ahntrqco-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require';

async function runMigration() {
    console.log('🚀 Creando tabla checkid_cache...');

    const pool = new Pool({
        connectionString: DATABASE_URL,
        ssl: { rejectUnauthorized: false },
    });

    const client = await pool.connect();

    try {
        await client.query(`
            CREATE TABLE IF NOT EXISTS checkid_cache (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                rfc VARCHAR(13) NOT NULL UNIQUE,
                tipo_persona VARCHAR(10) NOT NULL,
                razon_social VARCHAR(500),
                response_data JSONB NOT NULL,
                entidad_federativa VARCHAR(100),
                consulted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
        `);
        console.log('✅ Tabla checkid_cache creada.');

        // Index para buscar por RFC rapido
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_checkid_cache_rfc ON checkid_cache (rfc);
        `);
        console.log('✅ Indice en rfc creado.');

        // Index para saber cuales estan viejos
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_checkid_cache_consulted_at ON checkid_cache (consulted_at);
        `);
        console.log('✅ Indice en consulted_at creado.');

        // Trigger para updated_at
        await client.query(`
            CREATE OR REPLACE FUNCTION update_checkid_cache_updated_at()
            RETURNS TRIGGER AS $$
            BEGIN
                NEW.updated_at = NOW();
                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;
        `);

        await client.query(`
            DROP TRIGGER IF EXISTS trigger_checkid_cache_updated_at ON checkid_cache;
            CREATE TRIGGER trigger_checkid_cache_updated_at
                BEFORE UPDATE ON checkid_cache
                FOR EACH ROW
                EXECUTE FUNCTION update_checkid_cache_updated_at();
        `);
        console.log('✅ Trigger updated_at creado.');

        // Verificar
        const result = await client.query(`
            SELECT column_name, data_type FROM information_schema.columns
            WHERE table_name = 'checkid_cache' ORDER BY ordinal_position;
        `);
        console.log('📋 Columnas:', result.rows.map(r => `${r.column_name} (${r.data_type})`).join(', '));

        console.log('✨ Migracion completada exitosamente.');
    } catch (error) {
        console.error('❌ Error en la migracion:', error);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

runMigration().catch(console.error);
