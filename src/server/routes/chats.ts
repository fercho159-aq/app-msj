import { Router, Request, Response } from 'express';
import {
    createChat,
    createGroupChat,
    getUserChats,
    getChatById,
    markChatAsRead,
    deleteChat,
    addGroupMembers,
    removeGroupMember
} from '../../services/chatService';
import { getChatMessages } from '../../services/messageService';
import { getChatLabels } from '../../services/labelService';
import { query, queryOne, transaction } from '../../database/config';

const router = Router();

const ADMIN_RFC = 'ADMIN000CONS';

// GET /api/chats - Obtener chats del usuario
router.get('/', async (req: Request, res: Response) => {
    try {
        const userId = req.query.userId as string;

        if (!userId) {
            return res.status(400).json({ error: 'userId es requerido como query param' });
        }

        const chats = await getUserChats(userId);

        // Formatear respuesta con etiquetas
        const formattedChats = await Promise.all(chats.map(async (chat) => {
            // Obtener etiquetas del chat
            let labels: any[] = [];
            try {
                labels = await getChatLabels(chat.id);
            } catch (e) {
                // Si falla, continuar sin etiquetas
            }

            return {
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
                    type: chat.last_message.message_type,
                    timestamp: chat.last_message.created_at,
                } : null,
                unreadCount: chat.unread_count,
                labels: labels,
                createdAt: chat.created_at,
                updatedAt: chat.updated_at,
            };
        }));

        res.json({ chats: formattedChats });

    } catch (error: any) {
        console.error('Error al obtener chats:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET /api/chats/unclaimed - Obtener usuarios sin reclamar (para consultores)
router.get('/unclaimed', async (req: Request, res: Response) => {
    try {
        const userId = req.query.userId as string;
        if (!userId) {
            return res.status(400).json({ error: 'userId es requerido como query param' });
        }

        // Verificar que es consultor
        const requester = await queryOne<{ role: string }>(
            `SELECT COALESCE(role, 'usuario') as role FROM users WHERE id = $1`,
            [userId]
        );
        if (!requester || requester.role !== 'consultor') {
            return res.status(403).json({ error: 'Solo consultores pueden ver usuarios sin reclamar' });
        }

        // Obtener admin user id
        const adminUser = await queryOne<{ id: string }>(
            `SELECT id FROM users WHERE rfc = $1`,
            [ADMIN_RFC]
        );
        if (!adminUser) {
            return res.json({ users: [] });
        }

        // Usuarios con role='usuario', claimed_by IS NULL, que tengan chat con ADMIN000CONS
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

        res.json({ users: unclaimedUsers });
    } catch (error: any) {
        console.error('Error al obtener usuarios sin reclamar:', error);
        res.status(500).json({ error: error.message });
    }
});

// POST /api/chats/:id/claim - Reclamar un usuario (transferir chat de ADMIN a consultor)
router.post('/:id/claim', async (req: Request, res: Response) => {
    try {
        const chatId = req.params.id;
        const { userId } = req.body; // userId del consultor que reclama

        if (!userId) {
            return res.status(400).json({ error: 'userId es requerido' });
        }

        // Verificar que es consultor
        const requester = await queryOne<{ role: string }>(
            `SELECT COALESCE(role, 'usuario') as role FROM users WHERE id = $1`,
            [userId]
        );
        if (!requester || requester.role !== 'consultor') {
            return res.status(403).json({ error: 'Solo consultores pueden reclamar usuarios' });
        }

        // Obtener admin user id
        const adminUser = await queryOne<{ id: string }>(
            `SELECT id FROM users WHERE rfc = $1`,
            [ADMIN_RFC]
        );
        if (!adminUser) {
            return res.status(404).json({ error: 'Admin user not found' });
        }

        // Verificar que el chat existe y tiene a ADMIN000CONS como participante
        const chatParticipant = await queryOne<{ user_id: string }>(
            `SELECT user_id FROM chat_participants WHERE chat_id = $1 AND user_id = $2`,
            [chatId, adminUser.id]
        );
        if (!chatParticipant) {
            return res.status(400).json({ error: 'Este chat no tiene al consultor base como participante' });
        }

        // Obtener el usuario del otro lado del chat
        const otherParticipant = await queryOne<{ user_id: string }>(
            `SELECT user_id FROM chat_participants WHERE chat_id = $1 AND user_id != $2`,
            [chatId, adminUser.id]
        );
        if (!otherParticipant) {
            return res.status(400).json({ error: 'No se encontró al usuario en este chat' });
        }

        // Verificar que el usuario no ha sido reclamado
        const targetUser = await queryOne<{ claimed_by: string | null }>(
            `SELECT claimed_by FROM users WHERE id = $1`,
            [otherParticipant.user_id]
        );
        if (targetUser?.claimed_by) {
            return res.status(409).json({ error: 'Este usuario ya fue reclamado por otro consultor' });
        }

        // Transacción: reclamar usuario y transferir chat
        await transaction(async (client) => {
            // 1. Marcar usuario como reclamado
            await client.query(
                `UPDATE users SET claimed_by = $1, claimed_at = NOW() WHERE id = $2 AND claimed_by IS NULL`,
                [userId, otherParticipant.user_id]
            );

            // 2. Reemplazar ADMIN000CONS por el consultor en el chat
            await client.query(
                `UPDATE chat_participants SET user_id = $1 WHERE chat_id = $2 AND user_id = $3`,
                [userId, chatId, adminUser.id]
            );

            // 3. Actualizar timestamp del chat
            await client.query(
                `UPDATE chats SET updated_at = NOW() WHERE id = $1`,
                [chatId]
            );
        });

        res.json({ success: true, message: 'Usuario reclamado exitosamente' });
    } catch (error: any) {
        console.error('Error al reclamar usuario:', error);
        res.status(500).json({ error: error.message });
    }
});

// POST /api/chats - Crear un nuevo chat
// Permisos:
// - Usuarios y asesores solo pueden crear chats con consultores
// - Solo consultores pueden crear grupos
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
            // createGroupChat valida que solo consultores pueden crear grupos
            chat = await createGroupChat(userId, participantIds, groupName);
        } else {
            if (!participantId) {
                return res.status(400).json({ error: 'participantId es requerido' });
            }
            // createChat valida permisos según roles
            chat = await createChat(userId, participantId);
        }

        res.status(201).json({
            chat,
            message: 'Chat creado exitosamente'
        });

    } catch (error: any) {
        console.error('Error al crear chat:', error);
        // Detectar errores de permisos y devolver 403
        if (error.message.includes('permiso') || error.message.includes('Solo los consultores')) {
            return res.status(403).json({ error: error.message });
        }
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

        // Formatear respuesta igual que el listado
        const formattedChat = {
            id: chat.id,
            isGroup: chat.is_group,
            groupName: chat.group_name,
            groupAvatar: chat.group_avatar_url,
            participants: chat.participants,
            createdAt: chat.created_at,
            updatedAt: chat.updated_at,
        };

        res.json({ chat: formattedChat });

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

// POST /api/chats/:id/members - Agregar miembros a un grupo
router.post('/:id/members', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { userId, memberIds } = req.body;

        if (!userId || !memberIds || memberIds.length === 0) {
            return res.status(400).json({ error: 'userId y memberIds son requeridos' });
        }

        const chat = await getChatById(id as string);
        if (!chat) {
            return res.status(404).json({ error: 'Chat no encontrado' });
        }

        if (!chat.is_group) {
            return res.status(400).json({ error: 'Solo se pueden agregar miembros a grupos' });
        }

        await addGroupMembers(id as string, memberIds);

        // Retornar chat actualizado
        const updatedChat = await getChatById(id as string);
        res.json({ chat: updatedChat });

    } catch (error: any) {
        console.error('Error al agregar miembros:', error);
        res.status(500).json({ error: error.message });
    }
});

// DELETE /api/chats/:id/members/:memberId - Eliminar miembro de un grupo
router.delete('/:id/members/:memberId', async (req: Request, res: Response) => {
    try {
        const { id, memberId } = req.params;

        const chat = await getChatById(id as string);
        if (!chat) {
            return res.status(404).json({ error: 'Chat no encontrado' });
        }

        if (!chat.is_group) {
            return res.status(400).json({ error: 'Solo se pueden eliminar miembros de grupos' });
        }

        await removeGroupMember(id as string, memberId as string);

        // Retornar chat actualizado
        const updatedChat = await getChatById(id as string);
        res.json({ chat: updatedChat });

    } catch (error: any) {
        console.error('Error al eliminar miembro:', error);
        res.status(500).json({ error: error.message });
    }
});

export { router as chatRoutes };
