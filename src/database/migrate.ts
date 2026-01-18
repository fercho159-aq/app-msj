import { Pool } from 'pg';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_hdwNBR08oOcV@ep-plain-king-ahntrqco-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require';

async function runMigration() {
    console.log('🚀 Conectando a la base de datos...');

    const pool = new Pool({
        connectionString: DATABASE_URL,
        ssl: {
            rejectUnauthorized: false,
        },
    });

    try {
        // Leer el archivo de esquema
        const schemaPath = join(__dirname, '../../database/schema.sql');
        const schema = readFileSync(schemaPath, 'utf-8');

        console.log('📝 Ejecutando migraciones...');

        // Ejecutar el schema
        await pool.query(schema);

        console.log('✅ Migraciones ejecutadas exitosamente!');

        // Verificar tablas creadas
        const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

        console.log('\n📋 Tablas creadas:');
        result.rows.forEach((row: any) => {
            console.log(`   - ${row.table_name}`);
        });

        // Contar usuarios
        const usersCount = await pool.query('SELECT COUNT(*) as count FROM users');
        console.log(`\n👥 Usuarios en la base de datos: ${usersCount.rows[0].count}`);

    } catch (error) {
        console.error('❌ Error al ejecutar migraciones:', error);
        throw error;
    } finally {
        await pool.end();
        console.log('\n🔌 Conexión cerrada.');
    }
}

runMigration().catch(console.error);
