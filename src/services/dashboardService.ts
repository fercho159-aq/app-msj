import { query, queryOne } from '../database/config';

// ==================== SUMMARY ====================

export interface DashboardSummary {
    users: { total: number; byRole: { role: string; count: number }[] };
    chats: { total: number; groups: number; individual: number };
    messages: { total: number; byType: { type: string; count: number }[] };
    callRequests: { total: number; byStatus: { status: string; count: number }[] };
    callHistory: { total: number; byStatus: { status: string; count: number }[] };
    reports: { total: number; byStatus: { status: string; count: number }[] };
    blockedUsers: number;
}

export async function getDashboardSummary(): Promise<DashboardSummary> {
    const [
        usersTotal,
        usersByRole,
        chatsTotal,
        chatsGroups,
        messagesTotal,
        messagesByType,
        callRequestsTotal,
        callRequestsByStatus,
        callHistoryTotal,
        callHistoryByStatus,
        reportsTotal,
        reportsByStatus,
        blockedUsers,
    ] = await Promise.all([
        queryOne<{ count: string }>('SELECT COUNT(*)::text as count FROM users'),
        query<{ role: string; count: string }>(`
            SELECT COALESCE(role, 'usuario') as role, COUNT(*)::text as count
            FROM users GROUP BY COALESCE(role, 'usuario')
        `),
        queryOne<{ count: string }>('SELECT COUNT(*)::text as count FROM chats'),
        queryOne<{ count: string }>(`SELECT COUNT(*)::text as count FROM chats WHERE is_group = true`),
        queryOne<{ count: string }>('SELECT COUNT(*)::text as count FROM messages'),
        query<{ type: string; count: string }>(`
            SELECT message_type as type, COUNT(*)::text as count
            FROM messages GROUP BY message_type
        `),
        queryOne<{ count: string }>('SELECT COUNT(*)::text as count FROM call_requests'),
        query<{ status: string; count: string }>(`
            SELECT status, COUNT(*)::text as count
            FROM call_requests GROUP BY status
        `),
        queryOne<{ count: string }>('SELECT COUNT(*)::text as count FROM call_history'),
        query<{ status: string; count: string }>(`
            SELECT status, COUNT(*)::text as count
            FROM call_history GROUP BY status
        `),
        queryOne<{ count: string }>('SELECT COUNT(*)::text as count FROM content_reports'),
        query<{ status: string; count: string }>(`
            SELECT status, COUNT(*)::text as count
            FROM content_reports GROUP BY status
        `),
        queryOne<{ count: string }>(`
            SELECT COUNT(DISTINCT blocked_id)::text as count FROM blocked_users
        `),
    ]);

    const totalChats = parseInt(chatsTotal?.count || '0', 10);
    const groupChats = parseInt(chatsGroups?.count || '0', 10);

    return {
        users: {
            total: parseInt(usersTotal?.count || '0', 10),
            byRole: usersByRole.map(r => ({ role: r.role, count: parseInt(r.count, 10) })),
        },
        chats: {
            total: totalChats,
            groups: groupChats,
            individual: totalChats - groupChats,
        },
        messages: {
            total: parseInt(messagesTotal?.count || '0', 10),
            byType: messagesByType.map(m => ({ type: m.type, count: parseInt(m.count, 10) })),
        },
        callRequests: {
            total: parseInt(callRequestsTotal?.count || '0', 10),
            byStatus: callRequestsByStatus.map(c => ({ status: c.status, count: parseInt(c.count, 10) })),
        },
        callHistory: {
            total: parseInt(callHistoryTotal?.count || '0', 10),
            byStatus: callHistoryByStatus.map(c => ({ status: c.status, count: parseInt(c.count, 10) })),
        },
        reports: {
            total: parseInt(reportsTotal?.count || '0', 10),
            byStatus: reportsByStatus.map(r => ({ status: r.status, count: parseInt(r.count, 10) })),
        },
        blockedUsers: parseInt(blockedUsers?.count || '0', 10),
    };
}

// ==================== ACTIVITY ====================

export interface ActivityPoint {
    date: string;
    count: number;
}

export interface DashboardActivity {
    messages: ActivityPoint[];
    newUsers: ActivityPoint[];
    callRequests: ActivityPoint[];
    reports: ActivityPoint[];
}

export async function getDashboardActivity(period: '7d' | '30d' | '90d'): Promise<DashboardActivity> {
    const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;

    const [messages, newUsers, callRequests, reports] = await Promise.all([
        query<{ date: string; count: string }>(`
            SELECT DATE(created_at)::text as date, COUNT(*)::text as count
            FROM messages
            WHERE created_at >= NOW() - INTERVAL '${days} days'
            GROUP BY DATE(created_at)
            ORDER BY date
        `),
        query<{ date: string; count: string }>(`
            SELECT DATE(created_at)::text as date, COUNT(*)::text as count
            FROM users
            WHERE created_at >= NOW() - INTERVAL '${days} days'
            GROUP BY DATE(created_at)
            ORDER BY date
        `),
        query<{ date: string; count: string }>(`
            SELECT DATE(created_at)::text as date, COUNT(*)::text as count
            FROM call_requests
            WHERE created_at >= NOW() - INTERVAL '${days} days'
            GROUP BY DATE(created_at)
            ORDER BY date
        `),
        query<{ date: string; count: string }>(`
            SELECT DATE(created_at)::text as date, COUNT(*)::text as count
            FROM content_reports
            WHERE created_at >= NOW() - INTERVAL '${days} days'
            GROUP BY DATE(created_at)
            ORDER BY date
        `),
    ]);

    const toPoints = (rows: { date: string; count: string }[]): ActivityPoint[] =>
        rows.map(r => ({ date: r.date, count: parseInt(r.count, 10) }));

    return {
        messages: toPoints(messages),
        newUsers: toPoints(newUsers),
        callRequests: toPoints(callRequests),
        reports: toPoints(reports),
    };
}

// ==================== USERS MEDIA ====================

export interface UserMediaRow {
    id: string;
    name: string | null;
    rfc: string;
    avatar_url: string | null;
    images: number;
    videos: number;
    files: number;
    total: number;
}

export interface UsersMediaResult {
    users: UserMediaRow[];
    total: number;
    page: number;
    limit: number;
}

export async function getUsersMedia(
    page: number = 1,
    limit: number = 20,
    search?: string
): Promise<UsersMediaResult> {
    const offset = (page - 1) * limit;

    const whereClause = search ? `WHERE (u.name ILIKE $1 OR u.rfc ILIKE $1)` : '';
    const searchPattern = `%${search}%`;

    const countResult = await queryOne<{ count: string }>(
        `SELECT COUNT(*)::text as count FROM users u ${whereClause}`,
        search ? [searchPattern] : []
    );

    // When search is present, $1=searchPattern, $2=limit, $3=offset
    // When no search, $1=limit, $2=offset
    const params = search
        ? [searchPattern, limit, offset]
        : [limit, offset];
    const limitParam = search ? '$2' : '$1';
    const offsetParam = search ? '$3' : '$2';

    const users = await query<UserMediaRow>(`
        SELECT
            u.id,
            u.name,
            u.rfc,
            u.avatar_url,
            COALESCE(SUM(CASE WHEN m.message_type = 'image' THEN 1 ELSE 0 END), 0)::int as images,
            COALESCE(SUM(CASE WHEN m.message_type = 'video' THEN 1 ELSE 0 END), 0)::int as videos,
            COALESCE(SUM(CASE WHEN m.message_type = 'file' THEN 1 ELSE 0 END), 0)::int as files,
            COALESCE(SUM(CASE WHEN m.message_type IN ('image', 'video', 'file') THEN 1 ELSE 0 END), 0)::int as total
        FROM users u
        LEFT JOIN messages m ON m.sender_id = u.id AND m.message_type IN ('image', 'video', 'file')
        ${whereClause}
        GROUP BY u.id, u.name, u.rfc, u.avatar_url
        ORDER BY total DESC
        LIMIT ${limitParam} OFFSET ${offsetParam}
    `, params);

    return {
        users,
        total: parseInt(countResult?.count || '0', 10),
        page,
        limit,
    };
}

// ==================== USER MEDIA DETAIL ====================

export interface UserMediaDetail {
    id: string;
    message_type: string;
    media_url: string;
    text: string | null;
    chat_id: string;
    created_at: string;
}

export async function getUserMediaDetail(userId: string): Promise<UserMediaDetail[]> {
    return query<UserMediaDetail>(`
        SELECT id, message_type, media_url, text, chat_id, created_at::text
        FROM messages
        WHERE sender_id = $1 AND message_type IN ('image', 'video', 'file') AND media_url IS NOT NULL
        ORDER BY created_at DESC
        LIMIT 100
    `, [userId]);
}
