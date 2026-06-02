import { Pool } from 'pg';

const DATABASE_URL = process.env.DATABASE_URL!;

async function migrateNotifications() {
    console.log('🚀 Ejecutando migración de notificaciones push...');

    const pool = new Pool({
        connectionString: DATABASE_URL,
        ssl: {
            rejectUnauthorized: false,
        },
    });

    try {
        // Agregar columna push_token a la tabla users
        await pool.query(`
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS push_token TEXT;
        `);

        console.log('✅ Columna push_token agregada a la tabla users');

        // Crear índice para búsqueda rápida por push_token
        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_users_push_token 
            ON users(push_token) 
            WHERE push_token IS NOT NULL;
        `);

        console.log('✅ Índice para push_token creado');

        // Verificar la estructura de la tabla
        const result = await pool.query(`
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'users'
            ORDER BY ordinal_position;
        `);

        console.log('\n📋 Estructura actual de la tabla users:');
        result.rows.forEach((row: any) => {
            console.log(`   - ${row.column_name}: ${row.data_type} (${row.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
        });

    } catch (error) {
        console.error('❌ Error en migración:', error);
        throw error;
    } finally {
        await pool.end();
        console.log('\n🔌 Migración completada.');
    }
}

migrateNotifications().catch(console.error);
