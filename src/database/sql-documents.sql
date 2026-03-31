-- ============================================
-- DOCUMENT TEMPLATES & GENERATED DOCUMENTS
-- ============================================

-- 1. Document templates table
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

-- 2. Generated documents table
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
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- Verification fields
    verification_code VARCHAR(100),
    firmante_nombre VARCHAR(255),
    firmante_cargo VARCHAR(255),
    firma_electronica TEXT,
    cadena_original TEXT,
    sello_digital TEXT,
    cert_inicio DATE,
    cert_fin DATE
);

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_document_templates_category ON document_templates(category);
CREATE INDEX IF NOT EXISTS idx_document_templates_active ON document_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_generated_documents_client ON generated_documents(client_id);
CREATE INDEX IF NOT EXISTS idx_generated_documents_template ON generated_documents(template_id);
CREATE INDEX IF NOT EXISTS idx_generated_documents_expires ON generated_documents(expires_at);
CREATE INDEX IF NOT EXISTS idx_generated_documents_created ON generated_documents(created_at);
CREATE UNIQUE INDEX IF NOT EXISTS idx_generated_documents_verification ON generated_documents(verification_code);

-- 4. Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_document_templates_updated_at ON document_templates;
CREATE TRIGGER update_document_templates_updated_at
    BEFORE UPDATE ON document_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
