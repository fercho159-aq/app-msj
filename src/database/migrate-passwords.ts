import { Pool } from 'pg';

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_hdwNBR08oOcV@ep-plain-king-ahntrqco-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require';

async function runMigration() {
    console.log('🚀 Iniciando migración de contraseñas...');

    const pool = new Pool({
        connectionString: DATABASE_URL,
        ssl: {
            rejectUnauthorized: false,
        },
    });

    try {
        // 1. Agregar columna password
        console.log('📝 Agregando columna password...');
        await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS password TEXT;`);

        // 2. Crear consultores
        console.log('👥 Creando consultores...');
        const consultants = [
            { rfc: 'CONS900101JOR', name: 'Jorge', password: 'password123' },
            { rfc: 'CONS900101JOS', name: 'Jose', password: 'password123' },
            { rfc: 'CONS900101TON', name: 'Toño', password: 'password123' }
        ];

        for (const c of consultants) {
            const avatarUrl = `https://ui-avatars.com/api/?name=${c.name}`;
            await pool.query(
                `INSERT INTO users (rfc, name, password, status, avatar_url)
                 VALUES ($1, $2, $3, 'offline', $4)
                 ON CONFLICT (rfc) DO UPDATE SET password = $3, name = $2`,
                [c.rfc, c.name, c.password, avatarUrl]
            );
            console.log(`   ✅ Consultor ${c.name} actualizado/creado.`);
        }

        console.log('✨ Migración completada exitosamente.');

    } catch (error) {
        console.error('❌ Error en la migración:', error);
        throw error;
    } finally {
        await pool.end();
    }
}

runMigration().catch(console.error);
