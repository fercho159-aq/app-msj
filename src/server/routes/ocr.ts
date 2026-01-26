import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { processFiscalDocument } from '../services/ocrService';

const router = Router();

// Directorio para almacenar temporalmente las constancias fiscales
const FISCAL_UPLOAD_DIR = path.join(__dirname, '../../../uploads/fiscal');

// Crear directorio si no existe
if (!fs.existsSync(FISCAL_UPLOAD_DIR)) {
    fs.mkdirSync(FISCAL_UPLOAD_DIR, { recursive: true });
}

// Configurar almacenamiento para documentos fiscales
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, FISCAL_UPLOAD_DIR);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, 'csf-' + uniqueSuffix + path.extname(file.originalname));
    },
});

// Filtro para solo aceptar imagenes
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Tipo de archivo no permitido. Use JPG, PNG o WebP.'));
    }
};

const upload = multer({
    storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB maximo
    },
    fileFilter,
});

/**
 * POST /api/ocr/fiscal-document
 * Procesa una imagen de Constancia de Situacion Fiscal y extrae los datos via OCR
 */
router.post('/fiscal-document', upload.single('document'), async (req: Request, res: Response) => {
    const filePath = req.file?.path;

    try {
        // Validar que se subio un archivo
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'No se subio ninguna imagen. Por favor seleccione una imagen de su Constancia de Situacion Fiscal.',
            });
        }

        console.log(`[OCR] Procesando documento: ${req.file.filename}`);

        // Procesar el documento con OCR
        const result = await processFiscalDocument(filePath!);

        // Eliminar archivo despues de procesar (datos sensibles)
        try {
            if (filePath && fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
                console.log(`[OCR] Archivo eliminado: ${req.file.filename}`);
            }
        } catch (deleteError) {
            console.error('[OCR] Error eliminando archivo:', deleteError);
        }

        // Retornar resultado
        if (result.success) {
            res.json({
                success: true,
                data: result.data,
            });
        } else {
            res.status(400).json({
                success: false,
                error: result.error,
                rawText: process.env.NODE_ENV === 'development' ? result.rawText : undefined,
            });
        }

    } catch (error: any) {
        console.error('[OCR] Error en endpoint:', error);

        // Intentar eliminar archivo en caso de error
        try {
            if (filePath && fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        } catch (deleteError) {
            // Ignorar error de eliminacion
        }

        // Manejar errores de multer
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                error: 'La imagen es demasiado grande. El tamano maximo es 10MB.',
            });
        }

        if (error.message?.includes('Tipo de archivo')) {
            return res.status(400).json({
                success: false,
                error: error.message,
            });
        }

        res.status(500).json({
            success: false,
            error: 'Error al procesar el documento. Por favor intente de nuevo.',
        });
    }
});

export { router as ocrRoutes };
