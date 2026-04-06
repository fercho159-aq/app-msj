import { query } from './config';

async function migrate() {
    console.log('🔄 Migrando: agregar soft delete para clientes...');

    await query(`
        ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;
    `);

    await query(`
        CREATE INDEX IF NOT EXISTS idx_users_deleted_at ON users(deleted_at) WHERE deleted_at IS NOT NULL;
    `);

    console.log('✅ Migración completada: deleted_at agregado a users');
    process.exit(0);
}

migrate().catch(err => {
    console.error('❌ Error en migración:', err);
    process.exit(1);
});
