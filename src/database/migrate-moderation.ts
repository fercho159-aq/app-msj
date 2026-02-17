import { query } from './config';

async function migrateModeration() {
    console.log('🔄 Iniciando migración de moderación...');

    try {
        // Tabla de usuarios bloqueados
        await query(`
            CREATE TABLE IF NOT EXISTS blocked_users (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                blocker_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                blocked_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                reason TEXT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                UNIQUE(blocker_id, blocked_id)
            )
        `);
        console.log('✅ Tabla blocked_users creada');

        // Índices para blocked_users
        await query(`CREATE INDEX IF NOT EXISTS idx_blocked_users_blocker ON blocked_users(blocker_id)`);
        await query(`CREATE INDEX IF NOT EXISTS idx_blocked_users_blocked ON blocked_users(blocked_id)`);

        // Tabla de reportes de contenido
        await query(`
            CREATE TABLE IF NOT EXISTS content_reports (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                reported_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
                chat_id UUID REFERENCES chats(id) ON DELETE SET NULL,
                reason VARCHAR(50) NOT NULL CHECK (reason IN ('spam', 'harassment', 'inappropriate', 'violence', 'other')),
                description TEXT,
                status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
                admin_notes TEXT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                resolved_at TIMESTAMP WITH TIME ZONE
            )
        `);
        console.log('✅ Tabla content_reports creada');

        // Índices para content_reports
        await query(`CREATE INDEX IF NOT EXISTS idx_reports_status ON content_reports(status)`);
        await query(`CREATE INDEX IF NOT EXISTS idx_reports_reported ON content_reports(reported_user_id)`);
        await query(`CREATE INDEX IF NOT EXISTS idx_reports_created ON content_reports(created_at DESC)`);

        console.log('✅ Migración de moderación completada exitosamente');
    } catch (error) {
        console.error('❌ Error en migración de moderación:', error);
        throw error;
    }
}

migrateModeration()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
