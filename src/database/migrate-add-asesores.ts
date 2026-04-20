import { Pool } from 'pg';
import * as bcrypt from 'bcryptjs';

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_hdwNBR08oOcV@ep-plain-king-ahntrqco-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require';

interface Asesor {
    rfc: string;
    name: string;
    password: string;
}

const asesores: Asesor[] = [
    { rfc: 'ADV0002MA', name: 'Miguel Alvarado', password: 'MiguelAlvarado2026.' },
    { rfc: 'ADV0003SL', name: 'Sofía Landa', password: 'SofiaLanda2026.' },
    { rfc: 'ADV0004FB', name: 'Francisco Baños', password: 'FranciscoBanos2026.' },
    { rfc: 'ADV0005SC', name: 'Sergio Celis', password: 'SergioCelis2026.' },
];

async function runMigration() {
    console.log('🚀 Agregando asesores...');

    const pool = new Pool({
        connectionString: DATABASE_URL,
        ssl: {
            rejectUnauthorized: false,
        },
    });

    try {
        const role = 'asesor';

        for (const asesor of asesores) {
            const hashedPassword = await bcrypt.hash(asesor.password, 10);
            const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(asesor.name)}`;

            await pool.query(
                `INSERT INTO users (rfc, name, password, role, avatar_url)
                 VALUES ($1, $2, $3, $4, $5)
                 ON CONFLICT (rfc) DO UPDATE SET password = $3, name = $2, role = $4, avatar_url = $5`,
                [asesor.rfc, asesor.name, hashedPassword, role, avatarUrl]
            );

            console.log(`✅ Asesor creado: ${asesor.name}`);
            console.log(`   RFC: ${asesor.rfc}`);
            console.log(`   Contraseña: ${asesor.password}`);
        }

        console.log('\n🎉 Todos los asesores fueron creados exitosamente.');

    } catch (error) {
        console.error('❌ Error en la migración:', error);
        throw error;
    } finally {
        await pool.end();
    }
}

runMigration().catch(console.error);
