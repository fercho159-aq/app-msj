import { Pool } from 'pg';

const DATABASE_URL = process.env.DATABASE_URL!;

async function checkDatabase() {
    const pool = new Pool({
        connectionString: DATABASE_URL,
        ssl: { rejectUnauthorized: false },
    });

    try {
        console.log('📊 Estado de la base de datos:\n');

        // Usuarios
        const users = await pool.query('SELECT id, rfc, name, status FROM users ORDER BY name');
        console.log('👥 Usuarios registrados:');
        users.rows.forEach((user: any) => {
            console.log(`   - ${user.name} (${user.rfc}) - ${user.status}`);
        });

        // Chats
        const chats = await pool.query('SELECT COUNT(*) as count FROM chats');
        console.log(`\n💬 Total de chats: ${chats.rows[0].count}`);

        // Mensajes
        const messages = await pool.query('SELECT COUNT(*) as count FROM messages');
        console.log(`📨 Total de mensajes: ${messages.rows[0].count}`);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await pool.end();
    }
}

checkDatabase();
