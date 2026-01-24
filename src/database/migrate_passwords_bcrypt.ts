
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';

const connectionString = 'postgresql://neondb_owner:npg_hdwNBR08oOcV@ep-plain-king-ahntrqco-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require';

const pool = new Pool({
    connectionString,
    ssl: {
        rejectUnauthorized: false, // For Neon DB
    },
});

async function migrate_passwords() {
    try {
        console.log('Starting migration to encrypt existing plain text passwords...');

        const client = await pool.connect();
        try {
            // Get all users with a password that is NOT null
            const res = await client.query('SELECT id, password FROM users WHERE password IS NOT NULL');
            const users = res.rows;

            console.log(`Found ${users.length} users with passwords.`);

            let updatedCount = 0;

            for (const user of users) {
                // Check if password is already hashed (bcrypt hashes start with $2a$, $2b$, or $2y$)
                if (!user.password.startsWith('$2a$') && !user.password.startsWith('$2b$') && !user.password.startsWith('$2y$')) {
                    // It's likely plain text
                    console.log(`Encrypting password for user ${user.id}...`);
                    const hashedPassword = await bcrypt.hash(user.password, 10);

                    await client.query('UPDATE users SET password = $1 WHERE id = $2', [hashedPassword, user.id]);
                    updatedCount++;
                }
            }

            console.log(`✅ Success! Encrypted ${updatedCount} passwords.`);

        } finally {
            client.release();
        }

        await pool.end();
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

migrate_passwords();
