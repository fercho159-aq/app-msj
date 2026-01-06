import { Router, Request, Response } from 'express';
import {
    sendMessage,
    getMessageById,
    updateMessageStatus,
    markMessagesAsRead,
    markMessagesAsDelivered,
    deleteMessage
} from '../../services/messageService';

const router = Router();

// POST /api/messages - Enviar un mensaje
router.post('/', async (req: Request, res: Response) => {
    try {
        const { chatId, senderId, text, type, mediaUrl } = req.body;

        if (!chatId || !senderId) {
            return res.status(400).json({
                error: 'chatId y senderId son requeridos'
            });
        }

        // Debe haber texto o mediaUrl
        if (!text && !mediaUrl) {
            return res.status(400).json({
                error: 'Se requiere texto o un archivo adjunto'
            });
        }

        const message = await sendMessage({
            chat_id: chatId,
            sender_id: senderId,
            text,
            message_type: type || 'text',
            media_url: mediaUrl,
        });

        res.status(201).json({
            message: {
                id: message.id,
                chatId: message.chat_id,
                senderId: message.sender_id,
                text: message.text,
                type: message.message_type,
                mediaUrl: message.media_url,
                status: message.status,
                timestamp: message.created_at,
            },
            success: true
        });

    } catch (error: any) {
        console.error('Error al enviar mensaje:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET /api/messages/:id - Obtener un mensaje
router.get('/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const message = await getMessageById(id);

        if (!message) {
            return res.status(404).json({ error: 'Mensaje no encontrado' });
        }

        res.json({ message });

    } catch (error: any) {
        console.error('Error al obtener mensaje:', error);
        res.status(500).json({ error: error.message });
    }
});

// PUT /api/messages/:id/status - Actualizar estado del mensaje
router.put('/:id/status', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!['sent', 'delivered', 'read'].includes(status)) {
            return res.status(400).json({ error: 'Estado inválido' });
        }

        await updateMessageStatus(id, status);

        res.json({ success: true, message: 'Estado actualizado' });

    } catch (error: any) {
        console.error('Error al actualizar estado:', error);
        res.status(500).json({ error: error.message });
    }
});

// POST /api/messages/mark-delivered - Marcar mensajes como entregados
router.post('/mark-delivered', async (req: Request, res: Response) => {
    try {
        const { chatId, userId } = req.body;

        if (!chatId || !userId) {
            return res.status(400).json({ error: 'chatId y userId son requeridos' });
        }

        await markMessagesAsDelivered(chatId, userId);

        res.json({ success: true });

    } catch (error: any) {
        console.error('Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// POST /api/messages/mark-read - Marcar mensajes como leídos
router.post('/mark-read', async (req: Request, res: Response) => {
    try {
        const { chatId, userId } = req.body;

        if (!chatId || !userId) {
            return res.status(400).json({ error: 'chatId y userId son requeridos' });
        }

        await markMessagesAsRead(chatId, userId);

        res.json({ success: true });

    } catch (error: any) {
        console.error('Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// DELETE /api/messages/:id - Eliminar mensaje
router.delete('/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { userId } = req.body;

        if (!userId) {
            return res.status(400).json({ error: 'userId es requerido' });
        }

        const deleted = await deleteMessage(id, userId);

        if (!deleted) {
            return res.status(404).json({
                error: 'Mensaje no encontrado o no tienes permiso para eliminarlo'
            });
        }

        res.json({ success: true, message: 'Mensaje eliminado' });

    } catch (error: any) {
        console.error('Error al eliminar mensaje:', error);
        res.status(500).json({ error: error.message });
    }
});

export { router as messageRoutes };
