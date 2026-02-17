import { query, queryOne } from '../database/config';

// ==================== BLOCKED USERS ====================

export interface BlockedUser {
    id: string;
    blocker_id: string;
    blocked_id: string;
    reason: string | null;
    created_at: Date;
}

// Bloquear un usuario
export async function blockUser(blockerId: string, blockedId: string, reason?: string): Promise<BlockedUser> {
    const result = await query<BlockedUser>(
        `INSERT INTO blocked_users (blocker_id, blocked_id, reason)
         VALUES ($1, $2, $3)
         ON CONFLICT (blocker_id, blocked_id) DO NOTHING
         RETURNING *`,
        [blockerId, blockedId, reason || null]
    );

    if (result.length === 0) {
        // Ya estaba bloqueado
        const existing = await queryOne<BlockedUser>(
            `SELECT * FROM blocked_users WHERE blocker_id = $1 AND blocked_id = $2`,
            [blockerId, blockedId]
        );
        return existing!;
    }

    return result[0];
}

// Desbloquear un usuario
export async function unblockUser(blockerId: string, blockedId: string): Promise<boolean> {
    const result = await query(
        `DELETE FROM blocked_users WHERE blocker_id = $1 AND blocked_id = $2 RETURNING id`,
        [blockerId, blockedId]
    );
    return result.length > 0;
}

// Verificar si un usuario está bloqueado
export async function isUserBlocked(blockerId: string, blockedId: string): Promise<boolean> {
    const result = await queryOne<{ exists: boolean }>(
        `SELECT EXISTS(
            SELECT 1 FROM blocked_users WHERE blocker_id = $1 AND blocked_id = $2
        ) as exists`,
        [blockerId, blockedId]
    );
    return result?.exists || false;
}

// Obtener lista de usuarios bloqueados por un usuario
export async function getBlockedUsers(userId: string): Promise<{ id: string; name: string | null; rfc: string; avatar_url: string | null; blocked_at: Date }[]> {
    return query(
        `SELECT u.id, u.name, u.rfc, u.avatar_url, bu.created_at as blocked_at
         FROM blocked_users bu
         JOIN users u ON bu.blocked_id = u.id
         WHERE bu.blocker_id = $1
         ORDER BY bu.created_at DESC`,
        [userId]
    );
}

// Obtener IDs de usuarios bloqueados (para filtrado)
export async function getBlockedUserIds(userId: string): Promise<string[]> {
    const result = await query<{ blocked_id: string }>(
        `SELECT blocked_id FROM blocked_users WHERE blocker_id = $1`,
        [userId]
    );
    return result.map(r => r.blocked_id);
}

// ==================== CONTENT REPORTS ====================

export type ReportReason = 'spam' | 'harassment' | 'inappropriate' | 'violence' | 'other';
export type ReportStatus = 'pending' | 'reviewed' | 'resolved' | 'dismissed';

export interface ContentReport {
    id: string;
    reporter_id: string;
    reported_user_id: string;
    message_id: string | null;
    chat_id: string | null;
    reason: ReportReason;
    description: string | null;
    status: ReportStatus;
    admin_notes: string | null;
    created_at: Date;
    resolved_at: Date | null;
}

// Crear un reporte
export async function createReport(
    reporterId: string,
    reportedUserId: string,
    reason: ReportReason,
    description?: string,
    messageId?: string,
    chatId?: string
): Promise<ContentReport> {
    const result = await query<ContentReport>(
        `INSERT INTO content_reports (reporter_id, reported_user_id, message_id, chat_id, reason, description)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [reporterId, reportedUserId, messageId || null, chatId || null, reason, description || null]
    );
    return result[0];
}

// Obtener reportes pendientes (para admin)
export async function getPendingReports(): Promise<(ContentReport & { reporter_name: string; reported_name: string; message_text?: string })[]> {
    return query(
        `SELECT cr.*,
                reporter.name as reporter_name,
                reported.name as reported_name,
                m.text as message_text
         FROM content_reports cr
         JOIN users reporter ON cr.reporter_id = reporter.id
         JOIN users reported ON cr.reported_user_id = reported.id
         LEFT JOIN messages m ON cr.message_id = m.id
         WHERE cr.status = 'pending'
         ORDER BY cr.created_at DESC`
    );
}

// Obtener todos los reportes (para admin)
export async function getAllReports(status?: ReportStatus): Promise<(ContentReport & { reporter_name: string; reported_name: string })[]> {
    let sql = `
        SELECT cr.*,
               reporter.name as reporter_name,
               reported.name as reported_name
        FROM content_reports cr
        JOIN users reporter ON cr.reporter_id = reporter.id
        JOIN users reported ON cr.reported_user_id = reported.id
    `;
    const params: any[] = [];

    if (status) {
        sql += ` WHERE cr.status = $1`;
        params.push(status);
    }

    sql += ` ORDER BY cr.created_at DESC LIMIT 100`;

    return query(sql, params);
}

// Resolver un reporte (admin)
export async function resolveReport(
    reportId: string,
    status: 'resolved' | 'dismissed',
    adminNotes?: string
): Promise<ContentReport | null> {
    const result = await query<ContentReport>(
        `UPDATE content_reports
         SET status = $1, admin_notes = $2, resolved_at = NOW()
         WHERE id = $3
         RETURNING *`,
        [status, adminNotes || null, reportId]
    );
    return result[0] || null;
}
