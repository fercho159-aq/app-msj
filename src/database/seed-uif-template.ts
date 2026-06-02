import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_hdwNBR08oOcV@ep-plain-king-ahntrqco-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require';

const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });

async function seed() {
    try {
        const client = await pool.connect();
        try {
            const consultor = await client.query(
                `SELECT id FROM users WHERE COALESCE(role, 'usuario') = 'consultor' LIMIT 1`
            );
            if (consultor.rows.length === 0) {
                console.error('No hay usuarios consultores. Crea uno primero.');
                process.exit(1);
            }
            const consultorId = consultor.rows[0].id;

            const existing = await client.query(
                `SELECT id FROM document_templates WHERE category = 'solicitud_uif' LIMIT 1`
            );
            if (existing.rows.length > 0) {
                console.log('La plantilla de solicitud a UIF ya existe.');
                process.exit(0);
            }

            const htmlContent = `
<div class="section">
    <p><strong>Asunto:</strong> Solicitud de preparacion de carpeta de investigacion respecto del contribuyente <strong>{{razon_social}}</strong>, con RFC <strong>{{rfc}}</strong>.</p>
    <p class="right">Culiacan Rosales, Sinaloa, {{fecha_actual}}</p>
</div>

<div class="section">
    <p><strong>C. TITULAR DE LA UNIDAD DE INTELIGENCIA FINANCIERA</strong></p>
    <p><strong>SECRETARIA DE HACIENDA Y CREDITO PUBLICO</strong></p>
    <p>Insurgentes Sur No. 1971, Torre Sur, Piso 7</p>
    <p>Colonia Guadalupe Inn, C.P. 01020</p>
    <p>Ciudad de Mexico.</p>
</div>

<div class="section">
    <p>Esta Administracion Desconcentrada de Auditoria Fiscal de Sinaloa "1", con sede en Sinaloa, de la Administracion General de Auditoria Fiscal Federal del Servicio de Administracion Tributaria, con fundamento en lo dispuesto en los articulos 16 de la Constitucion Politica de los Estados Unidos Mexicanos; 1, 7, fracciones I, VII y XVIII, y 8, fraccion III de la Ley del Servicio de Administracion Tributaria, publicada en el Diario Oficial de la Federacion el 15 de diciembre de 1995, reformada por Decreto publicado en el propio Diario Oficial de la Federacion el 12 de junio de 2003; 42, fracciones I, II y III, y 63, parrafos primero y ultimo del Codigo Fiscal de la Federacion vigente; y 15, fraccion III, 15 Bis, fraccion I, y demas disposiciones aplicables del Reglamento Interior de la Secretaria de Hacienda y Credito Publico; en ejercicio de las facultades que le han sido conferidas mediante los articulos 1, 2, parrafos primero, apartado C y segundo, 5, parrafo tercero, 6, parrafo primero, apartado A, fraccion XXIV, inciso a), 14, fraccion VI, 22, parrafo segundo, en relacion con el articulo 30, parrafo primero, apartado B, fraccion X, del Reglamento Interior del Servicio de Administracion Tributaria, publicado en el Diario Oficial de la Federacion el 24 de agosto de 2015, vigente a partir del 22 de noviembre de 2015, respetuosamente <strong>SOLICITA</strong> a esa H. Unidad de Inteligencia Financiera lo siguiente:</p>
</div>

<div class="section">
    <h3>I. ANTECEDENTES</h3>
    <p>En uso de las facultades de comprobacion conferidas a este organo administrativo, se inicio el ejercicio de revision al contribuyente que a continuacion se identifica:</p>
    <div class="indent">
        <p><strong>Nombre o Razon Social:</strong> {{razon_social}}</p>
        <p><strong>Registro Federal de Contribuyentes:</strong> {{rfc}}</p>
        <p><strong>Domicilio Fiscal:</strong> {{domicilio}}, Colonia {{colonia}}, {{ciudad}}, C.P. {{codigo_postal}}, {{estado}}.</p>
        <p><strong>Ejercicio(s) fiscal(es) revisado(s):</strong> {{ejercicio_fiscal}}</p>
        <p><strong>Tipo de contribuyente:</strong> {{tipo_contribuyente}}</p>
    </div>
</div>

<div class="section">
    <h3>II. HECHOS Y MOTIVOS QUE ORIGINAN LA SOLICITUD</h3>
    <p>Del analisis realizado a la informacion contenida en las bases de datos del Servicio de Administracion Tributaria, incluyendo el sistema de Consulta de Factura Electronica (Consulta Central CFDI), asi como de la revision de declaraciones fiscales y demas informacion en poder de esta autoridad, se advirtio lo siguiente:</p>
    <div class="indent">
        <p>{{descripcion_hechos}}</p>
    </div>
    <p>Las conductas descritas son compatibles con posibles operaciones con recursos de procedencia ilicita, en terminos de lo previsto por la Ley Federal para la Prevencion e Identificacion de Operaciones con Recursos de Procedencia Ilicita y demas disposiciones aplicables.</p>
</div>

<div class="section">
    <h3>III. OBJETO DE LA SOLICITUD</h3>
    <p>En virtud de los antecedentes y hechos descritos en los apartados que anteceden, y con fundamento en el articulo 63 del Codigo Fiscal de la Federacion vigente, asi como en las disposiciones del Reglamento Interior de la Secretaria de Hacienda y Credito Publico que regulan las funciones de esa Unidad de Inteligencia Financiera y el Convenio de Colaboracion Interinstitucional suscrito entre el Servicio de Administracion Tributaria y la Secretaria de Hacienda y Credito Publico, se solicita respetuosamente a esa Unidad de Inteligencia Financiera:</p>
    <div class="indent">
        <p><strong>a)</strong> Preparar la carpeta de investigacion correspondiente al contribuyente <strong>{{razon_social}}</strong> con RFC <strong>{{rfc}}</strong>, por los ejercicios fiscales {{ejercicio_fiscal}}, con base en la informacion con que cuente esa Unidad respecto de reportes de operaciones relevantes, inusuales o de 24 horas, asi como cualquier otro antecedente en sus sistemas.</p>
        <p><strong>b)</strong> Proporcionar a esta autoridad la informacion financiera e indicios de operaciones presuntamente vinculadas con recursos de procedencia ilicita que obren en poder de esa Unidad de Inteligencia Financiera, en los terminos del convenio de colaboracion e intercambio de informacion suscrito entre la Secretaria de Hacienda y Credito Publico y el Servicio de Administracion Tributaria.</p>
        <p><strong>c)</strong> Hacer del conocimiento de esta autoridad la existencia de cualquier alerta, reporte o antecedente que pudiera resultar relevante para el ejercicio de las facultades de comprobacion en curso.</p>
    </div>
</div>

<div class="section">
    <h3>IV. FUNDAMENTO LEGAL</h3>
    <p>La presente solicitud se formula con apoyo en las disposiciones siguientes:</p>
    <div class="indent">
        <p><strong>Articulo 16 Constitucional:</strong> Que faculta a las autoridades competentes para practicar investigaciones en el ambito de sus atribuciones legales y exige que todo acto de molestia sea emitido por autoridad competente y debidamente fundado y motivado.</p>
        <p><strong>Articulos 7, fracciones I, VII y XVIII, y 8, fraccion III de la Ley del Servicio de Administracion Tributaria:</strong> Que otorgan al Servicio de Administracion Tributaria las atribuciones para fiscalizar el cumplimiento de las obligaciones fiscales y coordinarse con otras unidades administrativas de la Secretaria de Hacienda y Credito Publico, incluyendo sus organos desconcentrados y unidades administrativas especializadas.</p>
        <p><strong>Articulo 42, fracciones I, II y III del Codigo Fiscal de la Federacion:</strong> Que confieren a las autoridades fiscales facultades de comprobacion para verificar el cumplimiento de las disposiciones fiscales mediante la revision de declaraciones, contabilidad y demas informacion que acredite el correcto cumplimiento de obligaciones fiscales.</p>
        <p><strong>Articulo 63, parrafos primero y ultimo, del Codigo Fiscal de la Federacion:</strong> Que permite expresamente a las autoridades fiscales allegarse de toda la informacion y documentacion que obre en poder de otras autoridades y que resulte necesaria para la determinacion de la situacion fiscal del contribuyente, presumiendose como cierta la informacion y documentacion obtenida de terceras autoridades.</p>
        <p><strong>Articulos 15, fraccion III, y 15 Bis, fraccion I, del Reglamento Interior de la Secretaria de Hacienda y Credito Publico:</strong> Que establecen las funciones de la Unidad de Inteligencia Financiera en materia de recepcion, analisis y diseminacion de informacion sobre operaciones que pudieran estar relacionadas con recursos de procedencia ilicita, y la facultad de dicha Unidad para intercambiar informacion con otras autoridades competentes en el ambito de sus respectivas atribuciones.</p>
        <p><strong>Convenio de Colaboracion Interinstitucional entre el Servicio de Administracion Tributaria y la Secretaria de Hacienda y Credito Publico:</strong> Que instrumenta los mecanismos de coordinacion, intercambio de informacion y asistencia mutua entre ambas autoridades para el combate a la evasion fiscal, al lavado de dinero y a la economia informal.</p>
        <p><strong>Ley Federal para la Prevencion e Identificacion de Operaciones con Recursos de Procedencia Ilicita (LFPIORPI), publicada en el DOF el 17 de octubre de 2012, con ultima reforma publicada el 16 de julio de 2025:</strong> Que constituye el marco normativo general en materia de prevencion e identificacion de operaciones con recursos de procedencia ilicita, en cuyo ambito la Unidad de Inteligencia Financiera ejerce sus funciones de inteligencia financiera.</p>
        <p><strong>Articulo 69 del Codigo Fiscal de la Federacion:</strong> Que establece el caracter reservado de la informacion fiscal de los contribuyentes y que autoriza su utilizacion por parte de las autoridades fiscales en el ejercicio de sus facultades, garantizando que la informacion que sea proporcionada en atencion a la presente solicitud sera tratada con estricta confidencialidad.</p>
    </div>
</div>

<div class="section">
    <p>La informacion que sea proporcionada en atencion a la presente solicitud sera utilizada exclusivamente para el ejercicio de las facultades de comprobacion en terminos del Codigo Fiscal de la Federacion y sera tratada con la confidencialidad que establecen los articulos 63, ultimo parrafo, y 69 del propio Codigo, asi como demas disposiciones aplicables en materia de proteccion y reserva de la informacion fiscal.</p>
</div>

<div class="section">
    <p>Asimismo, se hace de su conocimiento que la presente solicitud se formula en el contexto del ejercicio de facultades de comprobacion que se encuentran debidamente notificadas al contribuyente, de conformidad con las disposiciones del Codigo Fiscal de la Federacion, por lo que la informacion requerida es indispensable para la correcta determinacion de la situacion fiscal del contribuyente y para el combate a la evasion fiscal y al uso de recursos de procedencia ilicita.</p>
</div>

<div class="section">
    <p>Se solicita atentamente dar atencion a la presente en un plazo de <strong>{{plazo_dias}} dias habiles</strong> contados a partir de la recepcion del presente oficio, a efecto de no interrumpir el ejercicio de las facultades de comprobacion en curso.</p>
</div>

<div class="section">
    <p>Sin otro particular, aprovecho la ocasion para enviarle un cordial saludo.</p>
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
                { key: 'ejercicio_fiscal', label: 'Ejercicio(s) Fiscal(es) (ej: 2022 y 2023)', type: 'text', source: 'manual' },
                { key: 'tipo_contribuyente', label: 'Tipo de Contribuyente (ej: Persona Moral del Regimen General)', type: 'text', source: 'manual' },
                { key: 'descripcion_hechos', label: 'Descripcion de los Hechos que Motivan la Solicitud', type: 'text', source: 'manual' },
                { key: 'plazo_dias', label: 'Plazo de Respuesta en Dias Habiles', type: 'number', source: 'manual' },
                { key: 'firmante_nombre', label: 'Nombre del Firmante', type: 'text', source: 'manual' },
                { key: 'firmante_cargo', label: 'Cargo del Firmante', type: 'text', source: 'manual' },
            ]);

            await client.query(
                `INSERT INTO document_templates (name, description, category, html_content, placeholders, created_by)
                 VALUES ($1, $2, $3, $4, $5, $6)`,
                [
                    'Solicitud a UIF - Carpeta de Investigacion',
                    'Oficio del SAT a la Unidad de Inteligencia Financiera (SHCP) solicitando la preparacion de carpeta de investigacion de un contribuyente, con fundamento en los articulos 42 y 63 del CFF, Ley del SAT 7 y 8, y Reglamento Interior SHCP arts. 15 y 15 Bis',
                    'solicitud_uif',
                    htmlContent,
                    placeholders,
                    consultorId,
                ]
            );

            console.log('✅ Plantilla "Solicitud a UIF - Carpeta de Investigacion" creada exitosamente');

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
