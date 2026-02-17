import { Router, Request, Response } from 'express';
import {
    blockUser,
    unblockUser,
    isUserBlocked,
    getBlockedUsers,
    createReport,
    getPendingReports,
    getAllReports,
    resolveReport,
} from '../../services/moderationService';

const router = Router();

// ==================== BLOCK/UNBLOCK ====================

// POST /api/moderation/block - Bloquear un usuario
router.post('/block', async (req: Request, res: Response) => {
    try {
        const { userId, blockedUserId, reason } = req.body;

        if (!userId || !blockedUserId) {
            return res.status(400).json({ error: 'userId y blockedUserId son requeridos' });
        }

        if (userId === blockedUserId) {
            return res.status(400).json({ error: 'No puedes bloquearte a ti mismo' });
        }

        const block = await blockUser(userId, blockedUserId, reason);
        res.json({ success: true, block });
    } catch (error: any) {
        console.error('Error al bloquear usuario:', error);
        res.status(500).json({ error: error.message });
    }
});

// POST /api/moderation/unblock - Desbloquear un usuario
router.post('/unblock', async (req: Request, res: Response) => {
    try {
        const { userId, blockedUserId } = req.body;

        if (!userId || !blockedUserId) {
            return res.status(400).json({ error: 'userId y blockedUserId son requeridos' });
        }

        const unblocked = await unblockUser(userId, blockedUserId);
        res.json({ success: true, unblocked });
    } catch (error: any) {
        console.error('Error al desbloquear usuario:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET /api/moderation/blocked?userId=xxx - Obtener usuarios bloqueados
router.get('/blocked', async (req: Request, res: Response) => {
    try {
        const userId = req.query.userId as string;

        if (!userId) {
            return res.status(400).json({ error: 'userId es requerido' });
        }

        const blockedUsers = await getBlockedUsers(userId);
        res.json({ blockedUsers });
    } catch (error: any) {
        console.error('Error al obtener usuarios bloqueados:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET /api/moderation/is-blocked?userId=xxx&targetId=yyy - Verificar si un usuario está bloqueado
router.get('/is-blocked', async (req: Request, res: Response) => {
    try {
        const userId = req.query.userId as string;
        const targetId = req.query.targetId as string;

        if (!userId || !targetId) {
            return res.status(400).json({ error: 'userId y targetId son requeridos' });
        }

        const blocked = await isUserBlocked(userId, targetId);
        res.json({ blocked });
    } catch (error: any) {
        console.error('Error al verificar bloqueo:', error);
        res.status(500).json({ error: error.message });
    }
});

// ==================== REPORTS ====================

// POST /api/moderation/report - Reportar contenido
router.post('/report', async (req: Request, res: Response) => {
    try {
        const { userId, reportedUserId, reason, description, messageId, chatId } = req.body;

        if (!userId || !reportedUserId || !reason) {
            return res.status(400).json({ error: 'userId, reportedUserId y reason son requeridos' });
        }

        const validReasons = ['spam', 'harassment', 'inappropriate', 'violence', 'other'];
        if (!validReasons.includes(reason)) {
            return res.status(400).json({ error: 'Motivo de reporte inválido' });
        }

        if (userId === reportedUserId) {
            return res.status(400).json({ error: 'No puedes reportarte a ti mismo' });
        }

        const report = await createReport(userId, reportedUserId, reason, description, messageId, chatId);
        res.status(201).json({ success: true, report });
    } catch (error: any) {
        console.error('Error al crear reporte:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET /api/moderation/reports - Obtener reportes (admin)
router.get('/reports', async (req: Request, res: Response) => {
    try {
        const status = req.query.status as string | undefined;

        let reports;
        if (status === 'pending') {
            reports = await getPendingReports();
        } else {
            reports = await getAllReports(status as any);
        }

        res.json({ reports });
    } catch (error: any) {
        console.error('Error al obtener reportes:', error);
        res.status(500).json({ error: error.message });
    }
});

// PUT /api/moderation/reports/:id - Resolver un reporte (admin)
router.put('/reports/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { status, adminNotes } = req.body;

        if (!status || !['resolved', 'dismissed'].includes(status)) {
            return res.status(400).json({ error: 'status debe ser resolved o dismissed' });
        }

        const report = await resolveReport(id as string, status, adminNotes);
        if (!report) {
            return res.status(404).json({ error: 'Reporte no encontrado' });
        }

        res.json({ success: true, report });
    } catch (error: any) {
        console.error('Error al resolver reporte:', error);
        res.status(500).json({ error: error.message });
    }
});

export { router as moderationRoutes };
