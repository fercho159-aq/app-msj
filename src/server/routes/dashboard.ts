import { Router, Request, Response } from 'express';
import { query, queryOne } from '../../database/config';
import {
    getDashboardSummary,
    getDashboardActivity,
    getUsersMedia,
    getUserMediaDetail,
} from '../../services/dashboardService';
import { sendAiChatMessage } from '../../services/aiChatService';
import { consultarDatosFiscales } from '../../services/syntageService';

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

// GET /api/dashboard/unclaimed-users?userId=xxx
router.get('/unclaimed-users', requireConsultor, async (req: Request, res: Response) => {
    try {
        const adminUser = await queryOne<{ id: string }>(
            `SELECT id FROM users WHERE rfc = 'ADMIN000CONS'`
        );
        if (!adminUser) {
            return res.json({ count: 0, users: [] });
        }

        const unclaimedUsers = await query<any>(`
            SELECT
                u.id as user_id,
                u.name,
                u.rfc,
                u.avatar_url,
                u.phone,
                u.created_at as registered_at,
                c.id as chat_id,
                (SELECT text FROM messages WHERE chat_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message,
                (SELECT COUNT(*) FROM messages WHERE chat_id = c.id) as message_count
            FROM users u
            INNER JOIN chat_participants cp1 ON cp1.user_id = u.id
            INNER JOIN chat_participants cp2 ON cp2.chat_id = cp1.chat_id AND cp2.user_id = $1
            INNER JOIN chats c ON c.id = cp1.chat_id AND c.is_group = false
            WHERE u.role = 'usuario'
              AND u.claimed_by IS NULL
              AND u.id != $1
            ORDER BY u.created_at DESC
        `, [adminUser.id]);

        res.json({ count: unclaimedUsers.length, users: unclaimedUsers });
    } catch (error: any) {
        console.error('Error al obtener usuarios sin reclamar:', error);
        res.status(500).json({ error: error.message });
    }
});

// POST /api/dashboard/ai-chat
router.post('/ai-chat', async (req: Request, res: Response) => {
    try {
        const { userId, messages } = req.body;

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

        if (!messages || !Array.isArray(messages) || messages.length === 0) {
            return res.status(400).json({ error: 'messages es requerido' });
        }

        const reply = await sendAiChatMessage(messages);
        res.json({ reply });
    } catch (error: any) {
        console.error('Error en AI chat:', error);
        res.status(500).json({ error: error.message });
    }
});

// POST /api/dashboard/search-rfc
router.post('/search-rfc', async (req: Request, res: Response) => {
    try {
        const { userId, terminoBusqueda } = req.body;

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

        if (!terminoBusqueda || typeof terminoBusqueda !== 'string') {
            return res.status(400).json({ error: 'terminoBusqueda es requerido' });
        }

        const CHECKID_API_KEY = 'ewXxGI3XHrCJn41umWcaCGQLXTFn/sbk/EMeptuIuCI=';
        const CHECKID_URL = 'https://www.checkid.mx/api/Busqueda';

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);

        // Call CheckID and Syntage in parallel
        const rfcNorm = terminoBusqueda.toUpperCase().trim();

        const [checkIdResponse, syntageResult] = await Promise.all([
            (async () => {
                const resp = await fetch(CHECKID_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        ApiKey: CHECKID_API_KEY,
                        TerminoBusqueda: rfcNorm,
                        ObtenerRFC: true,
                        ObtenerCURP: true,
                        ObtenerCP: true,
                        ObtenerRegimenFiscal: true,
                        ObtenerNSS: true,
                        Obtener69o69B: true,
                    }),
                    signal: controller.signal,
                });
                clearTimeout(timeoutId);
                return resp.json();
            })(),
            consultarDatosFiscales(rfcNorm).catch(() => null),
        ]);

        // Merge Syntage data into response
        const tipoPersona = rfcNorm.length === 12 ? 'moral' : 'fisica';
        const checkIdObj = checkIdResponse as Record<string, any>;
        checkIdObj.tipoPersona = tipoPersona;
        checkIdObj.entidadFederativa = syntageResult?.data?.estado || null;

        res.json(checkIdObj);
    } catch (error: any) {
        console.error('Error en search-rfc:', error);
        if (error.name === 'AbortError') {
            return res.status(504).json({ error: 'Tiempo de espera agotado.' });
        }
        res.status(500).json({ error: 'Error al consultar RFC' });
    }
});

export { router as dashboardRoutes };
