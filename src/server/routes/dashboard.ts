import { Router, Request, Response } from 'express';
import { queryOne } from '../../database/config';
import {
    getDashboardSummary,
    getDashboardActivity,
    getUsersMedia,
    getUserMediaDetail,
} from '../../services/dashboardService';

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
        return res.status(403).json({ error: 'Acceso denegado. Solo consultores pueden acceder al dashboard.' });
    }

    next();
}

// GET /api/dashboard/summary?userId=xxx
router.get('/summary', requireConsultor, async (req: Request, res: Response) => {
    try {
        const summary = await getDashboardSummary();
        res.json({ summary });
    } catch (error: any) {
        console.error('Error al obtener resumen del dashboard:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET /api/dashboard/activity?userId=xxx&period=30d
router.get('/activity', requireConsultor, async (req: Request, res: Response) => {
    try {
        const period = (req.query.period as string) || '30d';
        if (!['7d', '30d', '90d'].includes(period)) {
            return res.status(400).json({ error: 'period debe ser 7d, 30d o 90d' });
        }

        const activity = await getDashboardActivity(period as '7d' | '30d' | '90d');
        res.json({ activity });
    } catch (error: any) {
        console.error('Error al obtener actividad del dashboard:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET /api/dashboard/users-media?userId=xxx&page=1&limit=20&search=
router.get('/users-media', requireConsultor, async (req: Request, res: Response) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
        const search = req.query.search as string | undefined;

        const result = await getUsersMedia(page, limit, search || undefined);
        res.json(result);
    } catch (error: any) {
        console.error('Error al obtener media de usuarios:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET /api/dashboard/user-media/:userId?userId=xxx
router.get('/user-media/:targetUserId', requireConsultor, async (req: Request, res: Response) => {
    try {
        const targetUserId = req.params.targetUserId as string;
        const media = await getUserMediaDetail(targetUserId);
        res.json({ media });
    } catch (error: any) {
        console.error('Error al obtener detalle de media:', error);
        res.status(500).json({ error: error.message });
    }
});

export { router as dashboardRoutes };
