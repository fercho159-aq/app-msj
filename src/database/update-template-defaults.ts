import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_hdwNBR08oOcV@ep-plain-king-ahntrqco-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require';
const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });

async function update() {
    try {
        const client = await pool.connect();
        try {
            // Update Requerimiento de Auditoria
            const auditPlaceholders = JSON.stringify([
                { key: 'razon_social', label: 'Razon Social', type: 'text', source: 'client', client_field: 'razon_social' },
                { key: 'rfc', label: 'RFC', type: 'text', source: 'client', client_field: 'rfc' },
                { key: 'domicilio', label: 'Domicilio', type: 'text', source: 'client', client_field: 'domicilio' },
                { key: 'codigo_postal', label: 'Codigo Postal', type: 'text', source: 'client', client_field: 'codigo_postal' },
                { key: 'estado', label: 'Estado', type: 'text', source: 'client', client_field: 'estado' },
                { key: 'fecha_actual', label: 'Fecha Actual', type: 'date', source: 'client' },
                { key: 'oficio_numero', label: 'Numero de Oficio', type: 'text', source: 'auto', auto_generator: 'oficio_numero' },
                { key: 'folio', label: 'Folio', type: 'text', source: 'auto', auto_generator: 'folio' },
                { key: 'encabezado_administracion', label: 'Encabezado Administracion', type: 'text', source: 'manual', default_value: 'Administracion General de Auditoria Fiscal Federal\nAdministracion Desconcentrada de Auditoria Fiscal de Sinaloa "1" con sede en Sinaloa.\nSubadministracion Desconcentrada de Auditoria Fiscal "5"' },
                { key: 'colonia', label: 'Colonia', type: 'text', source: 'manual', default_value: 'Chula Vista' },
                { key: 'ciudad', label: 'Ciudad', type: 'text', source: 'manual', default_value: 'Culiacan' },
                { key: 'plazo_dias', label: 'Plazo en Dias Habiles', type: 'number', source: 'manual', default_value: '15' },
                { key: 'ejercicio_fiscal', label: 'Ejercicio Fiscal', type: 'text', source: 'manual', default_value: '2024' },
                { key: 'periodo_inicio', label: 'Periodo Inicio', type: 'text', source: 'manual', default_value: 'enero' },
                { key: 'periodo_fin', label: 'Periodo Fin', type: 'text', source: 'manual', default_value: 'diciembre' },
                { key: 'direccion_autoridad', label: 'Direccion de la Autoridad', type: 'text', source: 'manual', default_value: 'Rio Suchiate No. 856 Pte. Colonia Industrial Bravo C.P. 80120, Culiacan, Sinaloa' },
                { key: 'firmante_nombre', label: 'Nombre del Firmante', type: 'text', source: 'manual', default_value: 'Magdalena Inzunza Munoz' },
                { key: 'firmante_cargo', label: 'Cargo del Firmante', type: 'text', source: 'manual', default_value: 'Subadministradora Desconcentrada de Auditoria Fiscal "5"' },
            ]);

            await client.query(
                `UPDATE document_templates SET placeholders = $1 WHERE category = 'requerimiento_auditoria'`,
                [auditPlaceholders]
            );
            console.log('✅ Actualizada plantilla: Requerimiento de Auditoria');

            // Update Restriccion CSD
            const csdPlaceholders = JSON.stringify([
                { key: 'razon_social', label: 'Razon Social', type: 'text', source: 'client', client_field: 'razon_social' },
                { key: 'rfc', label: 'RFC', type: 'text', source: 'client', client_field: 'rfc' },
                { key: 'domicilio', label: 'Domicilio', type: 'text', source: 'client', client_field: 'domicilio' },
                { key: 'codigo_postal', label: 'Codigo Postal', type: 'text', source: 'client', client_field: 'codigo_postal' },
                { key: 'estado', label: 'Estado', type: 'text', source: 'client', client_field: 'estado' },
                { key: 'fecha_actual', label: 'Fecha Actual', type: 'date', source: 'client' },
                { key: 'oficio_numero', label: 'Numero de Oficio', type: 'text', source: 'auto', auto_generator: 'oficio_numero' },
                { key: 'folio', label: 'Folio', type: 'text', source: 'auto', auto_generator: 'folio' },
                { key: 'encabezado_administracion', label: 'Encabezado Administracion', type: 'text', source: 'manual', default_value: 'Administracion General de Auditoria Fiscal Federal\nAdministracion Desconcentrada de Auditoria Fiscal de Sinaloa "1" con sede en Sinaloa.\nSubadministracion Desconcentrada de Auditoria Fiscal "5"' },
                { key: 'colonia', label: 'Colonia', type: 'text', source: 'manual', default_value: 'Chula Vista' },
                { key: 'ciudad', label: 'Ciudad', type: 'text', source: 'manual', default_value: 'Culiacan' },
                { key: 'fecha_analisis', label: 'Fecha de Analisis', type: 'date', source: 'manual', default_value: new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' }) },
                { key: 'ejercicio_fiscal', label: 'Ejercicio Fiscal', type: 'text', source: 'manual', default_value: '2024' },
                { key: 'periodo_inicio', label: 'Periodo Inicio', type: 'text', source: 'manual', default_value: 'enero' },
                { key: 'periodo_fin', label: 'Periodo Fin', type: 'text', source: 'manual', default_value: 'diciembre' },
                { key: 'monto_total', label: 'Monto Total', type: 'currency', source: 'manual', default_value: '$11,349,534.76' },
                { key: 'firmante_nombre', label: 'Nombre del Firmante', type: 'text', source: 'manual', default_value: 'Magdalena Inzunza Munoz' },
                { key: 'firmante_cargo', label: 'Cargo del Firmante', type: 'text', source: 'manual', default_value: 'Subadministradora Desconcentrada de Auditoria Fiscal "5"' },
            ]);

            await client.query(
                `UPDATE document_templates SET placeholders = $1 WHERE category = 'restriccion_csd'`,
                [csdPlaceholders]
            );
            console.log('✅ Actualizada plantilla: Restriccion CSD');

        } finally {
            client.release();
        }
    } catch (e) {
        console.error('Error:', e);
        process.exit(1);
    } finally {
        await pool.end();
        process.exit(0);
    }
}

update();
