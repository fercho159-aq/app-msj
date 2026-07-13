import { query } from './config';

async function runMigration() {
    console.log('🚀 Agregando columna hidden_from_chats a users...');

    await query(`
        ALTER TABLE users ADD COLUMN IF NOT EXISTS hidden_from_chats BOOLEAN NOT NULL DEFAULT FALSE;
    `);

    await query(`
        CREATE INDEX IF NOT EXISTS idx_users_hidden_from_chats ON users(hidden_from_chats) WHERE hidden_from_chats = TRUE;
    `);

    console.log('✅ Migración completada: hidden_from_chats agregado a users');
    process.exit(0);
}

runMigration().catch((e) => {
    console.error('❌ Error en la migración:', e);
    process.exit(1);
});
