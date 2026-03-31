
import { Pool } from 'pg';

const connectionString = 'postgresql://neondb_owner:npg_hdwNBR08oOcV@ep-plain-king-ahntrqco-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require';

const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });

async function migrate() {
    try {
        const client = await pool.connect();
        try {
            console.log('Adding phone and role columns...');
            await client.query(`
                ALTER TABLE users 
                ADD COLUMN IF NOT EXISTS phone VARCHAR(20),
                ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'user';
            `);
            console.log('✅ Columns added.');
        } finally {
            client.release();
        }
    } catch (e) {
        console.error(e);
        process.exit(1);
    } finally {
        await pool.end();
        process.exit(0);
    }
}
migrate();
