import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = Router();

// URL base del servidor - usa la variable de entorno o la IP pública del VPS
const SERVER_URL = process.env.SERVER_URL || 'https://appsoluciones.duckdns.org';

// Configurar almacenamiento
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../../../uploads');
        // Crear directorio si no existe
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        // Generar nombre único: timestamp + extensión original
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    },
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 1024 * 1024 * 1024, // Límite de 1GB
    },
});

// POST /api/upload - Subir archivo único
router.post('/', upload.single('file'), (req: Request, res: Response) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No se subió ningún archivo' });
        }

        // Construir URL pública usando la URL del servidor configurada
        const fileUrl = `${SERVER_URL}/uploads/${req.file.filename}`;

        // Determinar tipo de archivo simple
        const mimeType = req.file.mimetype;
        let type = 'file';
        if (mimeType.startsWith('image/')) type = 'image';
        else if (mimeType.startsWith('audio/')) type = 'audio';
        else if (mimeType.startsWith('video/')) type = 'video';

        res.json({
            success: true,
            url: fileUrl,
            filename: req.file.filename,
            type: type,
            originalName: req.file.originalname
        });

    } catch (error: any) {
        console.error('Error al subir archivo:', error);
        res.status(500).json({ error: 'Error al procesar el archivo' });
    }
});

export { router as uploadRoutes };
