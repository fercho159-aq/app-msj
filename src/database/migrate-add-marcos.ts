import { Pool } from 'pg';
import * as bcrypt from 'bcryptjs';

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_hdwNBR08oOcV@ep-plain-king-ahntrqco-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require';

async function runMigration() {
    console.log('🚀 Agregando consultor Marcos Alquicira...');

    const pool = new Pool({
        connectionString: DATABASE_URL,
        ssl: {
            rejectUnauthorized: false,
        },
    });

    try {
        const hashedPassword = await bcrypt.hash('MarcosAlquicira2026.', 10);
        const rfc = 'CONS0006MA';
        const name = 'Marcos Alquicira';
        const role = 'consultor';
        const curp = 'AUQM490425HDFLNR01';
        const avatarUrl = `https://ui-avatars.com/api/?name=Marcos+Alquicira`;

        await pool.query(
            `INSERT INTO users (rfc, name, password, role, avatar_url, curp)
             VALUES ($1, $2, $3, $4, $5, $6)
             ON CONFLICT (rfc) DO UPDATE SET password = $3, name = $2, role = $4, avatar_url = $5, curp = $6`,
            [rfc, name, hashedPassword, role, avatarUrl, curp]
        );

        console.log(`✅ Consultor Marcos Alquicira creado exitosamente.`);
        console.log(`   RFC: ${rfc}`);
        console.log(`   Nombre: ${name}`);
        console.log(`   CURP: ${curp}`);
        console.log(`   Rol: ${role}`);
        console.log(`   Password: MarcosAlquicira2026.`);

    } catch (error) {
        console.error('❌ Error en la migración:', error);
        throw error;
    } finally {
        await pool.end();
    }
}

runMigration().catch(console.error);
