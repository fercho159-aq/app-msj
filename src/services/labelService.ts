import { query } from '../database/config';

export interface ChatLabel {
    id: string;
    name: string;
    color: string;
    icon: string;
    created_at: string;
}

export interface ChatLabelAssignment {
    id: string;
    chat_id: string;
    label_id: string;
    assigned_by: string | null;
    assigned_at: string;
    label?: ChatLabel;
}

/**
 * Obtener todas las etiquetas disponibles
 */
export async function getAllLabels(): Promise<ChatLabel[]> {
    return await query<ChatLabel>('SELECT * FROM chat_labels ORDER BY name');
}

/**
 * Obtener etiquetas de un chat específico
 */
export async function getChatLabels(chatId: string): Promise<ChatLabel[]> {
    return await query<ChatLabel>(`
        SELECT cl.*
        FROM chat_labels cl
        INNER JOIN chat_label_assignments cla ON cl.id = cla.label_id
        WHERE cla.chat_id = $1
        ORDER BY cl.name
    `, [chatId]);
}

/**
 * Asignar una etiqueta a un chat
 */
export async function assignLabelToChat(
    chatId: string,
    labelId: string,
    assignedBy?: string
): Promise<ChatLabelAssignment | null> {
    const rows = await query<ChatLabelAssignment>(`
        INSERT INTO chat_label_assignments (chat_id, label_id, assigned_by)
        VALUES ($1, $2, $3)
        ON CONFLICT (chat_id, label_id) DO NOTHING
        RETURNING *
    `, [chatId, labelId, assignedBy || null]);

    return rows[0] || null;
}

/**
 * Remover una etiqueta de un chat
 */
export async function removeLabelFromChat(
    chatId: string,
    labelId: string
): Promise<boolean> {
    const rows = await query(`
        DELETE FROM chat_label_assignments
        WHERE chat_id = $1 AND label_id = $2
        RETURNING id
    `, [chatId, labelId]);

    return rows.length > 0;
}

/**
 * Obtener chats por etiqueta
 */
export async function getChatsByLabel(labelId: string): Promise<string[]> {
    const rows = await query<{ chat_id: string }>(`
        SELECT chat_id FROM chat_label_assignments
        WHERE label_id = $1
    `, [labelId]);
    return rows.map(row => row.chat_id);
}

/**
 * Crear una nueva etiqueta personalizada
 */
export async function createLabel(
    name: string,
    color: string = '#6B7AED',
    icon: string = 'pricetag'
): Promise<ChatLabel | null> {
    const rows = await query<ChatLabel>(`
        INSERT INTO chat_labels (name, color, icon)
        VALUES ($1, $2, $3)
        RETURNING *
    `, [name, color, icon]);
    return rows[0] || null;
}

/**
 * Eliminar una etiqueta
 */
export async function deleteLabel(labelId: string): Promise<boolean> {
    const rows = await query(`
        DELETE FROM chat_labels WHERE id = $1
        RETURNING id
    `, [labelId]);
    return rows.length > 0;
}
