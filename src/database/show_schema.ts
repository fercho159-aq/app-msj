
import { Pool } from 'pg';

const connectionString = 'postgresql://neondb_owner:npg_hdwNBR08oOcV@ep-plain-king-ahntrqco-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require';

const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });

async function showSchema() {
    try {
        const client = await pool.connect();
        try {
            const res = await client.query("SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'users'");
            console.table(res.rows);
        } finally {
            client.release();
        }
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}
showSchema();
