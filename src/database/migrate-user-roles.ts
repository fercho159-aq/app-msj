import { Pool } from 'pg';

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_hdwNBR08oOcV@ep-plain-king-ahntrqco-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require';

/**
 * Script de migración para actualizar los roles de usuarios.
 *
 * Roles disponibles:
 * - 'usuario': Solo puede chatear con consultores
 * - 'asesor': Solo puede chatear con consultores
 * - 'consultor': Puede chatear con todos y crear grupos
 *
 * Lógica de asignación:
 * - RFC que empiece con 'CONS' o sea 'ADMIN000CONS' -> 'consultor'
 * - RFC que empiece con 'ADV' -> 'asesor'
 * - Todos los demás -> 'usuario'
 */
async function runMigration() {
    console.log('🚀 Iniciando migración de roles de usuarios...');

    const pool = new Pool({
        connectionString: DATABASE_URL,
        ssl: {
            rejectUnauthorized: false,
        },
    });

    try {
        // 1. Mostrar estado actual
        console.log('\n📊 Estado actual de roles:');
        const beforeStats = await pool.query(`
            SELECT role, COUNT(*) as count
            FROM users
            GROUP BY role
            ORDER BY role
        `);
        console.table(beforeStats.rows);

        // 2. Actualizar usuarios con RFC que empiece con 'CONS' o sea 'ADMIN000CONS' a 'consultor'
        console.log('\n👨‍💼 Actualizando consultores...');
        const consultorResult = await pool.query(`
            UPDATE users
            SET role = 'consultor'
            WHERE rfc LIKE 'CONS%' OR rfc = 'ADMIN000CONS'
            RETURNING rfc, name
        `);
        console.log(`   ✅ ${consultorResult.rowCount || 0} usuarios actualizados a 'consultor'`);
        if (consultorResult.rowCount && consultorResult.rowCount > 0) {
            consultorResult.rows.forEach(u => console.log(`      - ${u.name} (${u.rfc})`));
        }

        // 3. Actualizar usuarios con RFC que empiece con 'ADV' a 'asesor'
        console.log('\n👨‍🏫 Actualizando asesores...');
        const asesorResult = await pool.query(`
            UPDATE users
            SET role = 'asesor'
            WHERE rfc LIKE 'ADV%'
            RETURNING rfc, name
        `);
        console.log(`   ✅ ${asesorResult.rowCount || 0} usuarios actualizados a 'asesor'`);
        if (asesorResult.rowCount && asesorResult.rowCount > 0) {
            asesorResult.rows.forEach(u => console.log(`      - ${u.name} (${u.rfc})`));
        }

        // 4. Actualizar el resto a 'usuario' (que no sean consultor o asesor)
        console.log('\n👤 Actualizando usuarios regulares...');
        const usuarioResult = await pool.query(`
            UPDATE users
            SET role = 'usuario'
            WHERE role IS NULL
               OR role = 'user'
               OR (role NOT IN ('consultor', 'asesor', 'usuario'))
            RETURNING rfc, name
        `);
        console.log(`   ✅ ${usuarioResult.rowCount} usuarios actualizados a 'usuario'`);

        // 5. Mostrar estado final
        console.log('\n📊 Estado final de roles:');
        const afterStats = await pool.query(`
            SELECT role, COUNT(*) as count
            FROM users
            GROUP BY role
            ORDER BY role
        `);
        console.table(afterStats.rows);

        // 6. Mostrar resumen de permisos
        console.log('\n📋 Resumen de permisos por rol:');
        console.log('   • usuario: Solo puede chatear con consultores');
        console.log('   • asesor: Solo puede chatear con consultores');
        console.log('   • consultor: Puede chatear con todos y crear grupos');

        console.log('\n✨ Migración de roles completada exitosamente.');

    } catch (error) {
        console.error('❌ Error en la migración:', error);
        throw error;
    } finally {
        await pool.end();
    }
}

runMigration().catch(console.error);
