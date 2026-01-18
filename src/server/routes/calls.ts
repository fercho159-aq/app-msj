import { Router, Request, Response } from 'express';
import { query, queryOne } from '../../database/config';

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

export { router as callRoutes };
