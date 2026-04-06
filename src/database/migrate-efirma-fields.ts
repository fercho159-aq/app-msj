import { query } from './config';

async function migrate() {
    console.log('🔄 Migrando: agregar campos de e.firma...');

    await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS efirma_delivery_date DATE DEFAULT NULL;`);
    await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS efirma_link TEXT DEFAULT NULL;`);
    await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS efirma_file_url TEXT DEFAULT NULL;`);

    console.log('✅ Migración completada: campos de e.firma agregados a users');
    process.exit(0);
}

migrate().catch(err => {
    console.error('❌ Error en migración:', err);
    process.exit(1);
});
