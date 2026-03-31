import { Pool } from 'pg';

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_hdwNBR08oOcV@ep-plain-king-ahntrqco-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require';

async function runQuery() {
    const pool = new Pool({
        connectionString: DATABASE_URL,
        ssl: { rejectUnauthorized: false },
    });

    try {
        // Query requested by user, modified to include password and remove status
        const res = await pool.query(`
            select
              "id",
              "rfc",
              "name",
              "avatar_url",
              -- "status", -- removed
              "password", -- added
              "last_seen",
              "created_at",
              "updated_at",
              "push_token"
            from
              "users"
            order by
              "users"."id"
            limit
              50
        `);
        console.log('Query result:', res.rows.slice(0, 5)); // Show first 5
        console.log('Total rows:', res.rowCount);
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await pool.end();
    }
}

runQuery();
