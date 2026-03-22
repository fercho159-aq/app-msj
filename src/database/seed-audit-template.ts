import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_hdwNBR08oOcV@ep-plain-king-ahntrqco-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require';

const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });

async function seed() {
    try {
        const client = await pool.connect();
        try {
            // Get a consultor user to use as created_by
            const consultor = await client.query(
                `SELECT id FROM users WHERE COALESCE(role, 'usuario') = 'consultor' LIMIT 1`
            );
            if (consultor.rows.length === 0) {
                console.error('No hay usuarios consultores. Crea uno primero.');
                process.exit(1);
            }
            const consultorId = consultor.rows[0].id;

            // Check if already exists
            const existing = await client.query(
                `SELECT id FROM document_templates WHERE category = 'requerimiento_auditoria' LIMIT 1`
            );
            if (existing.rows.length > 0) {
                console.log('La plantilla de requerimiento de auditoria ya existe.');
                process.exit(0);
            }

            const htmlContent = `
<div class="section">
    <p><strong>Asunto:</strong> Requerimiento de informacion y documentacion para la practica de auditoria inmediata.</p>
    <p class="right">Culiacan Rosales, Sinaloa, {{fecha_actual}}</p>
</div>

<div class="section">
    <p><strong>Representante legal de:</strong></p>
    <p><strong>{{razon_social}}</strong></p>
    <p>{{domicilio}}</p>
    <p>Colonia {{colonia}}</p>
    <p>{{ciudad}}, C.P. {{codigo_postal}}, {{estado}}.</p>
</div>

<div class="section">
    <p>Esta Administracion Desconcentrada de Auditoria Fiscal de Sinaloa "1", con sede en Sinaloa, de la Administracion General de Auditoria Fiscal Federal del Servicio de Administracion Tributaria, con fundamento en lo dispuesto en los articulos 16 de la Constitucion Politica de los Estados Unidos Mexicanos; 1, 7, fracciones VII y XVIII y 8, fraccion III de la Ley del Servicio de Administracion Tributaria, publicada en el Diario Oficial de la Federacion el 15 de diciembre de 1995, reformada por Decreto publicado en el propio Diario Oficial de la Federacion el 12 de junio de 2003; 1, 2, parrafos primero, apartado C y segundo, 5, parrafo tercero, 6, parrafo primero, apartado A, fraccion XXIV, inciso a), 14, fraccion VI, 22, parrafo segundo, en relacion con el articulo 30, parrafo primero, apartado B, fraccion X, articulo 22, ultimo parrafo, numeral 8 y articulo 24, ultimo parrafo del Reglamento Interior del Servicio de Administracion Tributaria, publicado en el Diario Oficial de la Federacion el 24 de agosto de 2015, vigente a partir del 22 de noviembre de 2015, de conformidad con lo dispuesto en el parrafo primero del Articulo Primero Transitorio de dicho Reglamento; 42, fracciones II y III, y 48, fracciones I, II y III del Codigo Fiscal de la Federacion vigente, le comunica lo siguiente:</p>
</div>

<div class="section">
    <p>Se le <strong>REQUIERE</strong> para que en un plazo de <strong>{{plazo_dias}} dias habiles</strong> contados a partir del dia siguiente a aquel en que surta efectos la notificacion del presente oficio, proporcione a esta autoridad la informacion y documentacion que a continuacion se detalla, correspondiente al ejercicio fiscal <strong>{{ejercicio_fiscal}}</strong>:</p>
</div>

<div class="section">
    <h3>I. DOCUMENTACION CONTABLE</h3>
    <div class="indent">
        <p>a) Balanzas de comprobacion mensuales de los periodos comprendidos de {{periodo_inicio}} a {{periodo_fin}} del ejercicio {{ejercicio_fiscal}}.</p>
        <p>b) Papeles de trabajo de la determinacion de los pagos provisionales del Impuesto Sobre la Renta, correspondientes a los meses de {{periodo_inicio}} a {{periodo_fin}} del ejercicio {{ejercicio_fiscal}}.</p>
        <p>c) Papeles de trabajo de la determinacion del Impuesto al Valor Agregado, correspondientes a los meses de {{periodo_inicio}} a {{periodo_fin}} del ejercicio {{ejercicio_fiscal}}.</p>
        <p>d) Declaraciones provisionales y/o definitivas presentadas correspondientes al ejercicio {{ejercicio_fiscal}}.</p>
        <p>e) Declaracion anual del ejercicio {{ejercicio_fiscal}}, en caso de haberla presentado.</p>
    </div>
</div>

<div class="section">
    <h3>II. DOCUMENTACION SOPORTE</h3>
    <div class="indent">
        <p>a) Estados de cuenta bancarios de todas las cuentas bancarias a nombre del contribuyente o de sus representantes legales utilizadas para la operacion del negocio, correspondientes al ejercicio {{ejercicio_fiscal}}.</p>
        <p>b) Contratos celebrados con clientes y proveedores vigentes durante el ejercicio {{ejercicio_fiscal}}.</p>
        <p>c) Registro de control de inventarios correspondiente al ejercicio {{ejercicio_fiscal}}.</p>
        <p>d) Relacion de los 10 principales clientes y 10 principales proveedores del ejercicio {{ejercicio_fiscal}}, indicando RFC, razon social, domicilio fiscal y monto total de operaciones.</p>
    </div>
</div>

<div class="section">
    <h3>III. COMPROBANTES FISCALES DIGITALES</h3>
    <div class="indent">
        <p>a) Archivos XML de los Comprobantes Fiscales Digitales por Internet (CFDI) emitidos y recibidos durante el ejercicio {{ejercicio_fiscal}}, en formato electronico.</p>
        <p>b) Relacion de CFDI cancelados durante el ejercicio {{ejercicio_fiscal}}, indicando motivo de cancelacion.</p>
    </div>
</div>

<div class="section">
    <h3>IV. INFORMACION DE NOMINA</h3>
    <div class="indent">
        <p>a) Nominas de los trabajadores correspondientes al ejercicio {{ejercicio_fiscal}}.</p>
        <p>b) Recibos de nomina timbrados (CFDI de nomina) del ejercicio {{ejercicio_fiscal}}.</p>
        <p>c) Contratos individuales de trabajo vigentes durante el ejercicio {{ejercicio_fiscal}}.</p>
        <p>d) Alta, baja y modificaciones ante el IMSS del ejercicio {{ejercicio_fiscal}}.</p>
    </div>
</div>

<div class="section">
    <p>Lo anterior, de conformidad con lo establecido en los articulos 28, 29, 29-A y 30 del Codigo Fiscal de la Federacion vigente.</p>
</div>

<div class="section">
    <p>Se le apercibe que en caso de no proporcionar la informacion y documentacion requerida dentro del plazo senalado, se le hara acreedor a las multas establecidas en los articulos 81, fraccion I y 82, fraccion I, inciso a) del Codigo Fiscal de la Federacion, que van de <strong>$1,810.00 a $22,400.00</strong> pesos, por cada requerimiento no atendido.</p>
</div>

<div class="section">
    <p>Asimismo, se le informa que de no proporcionar la documentacion e informacion solicitada, esta autoridad procedera a determinar presuntivamente la utilidad fiscal y/o los ingresos brutos de esa contribuyente, de conformidad con lo establecido en los articulos 55 y 56 del Codigo Fiscal de la Federacion vigente.</p>
</div>

<div class="section">
    <p>La informacion y documentacion requerida debera ser proporcionada en el domicilio de esta autoridad, ubicado en {{direccion_autoridad}}, en horario de 8:00 a 15:00 horas, de lunes a viernes.</p>
</div>

<div class="section">
    <p>Finalmente, se hace de su conocimiento que tiene derecho a corregir su situacion fiscal, de conformidad con lo establecido en el articulo 13 de la Ley Federal de los Derechos del Contribuyente.</p>
</div>
`;

            const placeholders = JSON.stringify([
                { key: 'razon_social', label: 'Razon Social', type: 'text', source: 'client', client_field: 'razon_social' },
                { key: 'rfc', label: 'RFC', type: 'text', source: 'client', client_field: 'rfc' },
                { key: 'domicilio', label: 'Domicilio', type: 'text', source: 'client', client_field: 'domicilio' },
                { key: 'codigo_postal', label: 'Codigo Postal', type: 'text', source: 'client', client_field: 'codigo_postal' },
                { key: 'estado', label: 'Estado', type: 'text', source: 'client', client_field: 'estado' },
                { key: 'fecha_actual', label: 'Fecha Actual', type: 'date', source: 'client' },
                { key: 'oficio_numero', label: 'Numero de Oficio', type: 'text', source: 'manual' },
                { key: 'folio', label: 'Folio', type: 'text', source: 'manual' },
                { key: 'encabezado_administracion', label: 'Encabezado Administracion', type: 'text', source: 'manual' },
                { key: 'colonia', label: 'Colonia', type: 'text', source: 'manual' },
                { key: 'ciudad', label: 'Ciudad', type: 'text', source: 'manual' },
                { key: 'plazo_dias', label: 'Plazo en Dias Habiles', type: 'number', source: 'manual' },
                { key: 'ejercicio_fiscal', label: 'Ejercicio Fiscal (ej: 2024)', type: 'text', source: 'manual' },
                { key: 'periodo_inicio', label: 'Periodo Inicio (ej: enero)', type: 'text', source: 'manual' },
                { key: 'periodo_fin', label: 'Periodo Fin (ej: diciembre)', type: 'text', source: 'manual' },
                { key: 'direccion_autoridad', label: 'Direccion de la Autoridad', type: 'text', source: 'manual' },
                { key: 'firmante_nombre', label: 'Nombre del Firmante', type: 'text', source: 'manual' },
                { key: 'firmante_cargo', label: 'Cargo del Firmante', type: 'text', source: 'manual' },
            ]);

            await client.query(
                `INSERT INTO document_templates (name, description, category, html_content, placeholders, created_by)
                 VALUES ($1, $2, $3, $4, $5, $6)`,
                [
                    'Requerimiento de Auditoria Inmediata',
                    'Requerimiento de informacion y documentacion para la practica de auditoria inmediata conforme a los articulos 42 y 48 del CFF',
                    'requerimiento_auditoria',
                    htmlContent,
                    placeholders,
                    consultorId,
                ]
            );

            console.log('✅ Plantilla "Requerimiento de Auditoria Inmediata" creada exitosamente');

            // Also seed the restriccion CSD template
            const existingCsd = await client.query(
                `SELECT id FROM document_templates WHERE category = 'restriccion_csd' LIMIT 1`
            );
            if (existingCsd.rows.length === 0) {
                const csdHtml = `
<div class="section">
    <p><strong>Asunto:</strong> Se Comunica Restriccion Temporal de Certificado de Sello Digital Art. 17-H Bis del CFF.</p>
    <p class="right">Culiacan Rosales, Sinaloa, {{fecha_actual}}</p>
</div>

<div class="section">
    <p><strong>Representante legal de:</strong></p>
    <p><strong>{{razon_social}}</strong></p>
    <p>{{domicilio}}</p>
    <p>Colonia {{colonia}}</p>
    <p>{{ciudad}}, C.P. {{codigo_postal}}, {{estado}}.</p>
</div>

<div class="section">
    <p>Esta Administracion Desconcentrada de Auditoria Fiscal de Sinaloa "1", con sede en Sinaloa, de la Administracion General de Auditoria Fiscal Federal del Servicio de Administracion Tributaria, con fundamento en lo dispuesto en los articulos 16 de la Constitucion Politica de los Estados Unidos Mexicanos; 1, 7, fracciones VII y XVIII y 8, fraccion III de la Ley del Servicio de Administracion Tributaria, publicada en el Diario Oficial de la Federacion el 15 de diciembre de 1995, reformada por Decreto publicado en el propio Diario Oficial de la Federacion el 12 de junio de 2003; 17-H Bis, primer parrafo, fraccion IX y 33, ultimo parrafo, del Codigo Fiscal de la Federacion, le comunica lo siguiente:</p>
</div>

<div class="section">
    <p>Derivado del ejercicio de las facultades conferidas en terminos de las disposiciones fiscales vigentes, esta Administracion Desconcentrada de Auditoria Fiscal de Sinaloa "1" con sede en Sinaloa, del analisis realizado con fecha {{fecha_analisis}}, a la informacion contenida en las bases de datos del sistema denominado Consulta de Factura Electronica (Consulta Central CFDI) del Servicio de Administracion Tributaria y al sistema denominado Controles Volumetricos-Empleado, a los cual tiene acceso esta autoridad, y que utiliza de conformidad con el articulo 63, parrafos primero y ultimo del Codigo Fiscal de la Federacion vigente, advirtio que ese contribuyente actualizo la conducta senalada en el articulo 17-H Bis, primer parrafo, fraccion IX del Codigo Fiscal de la Federacion vigente.</p>
</div>

<div class="section">
    <p>Por las consideraciones que enseguida se detallan:</p>
    <h2 class="underline center">{{ejercicio_fiscal}}</h2>
    <p><strong>1.-</strong> Del analisis realizado a las bases de datos del sistema denominado Consulta de Facturas Electronicas (Consulta Central CFDI) del Servicio de Administracion Tributaria, al cual tiene acceso esta autoridad, informacion que se presume cierta y se utiliza de conformidad con el articulo 63, parrafos primero y ultimo del Codigo Fiscal de la Federacion vigente, advirtio que esa contribuyente dentro de los periodos comprendidos de {{periodo_inicio}} a {{periodo_fin}}, emitio Comprobantes Fiscales Digitales por Internet con efecto ingreso en cantidad de {{monto_total}} de acuerdo a lo siguiente.</p>
</div>

<div class="section">
    <p>Finalmente, se hace de su conocimiento que, de no presentar el caso de aclaracion para subsanar las irregularidades detectadas, o bien, para desvirtuar las causas que motivaron la restriccion temporal del uso de su certificado o certificados de sello digital para la expedicion de comprobantes fiscales por Internet dentro del plazo de cuarenta dias habiles antes senalado, se procedera a dejar sin efectos el mismo, de conformidad con el articulo 17-H Bis, ultimo parrafo del Codigo Fiscal de la Federacion.</p>
</div>
`;
                const csdPlaceholders = JSON.stringify([
                    { key: 'razon_social', label: 'Razon Social', type: 'text', source: 'client', client_field: 'razon_social' },
                    { key: 'rfc', label: 'RFC', type: 'text', source: 'client', client_field: 'rfc' },
                    { key: 'domicilio', label: 'Domicilio', type: 'text', source: 'client', client_field: 'domicilio' },
                    { key: 'codigo_postal', label: 'Codigo Postal', type: 'text', source: 'client', client_field: 'codigo_postal' },
                    { key: 'estado', label: 'Estado', type: 'text', source: 'client', client_field: 'estado' },
                    { key: 'fecha_actual', label: 'Fecha Actual', type: 'date', source: 'client' },
                    { key: 'oficio_numero', label: 'Numero de Oficio', type: 'text', source: 'manual' },
                    { key: 'folio', label: 'Folio', type: 'text', source: 'manual' },
                    { key: 'encabezado_administracion', label: 'Encabezado Administracion', type: 'text', source: 'manual' },
                    { key: 'colonia', label: 'Colonia', type: 'text', source: 'manual' },
                    { key: 'ciudad', label: 'Ciudad', type: 'text', source: 'manual' },
                    { key: 'fecha_analisis', label: 'Fecha de Analisis', type: 'date', source: 'manual' },
                    { key: 'ejercicio_fiscal', label: 'Ejercicio Fiscal', type: 'text', source: 'manual' },
                    { key: 'periodo_inicio', label: 'Periodo Inicio', type: 'text', source: 'manual' },
                    { key: 'periodo_fin', label: 'Periodo Fin', type: 'text', source: 'manual' },
                    { key: 'monto_total', label: 'Monto Total', type: 'currency', source: 'manual' },
                    { key: 'firmante_nombre', label: 'Nombre del Firmante', type: 'text', source: 'manual' },
                    { key: 'firmante_cargo', label: 'Cargo del Firmante', type: 'text', source: 'manual' },
                ]);

                await client.query(
                    `INSERT INTO document_templates (name, description, category, html_content, placeholders, created_by)
                     VALUES ($1, $2, $3, $4, $5, $6)`,
                    [
                        'Restriccion Temporal CSD - Art. 17-H Bis',
                        'Comunicacion de restriccion temporal de certificado de sello digital conforme al articulo 17-H Bis del CFF',
                        'restriccion_csd',
                        csdHtml,
                        csdPlaceholders,
                        consultorId,
                    ]
                );
                console.log('✅ Plantilla "Restriccion Temporal CSD" creada exitosamente');
            }

            // Verify
            const result = await client.query(`SELECT id, name, category FROM document_templates WHERE is_active = true ORDER BY name`);
            console.log(`\n📋 Plantillas disponibles (${result.rows.length}):`);
            result.rows.forEach((row: any) => {
                console.log(`   - [${row.category}] ${row.name}`);
            });

        } finally {
            client.release();
        }
    } catch (e) {
        console.error('Seed error:', e);
        process.exit(1);
    } finally {
        await pool.end();
        process.exit(0);
    }
}

seed();
