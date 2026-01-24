import { query, queryOne, transaction } from '../database/config';

export interface Chat {
  id: string;
  is_group: boolean;
  group_name: string | null;
  group_avatar_url: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface ChatWithDetails extends Chat {
  participants: {
    id: string;
    rfc: string;
    name: string | null;
    avatar_url: string | null;
    // status removed
  }[];
  last_message?: {
    id: string;
    text: string;
    sender_id: string;
    status: string; // Message status (sent/read/etc) - Keep this!
    message_type: 'text' | 'image' | 'audio' | 'video' | 'file';
    created_at: Date;
  };
  unread_count: number;
}

// Crear un chat entre dos usuarios
export async function createChat(userId1: string, userId2: string): Promise<Chat> {
  // Verificar si ya existe un chat entre estos usuarios
  const existingChat = await queryOne<Chat>(`
    SELECT c.* FROM chats c
    JOIN chat_participants cp1 ON c.id = cp1.chat_id AND cp1.user_id = $1
    JOIN chat_participants cp2 ON c.id = cp2.chat_id AND cp2.user_id = $2
    WHERE c.is_group = false
  `, [userId1, userId2]);

  if (existingChat) {
    return existingChat;
  }

  // Crear nuevo chat
  return transaction(async (client) => {
    const chatResult = await client.query(
      'INSERT INTO chats (is_group) VALUES (false) RETURNING *'
    );
    const chat = chatResult.rows[0];

    // Agregar participantes
    await client.query(
      'INSERT INTO chat_participants (chat_id, user_id) VALUES ($1, $2), ($1, $3)',
      [chat.id, userId1, userId2]
    );

    return chat;
  });
}

// Crear un chat grupal
export async function createGroupChat(
  creatorId: string,
  participantIds: string[],
  groupName: string,
  groupAvatarUrl?: string
): Promise<Chat> {
  return transaction(async (client) => {
    const chatResult = await client.query(
      `INSERT INTO chats (is_group, group_name, group_avatar_url) 
       VALUES (true, $1, $2) RETURNING *`,
      [groupName, groupAvatarUrl]
    );
    const chat = chatResult.rows[0];

    // Agregar creador y participantes
    const allParticipants = [creatorId, ...participantIds];
    for (const participantId of allParticipants) {
      await client.query(
        'INSERT INTO chat_participants (chat_id, user_id) VALUES ($1, $2)',
        [chat.id, participantId]
      );
    }

    return chat;
  });
}

// Obtener chats de un usuario con detalles
export async function getUserChats(userId: string): Promise<ChatWithDetails[]> {
  const chats = await query<any>(`
    SELECT 
      c.*,
      (
        SELECT json_agg(json_build_object(
          'id', u.id,
          'rfc', u.rfc,
          'name', u.name,
          'avatar_url', u.avatar_url
        ))
        FROM chat_participants cp2
        JOIN users u ON cp2.user_id = u.id
        WHERE cp2.chat_id = c.id
      ) as participants,
      (
        SELECT json_build_object(
          'id', m.id,
          'text', m.text,
          'sender_id', m.sender_id,
          'status', m.status,
          'message_type', m.message_type,
          'created_at', m.created_at
        )
        FROM messages m
        WHERE m.chat_id = c.id
        ORDER BY m.created_at DESC
        LIMIT 1
      ) as last_message,
      (
        SELECT COUNT(*)::int
        FROM messages m
        WHERE m.chat_id = c.id
        AND m.created_at > COALESCE(cp.last_read_at, '1970-01-01')
        AND m.sender_id != $1
      ) as unread_count
    FROM chats c
    JOIN chat_participants cp ON c.id = cp.chat_id AND cp.user_id = $1
    ORDER BY c.updated_at DESC
  `, [userId]);

  return chats as ChatWithDetails[];
}

// Obtener un chat por ID
export async function getChatById(chatId: string): Promise<ChatWithDetails | null> {
  const chats = await query<any>(`
    SELECT 
      c.*,
      (
        SELECT json_agg(json_build_object(
          'id', u.id,
          'rfc', u.rfc,
          'name', u.name,
          'avatar_url', u.avatar_url
        ))
        FROM chat_participants cp2
        JOIN users u ON cp2.user_id = u.id
        WHERE cp2.chat_id = c.id
      ) as participants
    FROM chats c
    WHERE c.id = $1
  `, [chatId]);

  return chats[0] || null;
}

// Marcar mensajes como leídos
export async function markChatAsRead(chatId: string, userId: string): Promise<void> {
  await query(
    `UPDATE chat_participants 
     SET last_read_at = NOW() 
     WHERE chat_id = $1 AND user_id = $2`,
    [chatId, userId]
  );
}

// Eliminar un chat completo y todos sus mensajes
export async function deleteChat(chatId: string): Promise<{ success: boolean; message: string }> {
  return transaction(async (client) => {
    // Primero eliminar todos los mensajes del chat
    await client.query(
      'DELETE FROM messages WHERE chat_id = $1',
      [chatId]
    );

    // Luego eliminar los participantes del chat
    await client.query(
      'DELETE FROM chat_participants WHERE chat_id = $1',
      [chatId]
    );

    // Finalmente eliminar el chat
    const result = await client.query(
      'DELETE FROM chats WHERE id = $1 RETURNING id',
      [chatId]
    );

    if (result.rowCount === 0) {
      throw new Error('Chat no encontrado');
    }

    return {
      success: true,
      message: 'Chat eliminado correctamente'
    };
  });
}
