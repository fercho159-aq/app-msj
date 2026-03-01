import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_hdwNBR08oOcV@ep-plain-king-ahntrqco-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require';

const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });

async function migrate() {
    try {
        const client = await pool.connect();
        try {
            console.log('Creating projects module tables...');

            // 1. Agregar campos fiscales a users
            await client.query(`
                ALTER TABLE users
                ADD COLUMN IF NOT EXISTS capital NUMERIC(18,2),
                ADD COLUMN IF NOT EXISTS efirma_expiry DATE,
                ADD COLUMN IF NOT EXISTS csd_expiry DATE;
            `);
            console.log('✅ Users table: added capital, efirma_expiry, csd_expiry');

            // 2. Projects table
            await client.query(`
                CREATE TABLE IF NOT EXISTS projects (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    client_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    name VARCHAR(255) NOT NULL,
                    service_type VARCHAR(100) NOT NULL,
                    description TEXT,
                    status VARCHAR(20) NOT NULL DEFAULT 'activo'
                        CHECK (status IN ('activo', 'pausado', 'completado', 'cancelado')),
                    created_by UUID NOT NULL REFERENCES users(id),
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                );
            `);
            console.log('✅ Created table: projects');

            // 3. Project phases table
            await client.query(`
                CREATE TABLE IF NOT EXISTS project_phases (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
                    name VARCHAR(255) NOT NULL,
                    description TEXT,
                    status VARCHAR(20) NOT NULL DEFAULT 'pendiente'
                        CHECK (status IN ('pendiente', 'en_curso', 'bloqueado', 'completado')),
                    executor_id UUID REFERENCES users(id),
                    sort_order INT NOT NULL DEFAULT 0,
                    deadline DATE,
                    started_at TIMESTAMP WITH TIME ZONE,
                    completed_at TIMESTAMP WITH TIME ZONE,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                );
            `);
            console.log('✅ Created table: project_phases');

            // 4. Phase documents table
            await client.query(`
                CREATE TABLE IF NOT EXISTS phase_documents (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    phase_id UUID NOT NULL REFERENCES project_phases(id) ON DELETE CASCADE,
                    file_url TEXT NOT NULL,
                    file_name VARCHAR(255) NOT NULL,
                    file_type VARCHAR(100),
                    file_size BIGINT,
                    source VARCHAR(10) NOT NULL DEFAULT 'upload'
                        CHECK (source IN ('upload', 'message')),
                    message_id UUID,
                    uploaded_by UUID NOT NULL REFERENCES users(id),
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                );
            `);
            console.log('✅ Created table: phase_documents');

            // 5. Phase observations table
            await client.query(`
                CREATE TABLE IF NOT EXISTS phase_observations (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    phase_id UUID NOT NULL REFERENCES project_phases(id) ON DELETE CASCADE,
                    author_id UUID NOT NULL REFERENCES users(id),
                    content TEXT NOT NULL,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                );
            `);
            console.log('✅ Created table: phase_observations');

            // 6. Phase checklist items table
            await client.query(`
                CREATE TABLE IF NOT EXISTS phase_checklist_items (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    phase_id UUID NOT NULL REFERENCES project_phases(id) ON DELETE CASCADE,
                    label VARCHAR(255) NOT NULL,
                    is_completed BOOLEAN NOT NULL DEFAULT false,
                    completed_by UUID REFERENCES users(id),
                    completed_at TIMESTAMP WITH TIME ZONE,
                    sort_order INT NOT NULL DEFAULT 0,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                );
            `);
            console.log('✅ Created table: phase_checklist_items');

            // 7. Indexes
            await client.query(`
                CREATE INDEX IF NOT EXISTS idx_projects_client_id ON projects(client_id);
                CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
                CREATE INDEX IF NOT EXISTS idx_project_phases_project_id ON project_phases(project_id);
                CREATE INDEX IF NOT EXISTS idx_project_phases_status ON project_phases(status);
                CREATE INDEX IF NOT EXISTS idx_project_phases_deadline ON project_phases(deadline);
                CREATE INDEX IF NOT EXISTS idx_phase_documents_phase_id ON phase_documents(phase_id);
                CREATE INDEX IF NOT EXISTS idx_phase_observations_phase_id ON phase_observations(phase_id);
                CREATE INDEX IF NOT EXISTS idx_phase_checklist_items_phase_id ON phase_checklist_items(phase_id);
            `);
            console.log('✅ Created indexes');

            // 8. Updated_at triggers
            await client.query(`
                CREATE OR REPLACE FUNCTION update_updated_at_column()
                RETURNS TRIGGER AS $$
                BEGIN
                    NEW.updated_at = NOW();
                    RETURN NEW;
                END;
                $$ language 'plpgsql';
            `);

            const tablesWithUpdatedAt = ['projects', 'project_phases', 'phase_observations'];
            for (const table of tablesWithUpdatedAt) {
                await client.query(`
                    DROP TRIGGER IF EXISTS update_${table}_updated_at ON ${table};
                    CREATE TRIGGER update_${table}_updated_at
                        BEFORE UPDATE ON ${table}
                        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
                `);
            }
            console.log('✅ Created updated_at triggers');

            // Verification
            const tables = ['projects', 'project_phases', 'phase_documents', 'phase_observations', 'phase_checklist_items'];
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
