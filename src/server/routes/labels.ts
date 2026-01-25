import { Router, Request, Response } from 'express';
import {
    getAllLabels,
    getChatLabels,
    assignLabelToChat,
    removeLabelFromChat,
    createLabel,
    deleteLabel,
} from '../../services/labelService';

const router = Router();

// GET /api/labels - Obtener todas las etiquetas disponibles
router.get('/', async (req: Request, res: Response) => {
    try {
        const labels = await getAllLabels();
        res.json({ labels });
    } catch (error: any) {
        console.error('Error al obtener etiquetas:', error);
        res.status(500).json({ error: error.message });
    }
});

// POST /api/labels - Crear nueva etiqueta
router.post('/', async (req: Request, res: Response) => {
    try {
        const { name, color, icon } = req.body;

        if (!name) {
            return res.status(400).json({ error: 'El nombre es requerido' });
        }

        const label = await createLabel(name, color, icon);
        res.status(201).json({ label });
    } catch (error: any) {
        console.error('Error al crear etiqueta:', error);
        if (error.code === '23505') { // Unique violation
            return res.status(400).json({ error: 'Ya existe una etiqueta con ese nombre' });
        }
        res.status(500).json({ error: error.message });
    }
});

// DELETE /api/labels/:id - Eliminar etiqueta
router.delete('/:id', async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        const deleted = await deleteLabel(id);

        if (!deleted) {
            return res.status(404).json({ error: 'Etiqueta no encontrada' });
        }

        res.json({ success: true, message: 'Etiqueta eliminada' });
    } catch (error: any) {
        console.error('Error al eliminar etiqueta:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET /api/labels/chat/:chatId - Obtener etiquetas de un chat
router.get('/chat/:chatId', async (req: Request, res: Response) => {
    try {
        const chatId = req.params.chatId as string;
        const labels = await getChatLabels(chatId);
        res.json({ labels });
    } catch (error: any) {
        console.error('Error al obtener etiquetas del chat:', error);
        res.status(500).json({ error: error.message });
    }
});

// POST /api/labels/chat/:chatId - Asignar etiqueta a un chat
router.post('/chat/:chatId', async (req: Request, res: Response) => {
    try {
        const chatId = req.params.chatId as string;
        const { labelId, userId } = req.body;

        if (!labelId) {
            return res.status(400).json({ error: 'labelId es requerido' });
        }

        const assignment = await assignLabelToChat(chatId, labelId, userId);
        res.status(201).json({ assignment, success: true });
    } catch (error: any) {
        console.error('Error al asignar etiqueta:', error);
        res.status(500).json({ error: error.message });
    }
});

// DELETE /api/labels/chat/:chatId/:labelId - Remover etiqueta de un chat
router.delete('/chat/:chatId/:labelId', async (req: Request, res: Response) => {
    try {
        const chatId = req.params.chatId as string;
        const labelId = req.params.labelId as string;
        const removed = await removeLabelFromChat(chatId, labelId);

        if (!removed) {
            return res.status(404).json({ error: 'Asignación no encontrada' });
        }

        res.json({ success: true, message: 'Etiqueta removida del chat' });
    } catch (error: any) {
        console.error('Error al remover etiqueta:', error);
        res.status(500).json({ error: error.message });
    }
});

export { router as labelRoutes };
