import { Pool } from 'pg';
import * as bcrypt from 'bcryptjs';

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_hdwNBR08oOcV@ep-plain-king-ahntrqco-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require';

interface Consultor {
    rfc: string;
    name: string;
    password: string;
}

const consultores: Consultor[] = [
    { rfc: 'CONS0007JM', name: 'Jhonathan Muñiz', password: 'JhonathanMuniz2026.' },
    { rfc: 'CONS0008RA', name: 'Rodrigo Allende', password: 'RodrigoAllende2026.' },
    { rfc: 'CONS0009JA', name: 'José Atenco', password: 'JoseAtenco2026.' },
];

async function runMigration() {
    console.log('🚀 Agregando consultores...');

    const pool = new Pool({
        connectionString: DATABASE_URL,
        ssl: {
            rejectUnauthorized: false,
        },
    });

    try {
        const role = 'consultor';

        for (const consultor of consultores) {
            const hashedPassword = await bcrypt.hash(consultor.password, 10);
            const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(consultor.name)}`;

            await pool.query(
                `INSERT INTO users (rfc, name, password, role, avatar_url)
                 VALUES ($1, $2, $3, $4, $5)
                 ON CONFLICT (rfc) DO UPDATE SET password = $3, name = $2, role = $4, avatar_url = $5`,
                [consultor.rfc, consultor.name, hashedPassword, role, avatarUrl]
            );

            console.log(`✅ Consultor creado: ${consultor.name}`);
            console.log(`   RFC: ${consultor.rfc}`);
            console.log(`   Contraseña: ${consultor.password}`);
        }

        console.log('\n🎉 Todos los consultores fueron creados exitosamente.');

    } catch (error) {
        console.error('❌ Error en la migración:', error);
        throw error;
    } finally {
        await pool.end();
    }
}

runMigration().catch(console.error);
