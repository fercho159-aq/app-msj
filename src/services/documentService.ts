import { query, queryOne, transaction } from '../database/config';
import puppeteer from 'puppeteer';
import * as fs from 'fs';
import * as path from 'path';

// ==================== TYPES ====================

export interface DocumentTemplate {
    id: string;
    name: string;
    description: string | null;
    category: string;
    html_content: string;
    placeholders: PlaceholderDef[];
    is_active: boolean;
    created_by: string;
    created_at: string;
    updated_at: string;
}

export interface PlaceholderDef {
    key: string;
    label: string;
    type: 'text' | 'date' | 'number' | 'currency';
    source?: 'client' | 'manual';
    client_field?: string;
}

export interface GeneratedDocument {
    id: string;
    template_id: string;
    client_id: string;
    generated_by: string;
    title: string;
    file_url: string;
    file_size: number | null;
    filled_data: Record<string, string>;
    expires_at: string;
    created_at: string;
    template_name?: string;
    client_name?: string;
    client_rfc?: string;
}

// ==================== CLIENT DATA AUTO-FILL ====================

const CLIENT_FIELD_MAP: Record<string, string> = {
    'nombre': 'name',
    'rfc': 'rfc',
    'razon_social': 'razon_social',
    'tipo_persona': 'tipo_persona',
    'regimen_fiscal': 'regimen_fiscal',
    'domicilio': 'domicilio',
    'codigo_postal': 'codigo_postal',
    'estado': 'estado',
    'curp': 'curp',
    'telefono': 'phone',
    'capital': 'capital',
    'efirma_vencimiento': 'efirma_expiry',
    'csd_vencimiento': 'csd_expiry',
};

async function getClientData(clientId: string): Promise<Record<string, string>> {
    const client = await queryOne<any>(
        `SELECT id, rfc, name, razon_social, tipo_persona, regimen_fiscal,
                domicilio, codigo_postal, estado, curp, phone, capital,
                efirma_expiry::text, csd_expiry::text
         FROM users WHERE id = $1`,
        [clientId]
    );
    if (!client) return {};
    return {
        nombre: client.name || '',
        rfc: client.rfc || '',
        razon_social: client.razon_social || '',
        tipo_persona: client.tipo_persona || '',
        regimen_fiscal: client.regimen_fiscal || '',
        domicilio: client.domicilio || '',
        codigo_postal: client.codigo_postal || '',
        estado: client.estado || '',
        curp: client.curp || '',
        telefono: client.phone || '',
        capital: client.capital ? parseFloat(client.capital).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' }) : '',
        efirma_vencimiento: client.efirma_expiry || '',
        csd_vencimiento: client.csd_expiry || '',
        fecha_actual: new Date().toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' }),
    };
}

function fillTemplate(html: string, data: Record<string, string>): string {
    let filled = html;
    for (const [key, value] of Object.entries(data)) {
        const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
        filled = filled.replace(regex, value || '');
    }
    return filled;
}

// ==================== PDF GENERATION ====================

const SAT_HEADER_HTML = `
<div style="width:100%; padding: 10px 40px; box-sizing: border-box; border-bottom: 2px solid #8B0000;">
    <table style="width:100%; border-collapse: collapse;">
        <tr>
            <td style="width:50%; vertical-align: top;">
                <div style="font-family: Arial, sans-serif;">
                    <span style="font-size: 22px; font-weight: bold; color: #4a4a4a;">Hacienda</span>
                    <span style="font-size: 10px; color: #666; display: block;">Secretaria de Hacienda y Credito Publico</span>
                </div>
                <div style="margin-top: 4px; font-size: 9px; color: #8B0000; font-weight: bold;">
                    <span style="font-size: 18px; font-weight: 900; color: #333;">SAT</span>
                    <span style="display: block; font-size: 8px; color: #666;">SERVICIO DE ADMINISTRACION TRIBUTARIA</span>
                </div>
            </td>
            <td style="width:50%; text-align: right; vertical-align: top; font-family: Arial, sans-serif; font-size: 10px; color: #333;">
                <div><strong>Oficio:</strong> {{oficio_numero}}</div>
                <div><strong>R.F.C.:</strong> {{rfc}}</div>
                <div><strong>Folio:</strong> {{folio}}</div>
            </td>
        </tr>
    </table>
    <div style="margin-top: 6px; font-family: Arial, sans-serif; font-size: 8px; color: #8B0000; font-weight: bold;">
        {{encabezado_administracion}}
    </div>
</div>
`;

const SAT_FOOTER_HTML = `
<div style="width: 100%; padding: 5px 40px; box-sizing: border-box;">
    <div style="border-top: 2px solid #8B0000; padding-top: 8px;">
        <table style="width: 100%; border-collapse: collapse;">
            <tr>
                <td style="width: 120px; vertical-align: middle;">
                    <div style="font-family: Arial, sans-serif;">
                        <span style="font-size: 28px; font-weight: 900; color: #8B0000;">2026</span>
                        <div style="font-size: 8px; color: #8B0000; font-style: italic; line-height: 1.1;">
                            ano de<br/>
                            <span style="font-weight: bold; font-size: 10px;">Margarita</span><br/>
                            <span style="font-weight: 900; font-size: 14px;">Maza</span>
                        </div>
                    </div>
                </td>
                <td style="vertical-align: middle; font-family: Arial, sans-serif; font-size: 8px; color: #555;">
                    Rio Suchiate No. 856 Pte. Colonia Industrial Bravo C.P. 80120, Culiacan, Sinaloa &nbsp; sat.gob.mx / MarcaSAT 55 627 22 728
                </td>
            </tr>
        </table>
    </div>
    <div style="text-align: center; font-family: Arial, sans-serif; font-size: 10px; color: #333; margin-top: 4px;">
        <span class="pageNumber"></span> / <span class="totalPages"></span>
    </div>
</div>
`;

let browserInstance: any = null;

async function getBrowser() {
    if (!browserInstance || !browserInstance.isConnected()) {
        browserInstance = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
        });
    }
    return browserInstance;
}

export async function generatePdf(
    htmlBody: string,
    headerData: Record<string, string> = {}
): Promise<Buffer> {
    const browser = await getBrowser();
    const page = await browser.newPage();

    try {
        const fullHtml = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        @page { margin: 160px 40px 120px 40px; }
        body {
            font-family: Arial, Helvetica, sans-serif;
            font-size: 11px;
            line-height: 1.5;
            color: #333;
            text-align: justify;
        }
        h1 { font-size: 16px; font-weight: bold; text-align: center; }
        h2 { font-size: 14px; font-weight: bold; }
        h3 { font-size: 12px; font-weight: bold; }
        table.data-table {
            width: 100%;
            border-collapse: collapse;
            margin: 10px 0;
            font-size: 9px;
        }
        table.data-table th {
            background-color: #e8e8e8;
            border: 1px solid #ccc;
            padding: 4px 6px;
            text-align: center;
            font-weight: bold;
        }
        table.data-table td {
            border: 1px solid #ccc;
            padding: 3px 6px;
        }
        .bold { font-weight: bold; }
        .center { text-align: center; }
        .right { text-align: right; }
        .underline { text-decoration: underline; }
        .section { margin: 15px 0; }
        .indent { margin-left: 20px; }
    </style>
</head>
<body>
${htmlBody}
</body>
</html>`;

        await page.setContent(fullHtml, { waitUntil: 'networkidle0' });

        let headerHtml = SAT_HEADER_HTML;
        let footerHtml = SAT_FOOTER_HTML;
        for (const [key, value] of Object.entries(headerData)) {
            const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
            headerHtml = headerHtml.replace(regex, value || '');
            footerHtml = footerHtml.replace(regex, value || '');
        }

        const pdfBuffer = await page.pdf({
            format: 'Letter',
            printBackground: true,
            displayHeaderFooter: true,
            headerTemplate: headerHtml,
            footerTemplate: footerHtml,
            margin: {
                top: '180px',
                bottom: '140px',
                left: '50px',
                right: '50px',
            },
        });

        return Buffer.from(pdfBuffer);
    } finally {
        await page.close();
    }
}

// ==================== TEMPLATE CRUD ====================

export async function getTemplates(category?: string): Promise<DocumentTemplate[]> {
    const whereClause = category
        ? `WHERE is_active = true AND category = $1`
        : `WHERE is_active = true`;
    const params = category ? [category] : [];

    return query<DocumentTemplate>(
        `SELECT * FROM document_templates ${whereClause} ORDER BY name ASC`,
        params
    );
}

export async function getTemplateById(id: string): Promise<DocumentTemplate | null> {
    return queryOne<DocumentTemplate>(
        `SELECT * FROM document_templates WHERE id = $1`,
        [id]
    );
}

export async function createTemplate(data: {
    name: string;
    description?: string;
    category: string;
    html_content: string;
    placeholders: PlaceholderDef[];
    created_by: string;
}): Promise<DocumentTemplate> {
    const result = await queryOne<DocumentTemplate>(
        `INSERT INTO document_templates (name, description, category, html_content, placeholders, created_by)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [data.name, data.description || null, data.category, data.html_content, JSON.stringify(data.placeholders), data.created_by]
    );
    return result!;
}

export async function updateTemplate(id: string, data: {
    name?: string;
    description?: string;
    category?: string;
    html_content?: string;
    placeholders?: PlaceholderDef[];
    is_active?: boolean;
}): Promise<DocumentTemplate | null> {
    const sets: string[] = [];
    const params: any[] = [];
    let idx = 1;

    if (data.name !== undefined) { sets.push(`name = $${idx++}`); params.push(data.name); }
    if (data.description !== undefined) { sets.push(`description = $${idx++}`); params.push(data.description); }
    if (data.category !== undefined) { sets.push(`category = $${idx++}`); params.push(data.category); }
    if (data.html_content !== undefined) { sets.push(`html_content = $${idx++}`); params.push(data.html_content); }
    if (data.placeholders !== undefined) { sets.push(`placeholders = $${idx++}`); params.push(JSON.stringify(data.placeholders)); }
    if (data.is_active !== undefined) { sets.push(`is_active = $${idx++}`); params.push(data.is_active); }

    if (sets.length === 0) return getTemplateById(id);

    params.push(id);
    return queryOne<DocumentTemplate>(
        `UPDATE document_templates SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`,
        params
    );
}

export async function deleteTemplate(id: string): Promise<boolean> {
    const result = await queryOne<{ id: string }>(
        `UPDATE document_templates SET is_active = false WHERE id = $1 RETURNING id`,
        [id]
    );
    return !!result;
}

// ==================== DOCUMENT GENERATION ====================

export async function generateDocument(data: {
    template_id: string;
    client_id: string;
    generated_by: string;
    extra_data?: Record<string, string>;
    title?: string;
}): Promise<GeneratedDocument> {
    const template = await getTemplateById(data.template_id);
    if (!template) throw new Error('Plantilla no encontrada');

    const clientData = await getClientData(data.client_id);
    const allData = { ...clientData, ...data.extra_data };
    const filledHtml = fillTemplate(template.html_content, allData);

    const headerData: Record<string, string> = {
        oficio_numero: allData.oficio_numero || '',
        rfc: clientData.rfc || '',
        folio: allData.folio || '',
        encabezado_administracion: allData.encabezado_administracion || '',
    };

    const pdfBuffer = await generatePdf(filledHtml, headerData);

    // Save file
    const uploadsDir = path.join(__dirname, '../../uploads/documents');
    if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const timestamp = Date.now();
    const safeTitle = (data.title || template.name).replace(/[^a-zA-Z0-9-_]/g, '_').substring(0, 50);
    const filename = `${timestamp}-${safeTitle}.pdf`;
    const filePath = path.join(uploadsDir, filename);
    fs.writeFileSync(filePath, pdfBuffer);

    const baseUrl = process.env.BASE_URL || 'https://appsoluciones.duckdns.org';
    const fileUrl = `${baseUrl}/uploads/documents/${filename}`;

    const doc = await queryOne<GeneratedDocument>(
        `INSERT INTO generated_documents (template_id, client_id, generated_by, title, file_url, file_size, filled_data)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [data.template_id, data.client_id, data.generated_by, data.title || template.name, fileUrl, pdfBuffer.length, JSON.stringify(allData)]
    );

    return doc!;
}

// ==================== GENERATED DOCUMENTS QUERIES ====================

export async function getGeneratedDocuments(
    clientId?: string,
    page: number = 1,
    limit: number = 20
): Promise<{ documents: GeneratedDocument[]; total: number }> {
    const offset = (page - 1) * limit;
    const whereClause = clientId
        ? `WHERE gd.client_id = $1 AND gd.expires_at > NOW()`
        : `WHERE gd.expires_at > NOW()`;
    const params = clientId ? [clientId, limit, offset] : [limit, offset];
    const limitParam = clientId ? '$2' : '$1';
    const offsetParam = clientId ? '$3' : '$2';

    const countResult = await queryOne<{ count: string }>(
        `SELECT COUNT(*)::text as count FROM generated_documents gd ${whereClause}`,
        clientId ? [clientId] : []
    );

    const documents = await query<GeneratedDocument>(`
        SELECT gd.*,
               dt.name as template_name,
               u.name as client_name,
               u.rfc as client_rfc
        FROM generated_documents gd
        LEFT JOIN document_templates dt ON dt.id = gd.template_id
        LEFT JOIN users u ON u.id = gd.client_id
        ${whereClause}
        ORDER BY gd.created_at DESC
        LIMIT ${limitParam} OFFSET ${offsetParam}
    `, params);

    return { documents, total: parseInt(countResult?.count || '0') };
}

export async function getGeneratedDocumentById(id: string): Promise<GeneratedDocument | null> {
    return queryOne<GeneratedDocument>(`
        SELECT gd.*,
               dt.name as template_name,
               u.name as client_name,
               u.rfc as client_rfc
        FROM generated_documents gd
        LEFT JOIN document_templates dt ON dt.id = gd.template_id
        LEFT JOIN users u ON u.id = gd.client_id
        WHERE gd.id = $1
    `, [id]);
}

export async function deleteExpiredDocuments(): Promise<number> {
    const expired = await query<{ file_url: string }>(
        `SELECT file_url FROM generated_documents WHERE expires_at <= NOW()`
    );

    // Delete physical files
    for (const doc of expired) {
        try {
            const filename = doc.file_url.split('/').pop();
            if (filename) {
                const filePath = path.join(__dirname, '../../uploads/documents', filename);
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }
            }
        } catch (e) {
            console.error('Error deleting file:', e);
        }
    }

    const result = await query<{ count: string }>(
        `WITH deleted AS (DELETE FROM generated_documents WHERE expires_at <= NOW() RETURNING id)
         SELECT COUNT(*)::text as count FROM deleted`
    );

    return parseInt(result[0]?.count || '0');
}

// ==================== DEFAULT TEMPLATE ====================

export async function seedDefaultTemplate(createdBy: string): Promise<void> {
    const existing = await queryOne<{ id: string }>(
        `SELECT id FROM document_templates WHERE category = 'restriccion_csd' LIMIT 1`
    );
    if (existing) return;

    const defaultHtml = `
<div class="section">
    <p><strong>Asunto:</strong> Se Comunica Restriccion Temporal de Certificado de Sello Digital Art. 17-H Bis del CFF.</p>
    <p class="right">Culiacan Rosales, Sinaloa, {{fecha_actual}}</p>
</div>

<div class="section">
    <p><strong>Representante legal de:</strong></p>
    <p>{{razon_social}}</p>
    <p>{{domicilio}}</p>
    <p>Colonia {{colonia}}</p>
    <p>{{ciudad}}, C.P. {{codigo_postal}}, {{estado}}.</p>
</div>

<div class="section">
    <p>Esta Administracion Desconcentrada de Auditoria Fiscal de Sinaloa "1", con sede en Sinaloa, de la Administracion General de Auditoria Fiscal Federal del Servicio de Administracion Tributaria, con fundamento en lo dispuesto en los articulos 16 de la Constitucion Politica de los Estados Unidos Mexicanos; 1, 7, fracciones VII y XVIII y 8, fraccion III de la Ley del Servicio de Administracion Tributaria, le comunica lo siguiente:</p>
</div>

<div class="section">
    <p>Derivado del ejercicio de las facultades conferidas en terminos de las disposiciones fiscales vigentes, esta Administracion Desconcentrada de Auditoria Fiscal de Sinaloa "1" con sede en Sinaloa, del analisis realizado con fecha {{fecha_analisis}}, a la informacion contenida en las bases de datos del sistema denominado Consulta de Factura Electronica (Consulta Central CFDI) del Servicio de Administracion Tributaria.</p>
</div>

<div class="section">
    <h2 class="underline center">{{ejercicio_fiscal}}</h2>
    <p><strong>1.-</strong> Del analisis realizado a las bases de datos del sistema denominado Consulta de Facturas Electronicas (Consulta Central CFDI) del Servicio de Administracion Tributaria, al cual tiene acceso esta autoridad, informacion que se presume cierta y se utiliza de conformidad con el articulo 63, parrafos primero y ultimo del Codigo Fiscal de la Federacion vigente, advirtio que esa contribuyente dentro de los periodos comprendidos de {{periodo_inicio}} a {{periodo_fin}}, emitio Comprobantes Fiscales Digitales por Internet con efecto ingreso en cantidad de {{monto_total}} de acuerdo a lo siguiente.</p>
</div>
`;

    const placeholders: PlaceholderDef[] = [
        { key: 'razon_social', label: 'Razon Social', type: 'text', source: 'client', client_field: 'razon_social' },
        { key: 'rfc', label: 'RFC', type: 'text', source: 'client', client_field: 'rfc' },
        { key: 'domicilio', label: 'Domicilio', type: 'text', source: 'client', client_field: 'domicilio' },
        { key: 'codigo_postal', label: 'Codigo Postal', type: 'text', source: 'client', client_field: 'codigo_postal' },
        { key: 'estado', label: 'Estado', type: 'text', source: 'client', client_field: 'estado' },
        { key: 'fecha_actual', label: 'Fecha Actual', type: 'date', source: 'client' },
        { key: 'oficio_numero', label: 'Numero de Oficio', type: 'text', source: 'manual' },
        { key: 'folio', label: 'Folio', type: 'text', source: 'manual' },
        { key: 'encabezado_administracion', label: 'Administracion', type: 'text', source: 'manual' },
        { key: 'colonia', label: 'Colonia', type: 'text', source: 'manual' },
        { key: 'ciudad', label: 'Ciudad', type: 'text', source: 'manual' },
        { key: 'fecha_analisis', label: 'Fecha de Analisis', type: 'date', source: 'manual' },
        { key: 'ejercicio_fiscal', label: 'Ejercicio Fiscal', type: 'text', source: 'manual' },
        { key: 'periodo_inicio', label: 'Periodo Inicio', type: 'text', source: 'manual' },
        { key: 'periodo_fin', label: 'Periodo Fin', type: 'text', source: 'manual' },
        { key: 'monto_total', label: 'Monto Total', type: 'currency', source: 'manual' },
    ];

    await createTemplate({
        name: 'Restriccion Temporal CSD - Art. 17-H Bis',
        description: 'Comunicacion de restriccion temporal de certificado de sello digital conforme al articulo 17-H Bis del CFF',
        category: 'restriccion_csd',
        html_content: defaultHtml,
        placeholders,
        created_by: createdBy,
    });
}
