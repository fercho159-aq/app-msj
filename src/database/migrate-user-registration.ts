// Migración unificada para el nuevo flujo de registro de usuarios
// Ejecuta todas las migraciones necesarias para soportar:
// - Registro con RFC, teléfono, contraseña
// - Datos fiscales (razón social, tipo de persona)
// - Aceptación de términos y condiciones

import { Pool } from 'pg';

const connectionString = 'postgresql://neondb_owner:npg_hdwNBR08oOcV@ep-plain-king-ahntrqco-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require';

const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });

async function migrate() {
    try {
        const client = await pool.connect();
        try {
            console.log('Starting user registration migration...');

            // 1. Add password column
            console.log('1. Adding password column...');
            await client.query(`
                ALTER TABLE users
                ADD COLUMN IF NOT EXISTS password VARCHAR(255)
            `);

            // 2. Add phone and role columns
            console.log('2. Adding phone and role columns...');
            await client.query(`
                ALTER TABLE users
                ADD COLUMN IF NOT EXISTS phone VARCHAR(20),
                ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'user'
            `);

            // 3. Add fiscal fields
            console.log('3. Adding fiscal fields...');
            await client.query(`
                ALTER TABLE users
                ADD COLUMN IF NOT EXISTS razon_social VARCHAR(255),
                ADD COLUMN IF NOT EXISTS tipo_persona VARCHAR(20),
                ADD COLUMN IF NOT EXISTS terms_accepted BOOLEAN DEFAULT FALSE,
                ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMP WITH TIME ZONE
            `);

            // 4. Create index for phone lookups
            console.log('4. Creating indexes...');
            await client.query(`
                CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone)
            `);

            console.log('✅ All migrations completed successfully!');
            console.log('\nTable structure now includes:');
            console.log('  - password: VARCHAR(255)');
            console.log('  - phone: VARCHAR(20)');
            console.log('  - role: VARCHAR(20) DEFAULT "user"');
            console.log('  - razon_social: VARCHAR(255)');
            console.log('  - tipo_persona: VARCHAR(20)');
            console.log('  - terms_accepted: BOOLEAN DEFAULT FALSE');
            console.log('  - terms_accepted_at: TIMESTAMP WITH TIME ZONE');

        } finally {
            client.release();
        }
    } catch (e) {
        console.error('❌ Migration error:', e);
        process.exit(1);
    } finally {
        await pool.end();
        process.exit(0);
    }
}

migrate();
