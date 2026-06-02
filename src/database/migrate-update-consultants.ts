import { Pool } from 'pg';

const DATABASE_URL = process.env.DATABASE_URL!;

async function runMigration() {
    console.log('🚀 Iniciando actualización para consultores...');

    const pool = new Pool({
        connectionString: DATABASE_URL,
        ssl: {
            rejectUnauthorized: false,
        },
    });

    try {
        // 1. Eliminar columna status
        console.log('📝 Eliminando columna status (si existe)...');
        // We use DROP COLUMN IF EXISTS to avoid errors
        await pool.query(`ALTER TABLE users DROP COLUMN IF EXISTS status;`);

        // 2. Actualizar/Crear consultores específicos
        console.log('👥 Actualizando credenciales de consultores...');

        const consultants = [
            { rfc: 'CONS0001JOR', name: 'Jorge', password: 'jorge_password' },
            { rfc: 'CONS0002JOS', name: 'Jose', password: 'jose_password' },
            { rfc: 'CONS0003TON', name: 'Toño', password: 'tono_password' }
        ];

        for (const c of consultants) {
            const avatarUrl = `https://ui-avatars.com/api/?name=${c.name}`;
            await pool.query(
                `INSERT INTO users (rfc, name, password, avatar_url)
                 VALUES ($1, $2, $3, $4)
                 ON CONFLICT (rfc) DO UPDATE SET password = $3, name = $2, avatar_url = $4`,
                [c.rfc, c.name, c.password, avatarUrl]
            );
            console.log(`   ✅ Consultor ${c.name} (RFC: ${c.rfc}) actualizado.`);
        }

        console.log('✨ Actualización completada exitosamente.');

    } catch (error) {
        console.error('❌ Error en la migración:', error);
        throw error;
    } finally {
        await pool.end();
    }
}

runMigration().catch(console.error);
