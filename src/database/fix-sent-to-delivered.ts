import { Pool } from 'pg';

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_hdwNBR08oOcV@ep-plain-king-ahntrqco-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require';

async function run() {
    const pool = new Pool({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });
    const result = await pool.query("UPDATE messages SET status = 'delivered' WHERE status = 'sent'");
    console.log(`✅ ${result.rowCount} mensajes actualizados de 'sent' a 'delivered'`);
    await pool.end();
}

run().catch(console.error);
