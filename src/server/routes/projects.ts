import { Router, Request, Response } from 'express';
import { queryOne } from '../../database/config';
import {
    getClients,
    getClientFiscalProfile,
    updateClientFiscalFields,
    getProjects,
    createProject,
    getProjectById,
    updateProject,
    createPhase,
    updatePhase,
    deletePhase,
    reorderPhases,
    getPhaseDetail,
    getPhaseDocuments,
    addPhaseDocument,
    removePhaseDocument,
    getClientCloudFiles,
    getPhaseObservations,
    addPhaseObservation,
    updatePhaseObservation,
    deletePhaseObservation,
    getPhaseChecklist,
    addChecklistItem,
    toggleChecklistItem,
    deleteChecklistItem,
    getProjectsSummary,
    getConsultors,
    createClient,
} from '../../services/projectService';

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

// ==================== SUMMARY ====================

// GET /api/projects/summary?userId=xxx
router.get('/summary', requireConsultor, async (req: Request, res: Response) => {
    try {
        const summary = await getProjectsSummary();
        res.json({ summary });
    } catch (error: any) {
        console.error('Error al obtener resumen de proyectos:', error);
        res.status(500).json({ error: error.message });
    }
});

// ==================== CONSULTORS ====================

// GET /api/projects/consultors?userId=xxx
router.get('/consultors', requireConsultor, async (req: Request, res: Response) => {
    try {
        const consultors = await getConsultors();
        res.json({ consultors });
    } catch (error: any) {
        console.error('Error al obtener consultores:', error);
        res.status(500).json({ error: error.message });
    }
});

// ==================== CLIENTS ====================

// POST /api/projects/clients?userId=xxx
router.post('/clients', requireConsultor, async (req: Request, res: Response) => {
    try {
        const { rfc, name, razon_social, phone, tipo_persona, regimen_fiscal, codigo_postal, estado, domicilio, curp } = req.body;
        if (!rfc) return res.status(400).json({ error: 'RFC es requerido' });
        const client = await createClient({ rfc, name, razon_social, phone, tipo_persona, regimen_fiscal, codigo_postal, estado, domicilio, curp });
        res.status(201).json({ client });
    } catch (error: any) {
        console.error('Error al crear cliente:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET /api/projects/clients?userId=xxx&page=1&limit=20&search=
router.get('/clients', requireConsultor, async (req: Request, res: Response) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
        const search = req.query.search as string | undefined;

        const result = await getClients(page, limit, search || undefined);
        res.json(result);
    } catch (error: any) {
        console.error('Error al obtener clientes:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET /api/projects/clients/:id?userId=xxx
router.get('/clients/:id', requireConsultor, async (req: Request, res: Response) => {
    try {
        const profile = await getClientFiscalProfile(req.params.id as string);
        if (!profile) return res.status(404).json({ error: 'Cliente no encontrado' });
        res.json({ profile });
    } catch (error: any) {
        console.error('Error al obtener perfil fiscal:', error);
        res.status(500).json({ error: error.message });
    }
});

// PUT /api/projects/clients/:id/fiscal?userId=xxx
router.put('/clients/:id/fiscal', requireConsultor, async (req: Request, res: Response) => {
    try {
        const { capital, efirma_expiry, csd_expiry } = req.body;
        const profile = await updateClientFiscalFields(req.params.id as string, {
            capital, efirma_expiry, csd_expiry,
        });
        if (!profile) return res.status(404).json({ error: 'Cliente no encontrado' });
        res.json({ profile });
    } catch (error: any) {
        console.error('Error al actualizar campos fiscales:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET /api/projects/clients/:id/cloud-files?userId=xxx
router.get('/clients/:id/cloud-files', requireConsultor, async (req: Request, res: Response) => {
    try {
        const files = await getClientCloudFiles(req.params.id as string);
        res.json({ files });
    } catch (error: any) {
        console.error('Error al obtener archivos del cliente:', error);
        res.status(500).json({ error: error.message });
    }
});

// ==================== PROJECTS ====================

// GET /api/projects?userId=xxx&clientId=xxx&status=activo
router.get('/', requireConsultor, async (req: Request, res: Response) => {
    try {
        const result = await getProjects({
            clientId: req.query.clientId as string | undefined,
            status: req.query.status as string | undefined,
            page: parseInt(req.query.page as string) || 1,
            limit: Math.min(parseInt(req.query.limit as string) || 50, 100),
        });
        res.json(result);
    } catch (error: any) {
        console.error('Error al obtener proyectos:', error);
        res.status(500).json({ error: error.message });
    }
});

// POST /api/projects?userId=xxx
router.post('/', requireConsultor, async (req: Request, res: Response) => {
    try {
        const userId = req.query.userId as string;
        const { clientId, name, serviceType, description } = req.body;

        if (!clientId || !name || !serviceType) {
            return res.status(400).json({ error: 'clientId, name y serviceType son requeridos' });
        }

        const project = await createProject({
            clientId, name, serviceType, description, createdBy: userId,
        });
        res.status(201).json({ project });
    } catch (error: any) {
        console.error('Error al crear proyecto:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET /api/projects/:projectId?userId=xxx
router.get('/:projectId', requireConsultor, async (req: Request, res: Response) => {
    try {
        const project = await getProjectById(req.params.projectId as string);
        if (!project) return res.status(404).json({ error: 'Proyecto no encontrado' });
        res.json({ project });
    } catch (error: any) {
        console.error('Error al obtener proyecto:', error);
        res.status(500).json({ error: error.message });
    }
});

// PUT /api/projects/:projectId?userId=xxx
router.put('/:projectId', requireConsultor, async (req: Request, res: Response) => {
    try {
        const { name, serviceType, description, status } = req.body;
        const project = await updateProject(req.params.projectId as string, {
            name, serviceType, description, status,
        });
        if (!project) return res.status(404).json({ error: 'Proyecto no encontrado' });
        res.json({ project });
    } catch (error: any) {
        console.error('Error al actualizar proyecto:', error);
        res.status(500).json({ error: error.message });
    }
});

// ==================== PHASES ====================

// POST /api/projects/:projectId/phases?userId=xxx
router.post('/:projectId/phases', requireConsultor, async (req: Request, res: Response) => {
    try {
        const { name, description, executorId, deadline, dependsOnPhaseId } = req.body;
        if (!name) return res.status(400).json({ error: 'name es requerido' });

        const phase = await createPhase({
            projectId: req.params.projectId as string, name, description, executorId, deadline, dependsOnPhaseId,
        });
        res.status(201).json({ phase });
    } catch (error: any) {
        console.error('Error al crear fase:', error);
        res.status(500).json({ error: error.message });
    }
});

// PUT /api/projects/:projectId/phases/:phaseId?userId=xxx
router.put('/:projectId/phases/:phaseId', requireConsultor, async (req: Request, res: Response) => {
    try {
        const { name, description, status, executorId, deadline, dependsOnPhaseId } = req.body;
        const phase = await updatePhase(req.params.phaseId as string, {
            name, description, status, executorId, deadline,
            dependsOnPhaseId: dependsOnPhaseId !== undefined ? dependsOnPhaseId : undefined,
        });
        if (!phase) return res.status(404).json({ error: 'Fase no encontrada' });
        res.json({ phase });
    } catch (error: any) {
        if (error.message?.includes('No se puede avanzar')) {
            return res.status(400).json({ error: error.message });
        }
        console.error('Error al actualizar fase:', error);
        res.status(500).json({ error: error.message });
    }
});

// DELETE /api/projects/:projectId/phases/:phaseId?userId=xxx
router.delete('/:projectId/phases/:phaseId', requireConsultor, async (req: Request, res: Response) => {
    try {
        await deletePhase(req.params.phaseId as string);
        res.json({ success: true });
    } catch (error: any) {
        console.error('Error al eliminar fase:', error);
        res.status(500).json({ error: error.message });
    }
});

// PUT /api/projects/:projectId/phases/reorder?userId=xxx
router.put('/:projectId/phases/reorder', requireConsultor, async (req: Request, res: Response) => {
    try {
        const { phaseIds } = req.body;
        if (!phaseIds || !Array.isArray(phaseIds)) {
            return res.status(400).json({ error: 'phaseIds array es requerido' });
        }
        await reorderPhases(req.params.projectId as string, phaseIds);
        res.json({ success: true });
    } catch (error: any) {
        console.error('Error al reordenar fases:', error);
        res.status(500).json({ error: error.message });
    }
});

// ==================== PHASE DETAIL ====================

// GET /api/projects/phases/:phaseId?userId=xxx
router.get('/phases/:phaseId', requireConsultor, async (req: Request, res: Response) => {
    try {
        const detail = await getPhaseDetail(req.params.phaseId as string);
        if (!detail) return res.status(404).json({ error: 'Fase no encontrada' });
        res.json(detail);
    } catch (error: any) {
        console.error('Error al obtener detalle de fase:', error);
        res.status(500).json({ error: error.message });
    }
});

// ==================== PHASE DOCUMENTS ====================

// GET /api/projects/phases/:phaseId/documents?userId=xxx
router.get('/phases/:phaseId/documents', requireConsultor, async (req: Request, res: Response) => {
    try {
        const documents = await getPhaseDocuments(req.params.phaseId as string);
        res.json({ documents });
    } catch (error: any) {
        console.error('Error al obtener documentos:', error);
        res.status(500).json({ error: error.message });
    }
});

// POST /api/projects/phases/:phaseId/documents?userId=xxx
router.post('/phases/:phaseId/documents', requireConsultor, async (req: Request, res: Response) => {
    try {
        const userId = req.query.userId as string;
        const { fileUrl, fileName, fileType, fileSize } = req.body;
        if (!fileUrl || !fileName) {
            return res.status(400).json({ error: 'fileUrl y fileName son requeridos' });
        }

        const document = await addPhaseDocument({
            phaseId: req.params.phaseId as string,
            fileUrl, fileName, fileType, fileSize,
            source: 'upload',
            uploadedBy: userId,
        });
        res.status(201).json({ document });
    } catch (error: any) {
        console.error('Error al agregar documento:', error);
        res.status(500).json({ error: error.message });
    }
});

// POST /api/projects/phases/:phaseId/documents/link?userId=xxx
router.post('/phases/:phaseId/documents/link', requireConsultor, async (req: Request, res: Response) => {
    try {
        const userId = req.query.userId as string;
        const { messageId, fileUrl, fileName, fileType } = req.body;
        if (!fileUrl || !fileName) {
            return res.status(400).json({ error: 'fileUrl y fileName son requeridos' });
        }

        const document = await addPhaseDocument({
            phaseId: req.params.phaseId as string,
            fileUrl, fileName, fileType,
            source: 'message',
            messageId,
            uploadedBy: userId,
        });
        res.status(201).json({ document });
    } catch (error: any) {
        console.error('Error al vincular documento:', error);
        res.status(500).json({ error: error.message });
    }
});

// DELETE /api/projects/phases/:phaseId/documents/:docId?userId=xxx
router.delete('/phases/:phaseId/documents/:docId', requireConsultor, async (req: Request, res: Response) => {
    try {
        await removePhaseDocument(req.params.docId as string);
        res.json({ success: true });
    } catch (error: any) {
        console.error('Error al eliminar documento:', error);
        res.status(500).json({ error: error.message });
    }
});

// ==================== PHASE OBSERVATIONS ====================

// GET /api/projects/phases/:phaseId/observations?userId=xxx
router.get('/phases/:phaseId/observations', requireConsultor, async (req: Request, res: Response) => {
    try {
        const observations = await getPhaseObservations(req.params.phaseId as string);
        res.json({ observations });
    } catch (error: any) {
        console.error('Error al obtener observaciones:', error);
        res.status(500).json({ error: error.message });
    }
});

// POST /api/projects/phases/:phaseId/observations?userId=xxx
router.post('/phases/:phaseId/observations', requireConsultor, async (req: Request, res: Response) => {
    try {
        const userId = req.query.userId as string;
        const { content } = req.body;
        if (!content) return res.status(400).json({ error: 'content es requerido' });

        const observation = await addPhaseObservation({
            phaseId: req.params.phaseId as string,
            authorId: userId,
            content,
        });
        res.status(201).json({ observation });
    } catch (error: any) {
        console.error('Error al agregar observacion:', error);
        res.status(500).json({ error: error.message });
    }
});

// PUT /api/projects/phases/:phaseId/observations/:id?userId=xxx
router.put('/phases/:phaseId/observations/:id', requireConsultor, async (req: Request, res: Response) => {
    try {
        const { content } = req.body;
        if (!content) return res.status(400).json({ error: 'content es requerido' });

        const observation = await updatePhaseObservation(req.params.id as string, content);
        if (!observation) return res.status(404).json({ error: 'Observacion no encontrada' });
        res.json({ observation });
    } catch (error: any) {
        console.error('Error al actualizar observacion:', error);
        res.status(500).json({ error: error.message });
    }
});

// DELETE /api/projects/phases/:phaseId/observations/:id?userId=xxx
router.delete('/phases/:phaseId/observations/:id', requireConsultor, async (req: Request, res: Response) => {
    try {
        await deletePhaseObservation(req.params.id as string);
        res.json({ success: true });
    } catch (error: any) {
        console.error('Error al eliminar observacion:', error);
        res.status(500).json({ error: error.message });
    }
});

// ==================== PHASE CHECKLIST ====================

// GET /api/projects/phases/:phaseId/checklist?userId=xxx
router.get('/phases/:phaseId/checklist', requireConsultor, async (req: Request, res: Response) => {
    try {
        const checklist = await getPhaseChecklist(req.params.phaseId as string);
        res.json({ checklist });
    } catch (error: any) {
        console.error('Error al obtener checklist:', error);
        res.status(500).json({ error: error.message });
    }
});

// POST /api/projects/phases/:phaseId/checklist?userId=xxx
router.post('/phases/:phaseId/checklist', requireConsultor, async (req: Request, res: Response) => {
    try {
        const { label } = req.body;
        if (!label) return res.status(400).json({ error: 'label es requerido' });

        const item = await addChecklistItem({ phaseId: req.params.phaseId as string, label });
        res.status(201).json({ item });
    } catch (error: any) {
        console.error('Error al agregar item de checklist:', error);
        res.status(500).json({ error: error.message });
    }
});

// PUT /api/projects/phases/:phaseId/checklist/:id?userId=xxx
router.put('/phases/:phaseId/checklist/:id', requireConsultor, async (req: Request, res: Response) => {
    try {
        const userId = req.query.userId as string;
        const item = await toggleChecklistItem(req.params.id as string, userId);
        if (!item) return res.status(404).json({ error: 'Item no encontrado' });
        res.json({ item });
    } catch (error: any) {
        console.error('Error al toggle checklist item:', error);
        res.status(500).json({ error: error.message });
    }
});

// DELETE /api/projects/phases/:phaseId/checklist/:id?userId=xxx
router.delete('/phases/:phaseId/checklist/:id', requireConsultor, async (req: Request, res: Response) => {
    try {
        await deleteChecklistItem(req.params.id as string);
        res.json({ success: true });
    } catch (error: any) {
        console.error('Error al eliminar item de checklist:', error);
        res.status(500).json({ error: error.message });
    }
});

export { router as projectRoutes };
