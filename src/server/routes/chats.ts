import { Router, Request, Response } from 'express';
import {
    createChat,
    createGroupChat,
    getUserChats,
    getChatById,
    markChatAsRead,
    deleteChat
} from '../../services/chatService';
import { getChatMessages } from '../../services/messageService';

const router = Router();

// GET /api/chats - Obtener chats del usuario
router.get('/', async (req: Request, res: Response) => {
    try {
        const userId = req.query.userId as string;

        if (!userId) {
            return res.status(400).json({ error: 'userId es requerido como query param' });
        }

        const chats = await getUserChats(userId);

        // Formatear respuesta
        const formattedChats = chats.map(chat => ({
            id: chat.id,
            isGroup: chat.is_group,
            groupName: chat.group_name,
            groupAvatar: chat.group_avatar_url,
            participants: chat.participants,
            lastMessage: chat.last_message ? {
                id: chat.last_message.id,
                text: chat.last_message.text,
                senderId: chat.last_message.sender_id,
                status: chat.last_message.status,
                timestamp: chat.last_message.created_at,
            } : null,
            unreadCount: chat.unread_count,
            createdAt: chat.created_at,
            updatedAt: chat.updated_at,
        }));

        res.json({ chats: formattedChats });

    } catch (error: any) {
        console.error('Error al obtener chats:', error);
        res.status(500).json({ error: error.message });
    }
});

// POST /api/chats - Crear un nuevo chat
router.post('/', async (req: Request, res: Response) => {
    try {
        const { userId, participantId, isGroup, groupName, participantIds } = req.body;

        if (!userId) {
            return res.status(400).json({ error: 'userId es requerido' });
        }

        let chat;

        if (isGroup) {
            if (!groupName || !participantIds || participantIds.length === 0) {
                return res.status(400).json({
                    error: 'Para grupos se requiere groupName y participantIds'
                });
            }
            chat = await createGroupChat(userId, participantIds, groupName);
        } else {
            if (!participantId) {
                return res.status(400).json({ error: 'participantId es requerido' });
            }
            chat = await createChat(userId, participantId);
        }

        res.status(201).json({
            chat,
            message: 'Chat creado exitosamente'
        });

    } catch (error: any) {
        console.error('Error al crear chat:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET /api/chats/:id - Obtener un chat específico
router.get('/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const chat = await getChatById(id as string);

        if (!chat) {
            return res.status(404).json({ error: 'Chat no encontrado' });
        }

        res.json({ chat });

    } catch (error: any) {
        console.error('Error al obtener chat:', error);
        res.status(500).json({ error: error.message });
    }
});

// DELETE /api/chats/:id - Eliminar un chat completo
router.delete('/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        // Verificar que el chat existe
        const chat = await getChatById(id as string);
        if (!chat) {
            return res.status(404).json({ error: 'Chat no encontrado' });
        }

        // Eliminar el chat y todos sus mensajes
        const result = await deleteChat(id as string);

        res.json(result);

    } catch (error: any) {
        console.error('Error al eliminar chat:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET /api/chats/:id/messages - Obtener mensajes de un chat
router.get('/:id/messages', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const limit = parseInt(req.query.limit as string) || 50;
        const offset = parseInt(req.query.offset as string) || 0;

        const messages = await getChatMessages(id as string, limit, offset);

        // Formatear respuesta
        const formattedMessages = messages.map(msg => ({
            id: msg.id,
            chatId: msg.chat_id,
            senderId: msg.sender_id,
            sender: msg.sender,
            text: msg.text,
            type: msg.message_type,
            mediaUrl: msg.media_url,
            status: msg.status,
            timestamp: msg.created_at,
        }));

        res.json({ messages: formattedMessages });

    } catch (error: any) {
        console.error('Error al obtener mensajes:', error);
        res.status(500).json({ error: error.message });
    }
});

// POST /api/chats/:id/read - Marcar chat como leído
router.post('/:id/read', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { userId } = req.body;

        if (!userId) {
            return res.status(400).json({ error: 'userId es requerido' });
        }

        await markChatAsRead(id as string, userId);

        res.json({ success: true, message: 'Chat marcado como leído' });

    } catch (error: any) {
        console.error('Error al marcar como leído:', error);
        res.status(500).json({ error: error.message });
    }
});

export { router as chatRoutes };
