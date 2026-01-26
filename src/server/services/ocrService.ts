import Tesseract from 'tesseract.js';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

// Dynamically import pdf-parse for PDF text extraction
let pdfParse: any = null;
const getPdfParse = async () => {
    if (!pdfParse) {
        try {
            pdfParse = (await import('pdf-parse')).default;
        } catch (e) {
            console.warn('[OCR] pdf-parse not available, PDFs will use image conversion only');
        }
    }
    return pdfParse;
};

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
    // Limpiar nombre de caracteres extra y artefactos del OCR
    nombre = nombre
        .replace(/^\s*[:|\-]\s*/, '')
        .replace(/^\s*\([sS]\)[:\s]*/g, '')  // Remover "(s):" al inicio
        .replace(/^\s*\(\s*[sS]\s*\)[:\s]*/g, '')  // Remover "( s ):" variantes
        .replace(/^\s*[sS]\s*\)[:\s]*/g, '')  // Remover "s):" si OCR fallo el parentesis
        .replace(/^\s*\([^)]*\)[:\s]*/g, '')  // Remover cualquier parentesis al inicio
        .replace(/^\s*[:\-|]\s*/g, '')  // Remover caracteres especiales al inicio
        .trim();

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
    // Buscar estado y limpiar texto que no corresponde (como "Entre Calle", "Nombre de", etc.)
    const estadoMatch = text.match(/(?:Entidad\s*Federativa|Estado)[:\s]*([A-ZÁÉÍÓÚÑ][A-Za-záéíóúñ\s]+?)(?=\s+(?:Entre|Calle|Nombre|Numero|No\.|Col|C\.P\.|Codigo|$|\n))/i) ||
                        text.match(/(?:Entidad\s*Federativa)[:\s]*([A-ZÁÉÍÓÚÑ][A-Za-záéíóúñ\s]+)/i);
    let estado = estadoMatch ? estadoMatch[1].trim() : null;

    // Lista de estados validos de Mexico para validacion
    const estadosValidos = [
        'AGUASCALIENTES', 'BAJA CALIFORNIA', 'BAJA CALIFORNIA SUR', 'CAMPECHE',
        'CHIAPAS', 'CHIHUAHUA', 'CIUDAD DE MEXICO', 'CDMX', 'COAHUILA', 'COLIMA',
        'DURANGO', 'ESTADO DE MEXICO', 'GUANAJUATO', 'GUERRERO', 'HIDALGO', 'JALISCO',
        'MICHOACAN', 'MORELOS', 'NAYARIT', 'NUEVO LEON', 'OAXACA', 'PUEBLA',
        'QUERETARO', 'QUINTANA ROO', 'SAN LUIS POTOSI', 'SINALOA', 'SONORA',
        'TABASCO', 'TAMAULIPAS', 'TLAXCALA', 'VERACRUZ', 'YUCATAN', 'ZACATECAS'
    ];

    // Si el estado extraido contiene palabras de direccion, cortarlo
    if (estado) {
        estado = estado
            .replace(/\s+Entre.*$/i, '')
            .replace(/\s+Calle.*$/i, '')
            .replace(/\s+Nombre.*$/i, '')
            .replace(/\s+Numero.*$/i, '')
            .replace(/\s+No\..*$/i, '')
            .replace(/\s+Vialidad.*$/i, '')
            .trim();

        // Normalizar a mayusculas para comparar
        const estadoUpper = estado.toUpperCase()
            .replace(/Á/g, 'A').replace(/É/g, 'E').replace(/Í/g, 'I')
            .replace(/Ó/g, 'O').replace(/Ú/g, 'U');

        // Si no coincide con ningun estado valido, intentar encontrar uno
        if (!estadosValidos.some(e => estadoUpper.includes(e) || e.includes(estadoUpper))) {
            // Buscar en el texto un estado valido
            for (const estadoValido of estadosValidos) {
                if (text.toUpperCase().includes(estadoValido)) {
                    estado = estadoValido;
                    break;
                }
            }
        }
    }

    // Calle / Nombre de Vialidad
    const calleMatch = text.match(/(?:Nombre\s*(?:de\s*(?:la\s*)?)?Vialidad|Calle)[:\s]*([A-ZÁÉÍÓÚÑ][A-Za-záéíóúñ0-9\s]+?)(?=\s+(?:Numero|No\.|Ext|Int|Col|\d|$|\n))/i) ||
                       text.match(/(?:Calle|Nombre\s*(?:de\s*)?Vialidad)[:\s]*([^\n,]+)/i);
    let calle = calleMatch ? calleMatch[1].trim() : null;
    // Limpiar la calle de artefactos
    if (calle) {
        calle = calle
            .replace(/\s*Numero.*$/i, '')
            .replace(/\s*No\..*$/i, '')
            .replace(/\s*,.*$/i, '')
            .replace(/\s+$/, '')
            .trim();
    }

    // Numero Exterior
    const numExtMatch = text.match(/N[uú]mero\s*Exterior[:\s]*([A-Za-z0-9\-#]+)/i) ||
                        text.match(/No\.\s*Ext[.:\s]*([A-Za-z0-9\-#]+)/i) ||
                        text.match(/Exterior[:\s]*(\d+[A-Za-z]?)/i);
    let numeroExterior = numExtMatch ? numExtMatch[1].trim() : null;
    // Limpiar numero exterior
    if (numeroExterior) {
        numeroExterior = numeroExterior.replace(/[,\s].*$/, '').trim();
    }

    // Numero Interior
    const numIntMatch = text.match(/N[uú]mero\s*Interior[:\s]*([A-Za-z0-9\-#]+)/i) ||
                        text.match(/No\.\s*Int[.:\s]*([A-Za-z0-9\-#]+)/i) ||
                        text.match(/Interior[:\s]*([A-Za-z0-9\-#]+)/i) ||
                        text.match(/Int[.:\s]*([A-Za-z0-9\-#]+)/i);
    let numeroInterior = numIntMatch ? numIntMatch[1].trim() : null;
    // Limpiar numero interior
    if (numeroInterior) {
        numeroInterior = numeroInterior.replace(/[,\s].*$/, '').trim();
        // Si es solo un punto o guion, ignorarlo
        if (numeroInterior === '.' || numeroInterior === '-' || numeroInterior === '#') {
            numeroInterior = null;
        }
    }

    // Colonia
    const coloniaMatch = text.match(/(?:Nombre\s*(?:de\s*(?:la\s*)?)?)?Colonia[:\s]*([A-ZÁÉÍÓÚÑ][A-Za-záéíóúñ0-9\s]+?)(?=\s+(?:C\.P\.|Codigo|CP|\d{5}|Municipio|Delegaci|Alcald|$|\n))/i) ||
                         text.match(/Colonia[:\s]*([^\n,]+)/i) ||
                         text.match(/Col\.[:\s]*([^\n,]+)/i);
    let colonia = coloniaMatch ? coloniaMatch[1].trim() : null;
    // Limpiar colonia
    if (colonia) {
        colonia = colonia
            .replace(/\s*C\.P\..*$/i, '')
            .replace(/\s*CP.*$/i, '')
            .replace(/\s*Codigo.*$/i, '')
            .replace(/\s*Municipio.*$/i, '')
            .replace(/\s*Delegaci.*$/i, '')
            .replace(/\s*Alcald.*$/i, '')
            .replace(/\s*,.*$/i, '')
            .replace(/\s*o\s*Demarcaci.*$/i, '')
            .trim();
    }

    // Municipio / Delegacion / Alcaldia / Demarcacion Territorial
    const municipioMatch = text.match(/(?:Municipio|Delegaci[oó]n|Alcald[ií]a|Demarcaci[oó]n\s*Territorial)[:\s]*([A-ZÁÉÍÓÚÑ][A-Za-záéíóúñ\s]+?)(?=\s+(?:Entidad|Estado|C\.P\.|$|\n))/i) ||
                           text.match(/(?:Municipio|Delegaci[oó]n|Alcald[ií]a)[:\s]*([^\n,]+)/i);
    let municipio = municipioMatch ? municipioMatch[1].trim() : null;
    // Limpiar municipio
    if (municipio) {
        municipio = municipio
            .replace(/\s*Entidad.*$/i, '')
            .replace(/\s*Estado.*$/i, '')
            .replace(/\s*C\.P\..*$/i, '')
            .replace(/\s*,.*$/i, '')
            .trim();
    }

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
 * Procesa un archivo PDF y extrae el texto
 */
async function processPDF(pdfPath: string): Promise<{ text: string; confidence: number } | null> {
    try {
        const parser = await getPdfParse();
        if (!parser) {
            console.log('[OCR] pdf-parse no disponible');
            return null;
        }

        const dataBuffer = fs.readFileSync(pdfPath);
        const data = await parser(dataBuffer);

        if (data.text && data.text.trim().length > 100) {
            console.log(`[OCR] PDF texto extraido directamente (${data.text.length} caracteres)`);
            // PDFs con texto embebido tienen alta confianza
            return {
                text: data.text,
                confidence: 95,
            };
        }

        console.log('[OCR] PDF no tiene texto suficiente, intentando OCR...');
        return null;
    } catch (error) {
        console.error('[OCR] Error procesando PDF:', error);
        return null;
    }
}

/**
 * Convierte la primera pagina de un PDF a imagen para OCR
 */
async function convertPDFToImage(pdfPath: string): Promise<string | null> {
    try {
        // Try using poppler-utils via command line if available
        const { execSync } = require('child_process');
        const outputPath = pdfPath.replace('.pdf', '-page1.png');

        try {
            // Check if pdftoppm is available (poppler-utils)
            execSync('which pdftoppm', { stdio: 'ignore' });

            // Convert first page of PDF to PNG
            execSync(`pdftoppm -png -f 1 -l 1 -r 300 "${pdfPath}" "${pdfPath.replace('.pdf', '')}"`, {
                timeout: 30000,
            });

            // pdftoppm adds -1.png suffix
            const generatedFile = pdfPath.replace('.pdf', '-1.png');
            if (fs.existsSync(generatedFile)) {
                // Rename to expected output path
                fs.renameSync(generatedFile, outputPath);
                console.log(`[OCR] PDF convertido a imagen: ${outputPath}`);
                return outputPath;
            }
        } catch (e) {
            console.log('[OCR] pdftoppm no disponible, intentando metodo alternativo...');
        }

        // Fallback: Try using sharp's PDF support (requires libvips with PDF support)
        try {
            await sharp(pdfPath, { page: 0, density: 300 })
                .png()
                .toFile(outputPath);
            console.log(`[OCR] PDF convertido a imagen con sharp: ${outputPath}`);
            return outputPath;
        } catch (sharpError) {
            console.log('[OCR] sharp no puede procesar PDF:', sharpError);
        }

        return null;
    } catch (error) {
        console.error('[OCR] Error convirtiendo PDF a imagen:', error);
        return null;
    }
}

/**
 * Procesa un documento fiscal (imagen o PDF) y extrae los datos via OCR
 */
export async function processFiscalDocument(filePath: string): Promise<OCRResult> {
    try {
        // Verificar que el archivo existe
        if (!fs.existsSync(filePath)) {
            return {
                success: false,
                error: 'El archivo no existe',
            };
        }

        const ext = path.extname(filePath).toLowerCase();
        const isPDF = ext === '.pdf';
        let rawText = '';
        let confidence = 0;
        let tempImagePath: string | null = null;

        if (isPDF) {
            console.log('[OCR] Procesando archivo PDF...');

            // Primero intentar extraer texto directamente del PDF
            const pdfResult = await processPDF(filePath);

            if (pdfResult && pdfResult.text.length > 100) {
                rawText = pdfResult.text;
                confidence = pdfResult.confidence;
            } else {
                // Si no hay texto, convertir a imagen y usar OCR
                tempImagePath = await convertPDFToImage(filePath);

                if (!tempImagePath) {
                    return {
                        success: false,
                        error: 'No se pudo procesar el PDF. Por favor intente con una imagen (JPG, PNG) o un PDF con texto seleccionable.',
                    };
                }

                // Preprocesar y ejecutar OCR en la imagen convertida
                console.log('[OCR] Preprocesando imagen del PDF...');
                const processedImage = await preprocessImage(tempImagePath);

                console.log('[OCR] Ejecutando reconocimiento de texto...');
                const ocrWorker = await getWorker();
                const result = await ocrWorker.recognize(processedImage);

                rawText = result.data.text;
                confidence = result.data.confidence;

                // Limpiar imagen temporal
                try {
                    if (fs.existsSync(tempImagePath)) {
                        fs.unlinkSync(tempImagePath);
                    }
                } catch (e) {
                    // Ignorar error de limpieza
                }
            }
        } else {
            console.log('[OCR] Preprocesando imagen...');

            // Preprocesar imagen para mejorar OCR
            const processedImage = await preprocessImage(filePath);

            console.log('[OCR] Ejecutando reconocimiento de texto...');

            // Obtener worker y ejecutar OCR
            const ocrWorker = await getWorker();
            const result = await ocrWorker.recognize(processedImage);

            rawText = result.data.text;
            confidence = result.data.confidence;
        }

        console.log(`[OCR] Completado. Confianza: ${confidence}%`);
        console.log('[OCR] Texto extraido:', rawText.substring(0, 500) + '...');

        // Verificar confianza minima
        if (confidence < 40) {
            return {
                success: false,
                error: isPDF
                    ? 'No se pudo extraer texto del PDF. Por favor intente con un PDF con texto seleccionable o una imagen clara.'
                    : 'La calidad de la imagen es muy baja. Por favor tome una foto mas clara con buena iluminacion.',
                rawText,
            };
        }

        // Extraer datos del texto
        const extractedData = extractFiscalData(rawText);

        // Verificar que al menos se extrajo el RFC
        if (!extractedData.rfc) {
            return {
                success: false,
                error: 'No se pudo detectar el RFC en el documento. Asegurese de que sea una Constancia de Situacion Fiscal valida y que el documento sea legible.',
                rawText,
            };
        }

        // Validar formato de RFC
        const rfcFisicaRegex = /^[A-ZÑ&]{4}\d{6}[A-Z0-9]{3}$/;
        const rfcMoralRegex = /^[A-ZÑ&]{3}\d{6}[A-Z0-9]{3}$/;

        if (!rfcFisicaRegex.test(extractedData.rfc) && !rfcMoralRegex.test(extractedData.rfc)) {
            return {
                success: false,
                error: `El RFC detectado (${extractedData.rfc}) no tiene un formato valido. Por favor verifique el documento.`,
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
