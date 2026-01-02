import { query } from './config';

async function runMigration() {
    console.log('🔄 Running call_requests migration...');

    try {
        await query(`
            CREATE TABLE IF NOT EXISTS call_requests (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID REFERENCES users(id) ON DELETE CASCADE,
                name VARCHAR(255) NOT NULL,
                phone VARCHAR(20) NOT NULL,
                emergency TEXT NOT NULL,
                status VARCHAR(20) DEFAULT 'pending',
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                completed_at TIMESTAMP WITH TIME ZONE
            );
        `);

        console.log('✅ call_requests table created');

        // Create indexes
        await query(`
            CREATE INDEX IF NOT EXISTS idx_call_requests_status ON call_requests(status);
        `).catch(() => console.log('Index status already exists'));

        await query(`
            CREATE INDEX IF NOT EXISTS idx_call_requests_created ON call_requests(created_at DESC);
        `).catch(() => console.log('Index created_at already exists'));

        console.log('✅ Indexes created');
        console.log('🎉 Migration completed successfully!');

    } catch (error) {
        console.error('❌ Migration failed:', error);
    }

    process.exit(0);
}

runMigration();
