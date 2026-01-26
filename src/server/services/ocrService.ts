import Tesseract from 'tesseract.js';
import sharp from 'sharp';
import fs from 'fs';

// Interface para datos fiscales extraidos por OCR
export interface FiscalDataOCR {
    rfc: string;
    curp: string | null;
    nombre: string;
    tipoPersona: 'fisica' | 'moral';
    regimenFiscal: string | null;
    codigoRegimen: string | null;
    domicilio: {
        calle: string | null;
        numeroExterior: string | null;
        numeroInterior: string | null;
        colonia: string | null;
        municipio: string | null;
        estado: string | null;
        codigoPostal: string | null;
    };
    fechaInicioOperaciones: string | null;
    estatusRFC: string | null;
    confianza: number;
}

export interface OCRResult {
    success: boolean;
    data?: FiscalDataOCR;
    rawText?: string;
    error?: string;
}

// Worker singleton para reutilizar
let worker: Tesseract.Worker | null = null;

async function getWorker(): Promise<Tesseract.Worker> {
    if (!worker) {
        worker = await Tesseract.createWorker('spa', 1, {
            logger: (m: { status: string; progress: number }) => {
                if (m.status === 'recognizing text') {
                    console.log(`[OCR] Procesando: ${Math.round(m.progress * 100)}%`);
                }
            }
        });
    }
    return worker;
}

// Limpiar worker al cerrar servidor
process.on('SIGTERM', async () => {
    if (worker) {
        await worker.terminate();
        worker = null;
    }
});

process.on('SIGINT', async () => {
    if (worker) {
        await worker.terminate();
        worker = null;
    }
});

/**
 * Preprocesa la imagen para mejorar la precision del OCR
 */
export async function preprocessImage(imagePath: string): Promise<Buffer> {
    const image = sharp(imagePath);
    const metadata = await image.metadata();

    let pipeline = image
        // Rotar automaticamente segun EXIF
        .rotate()
        // Convertir a escala de grises
        .grayscale()
        // Aumentar contraste
        .normalize()
        // Aumentar nitidez
        .sharpen();

    // Redimensionar si la imagen es muy pequena (OCR funciona mejor con imagenes grandes)
    if (metadata.width && metadata.width < 1500) {
        pipeline = pipeline.resize({
            width: 2000,
            fit: 'inside',
            withoutEnlargement: false,
        });
    }

    // Aplicar threshold para binarizar (mejora lectura de texto)
    pipeline = pipeline.threshold(140);

    return pipeline.toBuffer();
}

/**
 * Extrae datos fiscales del texto usando expresiones regulares
 */
export function extractFiscalData(text: string): Partial<FiscalDataOCR> {
    const normalizedText = text
        .replace(/\r\n/g, '\n')
        .replace(/\s+/g, ' ')
        .trim();

    // RFC - Persona Fisica (13 chars) o Moral (12 chars)
    const rfcMatch = text.match(/RFC[:\s]*([A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3})/i) ||
                     text.match(/([A-ZÑ&]{4}\d{6}[A-Z0-9]{3})/i) ||
                     text.match(/([A-ZÑ&]{3}\d{6}[A-Z0-9]{3})/i);
    const rfc = rfcMatch ? rfcMatch[1].toUpperCase() : '';

    // Determinar tipo de persona por longitud del RFC
    const tipoPersona: 'fisica' | 'moral' = rfc.length === 13 ? 'fisica' : 'moral';

    // CURP (solo personas fisicas, 18 caracteres)
    const curpMatch = text.match(/CURP[:\s]*([A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z0-9]\d)/i) ||
                      text.match(/([A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z0-9]\d)/i);
    const curp = curpMatch ? curpMatch[1].toUpperCase() : null;

    // Nombre o Razon Social
    const nombreMatch = text.match(/(?:Nombre|Denominaci[oó]n|Raz[oó]n\s*Social)[:\s]*([^\n]+)/i) ||
                        text.match(/(?:NOMBRE|DENOMINACIÓN|RAZÓN\s*SOCIAL)[:\s]*([^\n]+)/i);
    let nombre = nombreMatch ? nombreMatch[1].trim() : '';
    // Limpiar nombre de caracteres extra
    nombre = nombre.replace(/^\s*[:|\-]\s*/, '').trim();

    // Regimen Fiscal (codigo y descripcion)
    const regimenMatch = text.match(/R[eé]gimen[:\s]*(?:Fiscal)?[:\s]*(\d{3})?[:\s\-]*([^\n]+)?/i);
    let regimenFiscal = regimenMatch ? (regimenMatch[2] || '').trim() : null;
    let codigoRegimen = regimenMatch ? (regimenMatch[1] || null) : null;

    // Buscar codigo de regimen si no se encontro
    if (!codigoRegimen) {
        const codigoMatch = text.match(/(\d{3})\s*[-–]\s*(?:Sueldos|Actividades|Arrendamiento|Enajenaci|Intereses|Dividendos|Régimen)/i);
        if (codigoMatch) {
            codigoRegimen = codigoMatch[1];
        }
    }

    // Codigo Postal
    const cpMatch = text.match(/C[oó]digo\s*Postal[:\s]*(\d{5})/i) ||
                    text.match(/CP[:\s]*(\d{5})/i) ||
                    text.match(/(\d{5})/);
    const codigoPostal = cpMatch ? cpMatch[1] : null;

    // Estado / Entidad Federativa
    const estadoMatch = text.match(/(?:Entidad\s*Federativa|Estado)[:\s]*([A-ZÁÉÍÓÚÑ][a-záéíóúñ\s]+)/i);
    const estado = estadoMatch ? estadoMatch[1].trim() : null;

    // Calle
    const calleMatch = text.match(/(?:Calle|Nombre\s*(?:de\s*(?:la\s*)?)?Vialidad)[:\s]*([^\n,]+)/i);
    const calle = calleMatch ? calleMatch[1].trim() : null;

    // Numero Exterior
    const numExtMatch = text.match(/N[uú]mero\s*Exterior[:\s]*([^\n,]+)/i) ||
                        text.match(/No\.\s*Ext[:\s]*([^\n,]+)/i);
    const numeroExterior = numExtMatch ? numExtMatch[1].trim() : null;

    // Numero Interior
    const numIntMatch = text.match(/N[uú]mero\s*Interior[:\s]*([^\n,]+)/i) ||
                        text.match(/No\.\s*Int[:\s]*([^\n,]+)/i);
    const numeroInterior = numIntMatch ? numIntMatch[1].trim() : null;

    // Colonia
    const coloniaMatch = text.match(/Colonia[:\s]*([^\n,]+)/i);
    const colonia = coloniaMatch ? coloniaMatch[1].trim() : null;

    // Municipio / Delegacion / Alcaldia
    const municipioMatch = text.match(/(?:Municipio|Delegaci[oó]n|Alcald[ií]a)[:\s]*([^\n,]+)/i);
    const municipio = municipioMatch ? municipioMatch[1].trim() : null;

    // Fecha de inicio de operaciones
    const fechaMatch = text.match(/Fecha\s*(?:de\s*)?Inicio\s*(?:de\s*)?Operaciones[:\s]*(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})/i) ||
                       text.match(/Inicio\s*Operaciones[:\s]*(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})/i);
    const fechaInicioOperaciones = fechaMatch ? fechaMatch[1] : null;

    // Estatus en el padron
    const estatusMatch = text.match(/(?:Estatus|Estado)\s*(?:en\s*el\s*)?(?:padr[oó]n|RFC)[:\s]*([A-Za-záéíóúñ]+)/i);
    const estatusRFC = estatusMatch ? estatusMatch[1].trim() : null;

    return {
        rfc,
        curp,
        nombre,
        tipoPersona,
        regimenFiscal,
        codigoRegimen,
        domicilio: {
            calle,
            numeroExterior,
            numeroInterior,
            colonia,
            municipio,
            estado,
            codigoPostal,
        },
        fechaInicioOperaciones,
        estatusRFC,
    };
}

/**
 * Procesa un documento fiscal (imagen) y extrae los datos via OCR
 */
export async function processFiscalDocument(imagePath: string): Promise<OCRResult> {
    try {
        // Verificar que el archivo existe
        if (!fs.existsSync(imagePath)) {
            return {
                success: false,
                error: 'El archivo no existe',
            };
        }

        console.log('[OCR] Preprocesando imagen...');

        // Preprocesar imagen para mejorar OCR
        const processedImage = await preprocessImage(imagePath);

        console.log('[OCR] Ejecutando reconocimiento de texto...');

        // Obtener worker y ejecutar OCR
        const ocrWorker = await getWorker();
        const result = await ocrWorker.recognize(processedImage);

        const rawText = result.data.text;
        const confidence = result.data.confidence;

        console.log(`[OCR] Completado. Confianza: ${confidence}%`);
        console.log('[OCR] Texto extraido:', rawText.substring(0, 500) + '...');

        // Verificar confianza minima
        if (confidence < 40) {
            return {
                success: false,
                error: 'La calidad de la imagen es muy baja. Por favor tome una foto mas clara con buena iluminacion.',
                rawText,
            };
        }

        // Extraer datos del texto
        const extractedData = extractFiscalData(rawText);

        // Verificar que al menos se extrajo el RFC
        if (!extractedData.rfc) {
            return {
                success: false,
                error: 'No se pudo detectar el RFC en el documento. Asegurese de que sea una Constancia de Situacion Fiscal valida y que la imagen sea legible.',
                rawText,
            };
        }

        // Validar formato de RFC
        const rfcFisicaRegex = /^[A-ZÑ&]{4}\d{6}[A-Z0-9]{3}$/;
        const rfcMoralRegex = /^[A-ZÑ&]{3}\d{6}[A-Z0-9]{3}$/;

        if (!rfcFisicaRegex.test(extractedData.rfc) && !rfcMoralRegex.test(extractedData.rfc)) {
            return {
                success: false,
                error: `El RFC detectado (${extractedData.rfc}) no tiene un formato valido. Por favor verifique la imagen.`,
                rawText,
            };
        }

        const fiscalData: FiscalDataOCR = {
            rfc: extractedData.rfc,
            curp: extractedData.curp || null,
            nombre: extractedData.nombre || '',
            tipoPersona: extractedData.tipoPersona || 'fisica',
            regimenFiscal: extractedData.regimenFiscal || null,
            codigoRegimen: extractedData.codigoRegimen || null,
            domicilio: extractedData.domicilio || {
                calle: null,
                numeroExterior: null,
                numeroInterior: null,
                colonia: null,
                municipio: null,
                estado: null,
                codigoPostal: null,
            },
            fechaInicioOperaciones: extractedData.fechaInicioOperaciones || null,
            estatusRFC: extractedData.estatusRFC || null,
            confianza: Math.round(confidence),
        };

        return {
            success: true,
            data: fiscalData,
            rawText,
        };

    } catch (error: any) {
        console.error('[OCR] Error procesando documento:', error);
        return {
            success: false,
            error: error.message || 'Error al procesar el documento',
        };
    }
}
