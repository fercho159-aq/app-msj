import { query, queryOne } from '../database/config';

export interface Message {
    id: string;
    chat_id: string;
    sender_id: string;
    text: string;
    message_type: 'text' | 'image' | 'audio' | 'video' | 'file';
    media_url: string | null;
    status: 'sent' | 'delivered' | 'read';
    created_at: Date;
    updated_at: Date;
}

export interface MessageWithSender extends Message {
    sender: {
        id: string;
        rfc: string;
        name: string | null;
        avatar_url: string | null;
    };
}

export interface SendMessageInput {
    chat_id: string;
    sender_id: string;
    text: string;
    message_type?: 'text' | 'image' | 'audio' | 'video' | 'file';
    media_url?: string;
}

// Enviar un mensaje
export async function sendMessage(input: SendMessageInput): Promise<Message> {
    const result = await query<Message>(`
    INSERT INTO messages (chat_id, sender_id, text, message_type, media_url, status)
    VALUES ($1, $2, $3, $4, $5, 'sent')
    RETURNING *
  `, [
        input.chat_id,
        input.sender_id,
        input.text,
        input.message_type || 'text',
        input.media_url || null
    ]);

    // Actualizar el timestamp del chat
    await query('UPDATE chats SET updated_at = NOW() WHERE id = $1', [input.chat_id]);

    return result[0];
}

// Obtener mensajes de un chat
export async function getChatMessages(
    chatId: string,
    limit: number = 50,
    offset: number = 0
): Promise<MessageWithSender[]> {
    return query<MessageWithSender>(`
    SELECT 
      m.*,
      json_build_object(
        'id', u.id,
        'rfc', u.rfc,
        'name', u.name,
        'avatar_url', u.avatar_url
      ) as sender
    FROM messages m
    JOIN users u ON m.sender_id = u.id
    WHERE m.chat_id = $1
    ORDER BY m.created_at ASC
    LIMIT $2 OFFSET $3
  `, [chatId, limit, offset]);
}

// Obtener un mensaje por ID
export async function getMessageById(messageId: string): Promise<Message | null> {
    return queryOne<Message>('SELECT * FROM messages WHERE id = $1', [messageId]);
}

// Actualizar estado del mensaje
export async function updateMessageStatus(
    messageId: string,
    status: 'sent' | 'delivered' | 'read'
): Promise<void> {
    await query('UPDATE messages SET status = $1 WHERE id = $2', [status, messageId]);
}

// Marcar mensajes como entregados
export async function markMessagesAsDelivered(chatId: string, userId: string): Promise<void> {
    await query(`
    UPDATE messages 
    SET status = 'delivered' 
    WHERE chat_id = $1 
    AND sender_id != $2 
    AND status = 'sent'
  `, [chatId, userId]);
}

// Marcar mensajes como leídos
export async function markMessagesAsRead(chatId: string, userId: string): Promise<void> {
    await query(`
    UPDATE messages 
    SET status = 'read' 
    WHERE chat_id = $1 
    AND sender_id != $2 
    AND status IN ('sent', 'delivered')
  `, [chatId, userId]);

    // También registrar en message_reads
    await query(`
    INSERT INTO message_reads (message_id, user_id)
    SELECT m.id, $2
    FROM messages m
    WHERE m.chat_id = $1 
    AND m.sender_id != $2
    AND NOT EXISTS (
      SELECT 1 FROM message_reads mr 
      WHERE mr.message_id = m.id AND mr.user_id = $2
    )
  `, [chatId, userId]);
}

// Buscar mensajes en un chat
export async function searchMessages(chatId: string, searchTerm: string): Promise<Message[]> {
    return query<Message>(`
    SELECT * FROM messages 
    WHERE chat_id = $1 AND text ILIKE $2
    ORDER BY created_at DESC
    LIMIT 50
  `, [chatId, `%${searchTerm}%`]);
}

// Eliminar un mensaje (soft delete podría implementarse)
export async function deleteMessage(messageId: string, userId: string): Promise<boolean> {
    const result = await query(
        'DELETE FROM messages WHERE id = $1 AND sender_id = $2 RETURNING id',
        [messageId, userId]
    );
    return result.length > 0;
}

// Obtener conteo de mensajes no leídos para un usuario
export async function getUnreadCount(userId: string): Promise<number> {
    const result = await queryOne<{ count: string }>(`
    SELECT COUNT(*)::text as count
    FROM messages m
    JOIN chat_participants cp ON m.chat_id = cp.chat_id AND cp.user_id = $1
    WHERE m.sender_id != $1
    AND m.created_at > COALESCE(cp.last_read_at, '1970-01-01')
  `, [userId]);

    return parseInt(result?.count || '0', 10);
}
