import { Router, Request, Response } from 'express';
import { queryOne } from '../../database/config';
import {
    getTemplates,
    getTemplateById,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    generateDocument,
    getGeneratedDocuments,
    getGeneratedDocumentById,
    deleteExpiredDocuments,
    deleteGeneratedDocument,
    seedDefaultTemplate,
    getDocumentByVerificationCode,
} from '../../services/documentService';

const router = Router();

// Middleware: verificar que el usuario sea consultor
async function requireConsultor(req: Request, res: Response, next: Function) {
    const userId = req.query.userId as string;
    if (!userId) {
        return res.status(400).json({ error: 'userId es requerido' });
    }
    const user = await queryOne<{ role: string }>(
        `SELECT COALESCE(role, 'usuario') as role FROM users WHERE id = $1`,
        [userId]
    );
    if (!user || user.role !== 'consultor') {
        return res.status(403).json({ error: 'Acceso denegado. Solo consultores.' });
    }
    next();
}

// ==================== PUBLIC VERIFICATION (no auth) ====================

// GET /api/documents/verify/:code — public endpoint for QR verification
router.get('/verify/:code', async (req: Request, res: Response) => {
    try {
        const code = req.params.code as string;
        const document = await getDocumentByVerificationCode(code);
        if (!document) {
            return res.status(404).json({ error: 'Documento no encontrado' });
        }
        // Return public-safe data only
        res.json({
            document: {
                title: document.title,
                created_at: document.created_at,
                expires_at: document.expires_at,
                client_rfc: document.client_rfc,
                client_name: document.client_name,
                verification_code: document.verification_code,
                firmante_nombre: document.firmante_nombre,
                firmante_cargo: document.firmante_cargo,
                firma_electronica: document.firma_electronica,
                cadena_original: document.cadena_original,
                sello_digital: document.sello_digital,
                cert_inicio: document.cert_inicio,
                cert_fin: document.cert_fin,
                file_url: document.file_url,
                filled_data: {
                    folio: document.filled_data?.folio || '',
                    oficio_numero: document.filled_data?.oficio_numero || '',
                    razon_social: document.filled_data?.razon_social || '',
                },
            },
        });
    } catch (error: any) {
        console.error('Error verifying document:', error);
        res.status(500).json({ error: error.message });
    }
});

// ==================== TEMPLATES ====================

// GET /api/documents/templates?userId=xxx&category=xxx
router.get('/templates', requireConsultor, async (req: Request, res: Response) => {
    try {
        const category = req.query.category as string | undefined;
        const templates = await getTemplates(category);
        res.json({ templates });
    } catch (error: any) {
        console.error('Error getting templates:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET /api/documents/templates/:id?userId=xxx
router.get('/templates/:id', requireConsultor, async (req: Request, res: Response) => {
    try {
        const template = await getTemplateById(req.params.id as string);
        if (!template) return res.status(404).json({ error: 'Plantilla no encontrada' });
        res.json({ template });
    } catch (error: any) {
        console.error('Error getting template:', error);
        res.status(500).json({ error: error.message });
    }
});

// POST /api/documents/templates?userId=xxx
router.post('/templates', requireConsultor, async (req: Request, res: Response) => {
    try {
        const userId = req.query.userId as string;
        const { name, description, category, html_content, placeholders } = req.body;
        if (!name || !html_content) {
            return res.status(400).json({ error: 'name y html_content son requeridos' });
        }
        const template = await createTemplate({
            name,
            description,
            category: category || 'general',
            html_content,
            placeholders: placeholders || [],
            created_by: userId,
        });
        res.status(201).json({ template });
    } catch (error: any) {
        console.error('Error creating template:', error);
        res.status(500).json({ error: error.message });
    }
});

// PUT /api/documents/templates/:id?userId=xxx
router.put('/templates/:id', requireConsultor, async (req: Request, res: Response) => {
    try {
        const template = await updateTemplate(req.params.id as string, req.body);
        if (!template) return res.status(404).json({ error: 'Plantilla no encontrada' });
        res.json({ template });
    } catch (error: any) {
        console.error('Error updating template:', error);
        res.status(500).json({ error: error.message });
    }
});

// DELETE /api/documents/templates/:id?userId=xxx
router.delete('/templates/:id', requireConsultor, async (req: Request, res: Response) => {
    try {
        const success = await deleteTemplate(req.params.id as string);
        if (!success) return res.status(404).json({ error: 'Plantilla no encontrada' });
        res.json({ success: true });
    } catch (error: any) {
        console.error('Error deleting template:', error);
        res.status(500).json({ error: error.message });
    }
});

// POST /api/documents/templates/seed?userId=xxx — seed default templates
router.post('/templates/seed', requireConsultor, async (req: Request, res: Response) => {
    try {
        const userId = req.query.userId as string;
        await seedDefaultTemplate(userId);
        res.json({ success: true, message: 'Plantillas por defecto creadas' });
    } catch (error: any) {
        console.error('Error seeding templates:', error);
        res.status(500).json({ error: error.message });
    }
});

// ==================== DOCUMENT GENERATION ====================

// POST /api/documents/generate?userId=xxx
router.post('/generate', requireConsultor, async (req: Request, res: Response) => {
    try {
        const userId = req.query.userId as string;
        const { template_id, client_id, extra_data, title } = req.body;

        if (!template_id || !client_id) {
            return res.status(400).json({ error: 'template_id y client_id son requeridos' });
        }

        const document = await generateDocument({
            template_id,
            client_id,
            generated_by: userId,
            extra_data,
            title,
        });

        res.status(201).json({ document });
    } catch (error: any) {
        console.error('Error generating document:', error);
        res.status(500).json({ error: error.message });
    }
});

// ==================== GENERATED DOCUMENTS ====================

// GET /api/documents?userId=xxx&clientId=xxx&page=1&limit=20
router.get('/', requireConsultor, async (req: Request, res: Response) => {
    try {
        const clientId = req.query.clientId as string | undefined;
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;

        const result = await getGeneratedDocuments(clientId, page, limit);
        res.json(result);
    } catch (error: any) {
        console.error('Error getting documents:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET /api/documents/:id?userId=xxx
router.get('/:id', requireConsultor, async (req: Request, res: Response) => {
    try {
        const document = await getGeneratedDocumentById(req.params.id as string);
        if (!document) return res.status(404).json({ error: 'Documento no encontrado' });
        res.json({ document });
    } catch (error: any) {
        console.error('Error getting document:', error);
        res.status(500).json({ error: error.message });
    }
});

// DELETE /api/documents/:id?userId=xxx — delete a generated document
router.delete('/:id', requireConsultor, async (req: Request, res: Response) => {
    try {
        const deleted = await deleteGeneratedDocument(req.params.id as string);
        if (!deleted) return res.status(404).json({ error: 'Documento no encontrado' });
        res.json({ success: true });
    } catch (error: any) {
        console.error('Error deleting document:', error);
        res.status(500).json({ error: error.message });
    }
});

// POST /api/documents/cleanup?userId=xxx — cleanup expired documents
router.post('/cleanup', requireConsultor, async (req: Request, res: Response) => {
    try {
        const count = await deleteExpiredDocuments();
        res.json({ success: true, deleted: count });
    } catch (error: any) {
        console.error('Error cleaning up documents:', error);
        res.status(500).json({ error: error.message });
    }
});

export const documentRoutes = router;
