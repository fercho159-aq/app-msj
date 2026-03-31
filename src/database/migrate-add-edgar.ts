import { Pool } from 'pg';
import * as bcrypt from 'bcryptjs';

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_hdwNBR08oOcV@ep-plain-king-ahntrqco-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require';

async function runMigration() {
    console.log('🚀 Agregando asesor Edgar Hernández...');

    const pool = new Pool({
        connectionString: DATABASE_URL,
        ssl: {
            rejectUnauthorized: false,
        },
    });

    try {
        const hashedPassword = await bcrypt.hash('EdgarHernandez2026.', 10);
        const rfc = 'ADV0001EH';
        const name = 'Edgar Hernández';
        const role = 'asesor';
        const avatarUrl = `https://ui-avatars.com/api/?name=Edgar+Hernandez`;

        await pool.query(
            `INSERT INTO users (rfc, name, password, role, avatar_url)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (rfc) DO UPDATE SET password = $3, name = $2, role = $4, avatar_url = $5`,
            [rfc, name, hashedPassword, role, avatarUrl]
        );

        console.log(`✅ Asesor Edgar Hernández creado exitosamente.`);
        console.log(`   RFC: ${rfc}`);
        console.log(`   Nombre: ${name}`);
        console.log(`   Rol: ${role}`);
        console.log(`   Contraseña: EdgarHernandez2026.`);

    } catch (error) {
        console.error('❌ Error en la migración:', error);
        throw error;
    } finally {
        await pool.end();
    }
}

runMigration().catch(console.error);
