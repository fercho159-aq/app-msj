import { Router, Request, Response } from 'express';
import { query, queryOne } from '../../database/config';
import { getTurnCredentials } from '../services/turnService';

const router = Router();

interface CallRequest {
    id: string;
    user_id: string;
    name: string;
    phone: string;
    emergency: string;
    status: 'pending' | 'completed' | 'cancelled';
    created_at: Date;
    completed_at: Date | null;
}

// POST /api/calls/request - Crear solicitud de llamada
router.post('/request', async (req: Request, res: Response) => {
    try {
        const { userId, name, phone, emergency } = req.body;

        if (!userId || !name || !phone || !emergency) {
            return res.status(400).json({
                error: 'userId, name, phone y emergency son requeridos'
            });
        }

        const result = await query<CallRequest>(`
            INSERT INTO call_requests (user_id, name, phone, emergency)
            VALUES ($1, $2, $3, $4)
            RETURNING *
        `, [userId, name, phone, emergency]);

        res.status(201).json({
            success: true,
            callRequest: result[0]
        });

    } catch (error: any) {
        console.error('Error al crear solicitud de llamada:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET /api/calls/requests - Obtener solicitudes pendientes (solo admin)
router.get('/requests', async (req: Request, res: Response) => {
    try {
        const { status = 'pending' } = req.query;

        const requests = await query<CallRequest & { user_rfc: string }>(`
            SELECT cr.*, u.rfc as user_rfc
            FROM call_requests cr
            LEFT JOIN users u ON cr.user_id = u.id
            WHERE cr.status = $1
            ORDER BY cr.created_at DESC
        `, [status]);

        res.json({ callRequests: requests });

    } catch (error: any) {
        console.error('Error al obtener solicitudes:', error);
        res.status(500).json({ error: error.message });
    }
});

// PUT /api/calls/requests/:id/complete - Marcar como completada
router.put('/requests/:id/complete', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        await query(`
            UPDATE call_requests 
            SET status = 'completed', completed_at = NOW()
            WHERE id = $1
        `, [id]);

        res.json({ success: true });

    } catch (error: any) {
        console.error('Error al completar solicitud:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET /api/calls/history - Obtener historial de llamadas de un usuario
router.get('/history', async (req: Request, res: Response) => {
    try {
        const { userId, limit = '50', offset = '0' } = req.query;

        if (!userId) {
            return res.status(400).json({ error: 'userId es requerido' });
        }

        const history = await query(`
            SELECT
                ch.*,
                caller.name as caller_name,
                caller.avatar_url as caller_avatar,
                callee.name as callee_name,
                callee.avatar_url as callee_avatar
            FROM call_history ch
            LEFT JOIN users caller ON ch.caller_id = caller.id
            LEFT JOIN users callee ON ch.callee_id = callee.id
            WHERE ch.caller_id = $1 OR ch.callee_id = $1
            ORDER BY ch.started_at DESC
            LIMIT $2 OFFSET $3
        `, [userId, parseInt(limit as string), parseInt(offset as string)]);

        res.json({ callHistory: history });
    } catch (error: any) {
        console.error('Error al obtener historial de llamadas:', error);
        res.status(500).json({ error: error.message });
    }
});

// DELETE /api/calls/requests/:id - Cancelar/eliminar solicitud
router.delete('/requests/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        await query('DELETE FROM call_requests WHERE id = $1', [id]);

        res.json({ success: true });

    } catch (error: any) {
        console.error('Error al eliminar solicitud:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET /api/calls/turn-credentials - Obtener credenciales TURN para WebRTC
router.get('/turn-credentials', (req: Request, res: Response) => {
    try {
        const credentials = getTurnCredentials();
        res.json(credentials);
    } catch (error: any) {
        console.error('Error obteniendo credenciales TURN:', error);
        res.status(500).json({ error: 'Error obteniendo credenciales TURN', iceServers: [] });
    }
});

export { router as callRoutes };
