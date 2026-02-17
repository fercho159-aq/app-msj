import { query } from './config';

async function migrateCallsHistory() {
    console.log('Iniciando migración de historial de llamadas...');

    try {
        await query(`
            CREATE TABLE IF NOT EXISTS call_history (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                caller_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                callee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                call_type VARCHAR(10) NOT NULL,
                status VARCHAR(20) NOT NULL,
                duration_seconds INTEGER DEFAULT 0,
                started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                ended_at TIMESTAMP WITH TIME ZONE
            )
        `);
        console.log('Tabla call_history creada');

        await query(`CREATE INDEX IF NOT EXISTS idx_call_history_caller ON call_history(caller_id)`);
        await query(`CREATE INDEX IF NOT EXISTS idx_call_history_callee ON call_history(callee_id)`);
        await query(`CREATE INDEX IF NOT EXISTS idx_call_history_started ON call_history(started_at DESC)`);

        console.log('Migración de historial de llamadas completada');
    } catch (error) {
        console.error('Error en migración de historial de llamadas:', error);
        throw error;
    }
}

migrateCallsHistory()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
