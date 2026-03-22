import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_hdwNBR08oOcV@ep-plain-king-ahntrqco-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require';

const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });

async function migrate() {
    try {
        const client = await pool.connect();
        try {
            console.log('Creating document templates and generated documents tables...');

            // 1. Document templates table
            await client.query(`
                CREATE TABLE IF NOT EXISTS document_templates (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    name VARCHAR(255) NOT NULL,
                    description TEXT,
                    category VARCHAR(100) NOT NULL DEFAULT 'general',
                    html_content TEXT NOT NULL,
                    placeholders JSONB NOT NULL DEFAULT '[]',
                    is_active BOOLEAN NOT NULL DEFAULT true,
                    created_by UUID NOT NULL REFERENCES users(id),
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                );
            `);
            console.log('✅ Created table: document_templates');

            // 2. Generated documents table
            await client.query(`
                CREATE TABLE IF NOT EXISTS generated_documents (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    template_id UUID NOT NULL REFERENCES document_templates(id),
                    client_id UUID NOT NULL REFERENCES users(id),
                    generated_by UUID NOT NULL REFERENCES users(id),
                    title VARCHAR(500) NOT NULL,
                    file_url TEXT NOT NULL,
                    file_size BIGINT,
                    filled_data JSONB NOT NULL DEFAULT '{}',
                    expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (NOW() + INTERVAL '3 months'),
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                );
            `);
            console.log('✅ Created table: generated_documents');

            // 3. Indexes
            await client.query(`
                CREATE INDEX IF NOT EXISTS idx_document_templates_category ON document_templates(category);
                CREATE INDEX IF NOT EXISTS idx_document_templates_active ON document_templates(is_active);
                CREATE INDEX IF NOT EXISTS idx_generated_documents_client ON generated_documents(client_id);
                CREATE INDEX IF NOT EXISTS idx_generated_documents_template ON generated_documents(template_id);
                CREATE INDEX IF NOT EXISTS idx_generated_documents_expires ON generated_documents(expires_at);
                CREATE INDEX IF NOT EXISTS idx_generated_documents_created ON generated_documents(created_at);
            `);
            console.log('✅ Created indexes');

            // 4. Updated_at trigger for templates
            await client.query(`
                CREATE OR REPLACE FUNCTION update_updated_at_column()
                RETURNS TRIGGER AS $$
                BEGIN
                    NEW.updated_at = NOW();
                    RETURN NEW;
                END;
                $$ language 'plpgsql';
            `);

            await client.query(`
                DROP TRIGGER IF EXISTS update_document_templates_updated_at ON document_templates;
                CREATE TRIGGER update_document_templates_updated_at
                    BEFORE UPDATE ON document_templates
                    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
            `);
            console.log('✅ Created updated_at trigger');

            // Verification
            const tables = ['document_templates', 'generated_documents'];
            console.log('\n📋 Verification:');
            for (const table of tables) {
                const result = await client.query(`
                    SELECT column_name, data_type
                    FROM information_schema.columns
                    WHERE table_name = $1
                    ORDER BY ordinal_position;
                `, [table]);
                console.log(`\n   Table: ${table} (${result.rows.length} columns)`);
                result.rows.forEach((row: any) => {
                    console.log(`     - ${row.column_name}: ${row.data_type}`);
                });
            }

        } finally {
            client.release();
        }
    } catch (e) {
        console.error('Migration error:', e);
        process.exit(1);
    } finally {
        await pool.end();
        process.exit(0);
    }
}

migrate();
