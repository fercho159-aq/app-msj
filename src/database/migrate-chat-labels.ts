import { Pool } from 'pg';

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_hdwNBR08oOcV@ep-plain-king-ahntrqco-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require';

/**
 * Script de migración para agregar etiquetas a los chats.
 *
 * Las etiquetas permiten organizar y filtrar conversaciones.
 * Etiquetas predefinidas: urgente, importante, pendiente, resuelto
 */
async function runMigration() {
    console.log('🚀 Iniciando migración de etiquetas de chats...');

    const pool = new Pool({
        connectionString: DATABASE_URL,
        ssl: {
            rejectUnauthorized: false,
        },
    });

    try {
        // 1. Crear tabla de etiquetas disponibles
        console.log('\n📋 Creando tabla de etiquetas...');
        await pool.query(`
            CREATE TABLE IF NOT EXISTS chat_labels (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                name VARCHAR(50) NOT NULL UNIQUE,
                color VARCHAR(7) NOT NULL DEFAULT '#6B7AED',
                icon VARCHAR(50) DEFAULT 'pricetag',
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            )
        `);
        console.log('   ✅ Tabla chat_labels creada');

        // 2. Crear tabla de relación chat-etiqueta
        console.log('\n🔗 Creando tabla de relación chat-etiqueta...');
        await pool.query(`
            CREATE TABLE IF NOT EXISTS chat_label_assignments (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
                label_id UUID NOT NULL REFERENCES chat_labels(id) ON DELETE CASCADE,
                assigned_by UUID REFERENCES users(id) ON DELETE SET NULL,
                assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                UNIQUE(chat_id, label_id)
            )
        `);
        console.log('   ✅ Tabla chat_label_assignments creada');

        // 3. Crear índices
        console.log('\n📊 Creando índices...');
        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_chat_label_assignments_chat ON chat_label_assignments(chat_id);
            CREATE INDEX IF NOT EXISTS idx_chat_label_assignments_label ON chat_label_assignments(label_id);
        `);
        console.log('   ✅ Índices creados');

        // 4. Insertar etiquetas predefinidas
        console.log('\n🏷️ Insertando etiquetas predefinidas...');
        const defaultLabels = [
            { name: 'Urgente', color: '#EF4444', icon: 'alert-circle' },
            { name: 'Importante', color: '#F59E0B', icon: 'star' },
            { name: 'Pendiente', color: '#3B82F6', icon: 'time' },
            { name: 'Resuelto', color: '#10B981', icon: 'checkmark-circle' },
            { name: 'Seguimiento', color: '#8B5CF6', icon: 'eye' },
        ];

        for (const label of defaultLabels) {
            await pool.query(`
                INSERT INTO chat_labels (name, color, icon)
                VALUES ($1, $2, $3)
                ON CONFLICT (name) DO NOTHING
            `, [label.name, label.color, label.icon]);
            console.log(`   ✅ Etiqueta "${label.name}" creada`);
        }

        // 5. Mostrar resumen
        console.log('\n📊 Etiquetas disponibles:');
        const labels = await pool.query('SELECT * FROM chat_labels ORDER BY name');
        console.table(labels.rows);

        console.log('\n✨ Migración de etiquetas completada exitosamente.');

    } catch (error) {
        console.error('❌ Error en la migración:', error);
        throw error;
    } finally {
        await pool.end();
    }
}

runMigration().catch(console.error);
