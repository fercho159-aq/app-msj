// Servicio para consultar datos fiscales via API de Syntage
// Documentación: https://docs.syntage.com/

const SYNTAGE_API_KEY = 'e237d6d358f4757380ba7b0204c584d5';
const SYNTAGE_BASE_URL = 'https://api.syntage.com';

export interface SyntageFiscalData {
    rfc: string;
    razonSocial: string;
    tipoPersona: 'fisica' | 'moral';
    regimenFiscal?: string;
    codigoPostal?: string;
    estado?: string;
}

export interface SyntageResponse {
    success: boolean;
    data?: SyntageFiscalData;
    error?: string;
}

// Función para consultar datos fiscales por RFC usando la API de Syntage
export async function consultarDatosFiscales(rfc: string): Promise<SyntageResponse> {
    const normalizedRFC = rfc.toUpperCase().trim();

    // Validar formato de RFC antes de consultar
    const rfcFisicaRegex = /^[A-ZÑ&]{4}\d{6}[A-Z0-9]{3}$/;
    const rfcMoralRegex = /^[A-ZÑ&]{3}\d{6}[A-Z0-9]{3}$/;

    if (!rfcFisicaRegex.test(normalizedRFC) && !rfcMoralRegex.test(normalizedRFC)) {
        return {
            success: false,
            error: 'Formato de RFC inválido'
        };
    }

    try {
        // Intentar obtener datos fiscales via el endpoint de tax-status
        // Primero necesitamos crear una extracción para obtener el estado fiscal
        const extractionResponse = await fetch(`${SYNTAGE_BASE_URL}/extractions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': SYNTAGE_API_KEY,
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                rfc: normalizedRFC,
                type: 'tax_status'
            })
        });

        if (!extractionResponse.ok) {
            // Si la API no puede encontrar el RFC, intentamos extraer datos básicos
            // basándonos en el formato del RFC
            const tipoPersona = normalizedRFC.length === 13 ? 'fisica' : 'moral';

            console.log(`[Syntage] RFC ${normalizedRFC} no encontrado en SAT, usando datos básicos`);

            return {
                success: true,
                data: {
                    rfc: normalizedRFC,
                    razonSocial: '', // El usuario deberá ingresarla manualmente
                    tipoPersona: tipoPersona
                }
            };
        }

        const extractionData: any = await extractionResponse.json();

        // Procesar la respuesta de Syntage
        if (extractionData && extractionData.data) {
            const fiscalData: any = extractionData.data;

            // Determinar tipo de persona basado en el régimen fiscal o longitud del RFC
            let tipoPersona: 'fisica' | 'moral' = 'fisica';
            if (normalizedRFC.length === 12) {
                tipoPersona = 'moral';
            } else if (fiscalData.regimenFiscal) {
                // Códigos de régimen para personas morales suelen ser 601, 603, etc.
                const regimenesMorales = ['601', '603', '620', '622', '623', '624', '626'];
                if (regimenesMorales.includes(fiscalData.regimenFiscal)) {
                    tipoPersona = 'moral';
                }
            }

            return {
                success: true,
                data: {
                    rfc: normalizedRFC,
                    razonSocial: fiscalData.razonSocial || fiscalData.nombre || '',
                    tipoPersona: tipoPersona,
                    regimenFiscal: fiscalData.regimenFiscal,
                    codigoPostal: fiscalData.codigoPostal,
                    estado: fiscalData.estado
                }
            };
        }

        // Si no hay datos, devolver datos básicos basados en el RFC
        return {
            success: true,
            data: {
                rfc: normalizedRFC,
                razonSocial: '',
                tipoPersona: normalizedRFC.length === 13 ? 'fisica' : 'moral'
            }
        };

    } catch (error: any) {
        console.error('[Syntage] Error consultando datos fiscales:', error);

        // En caso de error de conexión, devolver datos básicos
        const tipoPersona = normalizedRFC.length === 13 ? 'fisica' : 'moral';

        return {
            success: true,
            data: {
                rfc: normalizedRFC,
                razonSocial: '',
                tipoPersona: tipoPersona
            }
        };
    }
}

// Función alternativa para validar RFC en el SAT (simplificada)
export function validarFormatoRFC(rfc: string): { valido: boolean; tipoPersona?: 'fisica' | 'moral'; error?: string } {
    const normalizedRFC = rfc.toUpperCase().trim();

    // RFC de persona física: 4 letras + 6 dígitos + 3 alfanuméricos = 13 caracteres
    const rfcFisicaRegex = /^[A-ZÑ&]{4}\d{6}[A-Z0-9]{3}$/;

    // RFC de persona moral: 3 letras + 6 dígitos + 3 alfanuméricos = 12 caracteres
    const rfcMoralRegex = /^[A-ZÑ&]{3}\d{6}[A-Z0-9]{3}$/;

    if (rfcFisicaRegex.test(normalizedRFC)) {
        return { valido: true, tipoPersona: 'fisica' };
    }

    if (rfcMoralRegex.test(normalizedRFC)) {
        return { valido: true, tipoPersona: 'moral' };
    }

    return {
        valido: false,
        error: 'RFC inválido. Debe tener 12 caracteres (persona moral) o 13 caracteres (persona física)'
    };
}
