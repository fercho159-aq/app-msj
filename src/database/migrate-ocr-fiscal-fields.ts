import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_hdwNBR08oOcV@ep-plain-king-ahntrqco-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require';

const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });

async function migrate() {
    try {
        const client = await pool.connect();
        try {
            console.log('Adding OCR fiscal fields to users table...');

            // Agregar campos adicionales del OCR
            await client.query(`
                ALTER TABLE users
                ADD COLUMN IF NOT EXISTS curp VARCHAR(18),
                ADD COLUMN IF NOT EXISTS regimen_fiscal VARCHAR(255),
                ADD COLUMN IF NOT EXISTS codigo_postal VARCHAR(5),
                ADD COLUMN IF NOT EXISTS estado VARCHAR(100),
                ADD COLUMN IF NOT EXISTS domicilio TEXT;
            `);

            console.log('✅ OCR fiscal fields added successfully:');
            console.log('   - curp (VARCHAR 18)');
            console.log('   - regimen_fiscal (VARCHAR 255)');
            console.log('   - codigo_postal (VARCHAR 5)');
            console.log('   - estado (VARCHAR 100)');
            console.log('   - domicilio (TEXT)');

            // Verificar columnas existentes
            const result = await client.query(`
                SELECT column_name, data_type, character_maximum_length
                FROM information_schema.columns
                WHERE table_name = 'users'
                ORDER BY ordinal_position;
            `);

            console.log('\n📋 Estructura actual de tabla users:');
            result.rows.forEach((row: any) => {
                const length = row.character_maximum_length ? `(${row.character_maximum_length})` : '';
                console.log(`   - ${row.column_name}: ${row.data_type}${length}`);
            });

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
