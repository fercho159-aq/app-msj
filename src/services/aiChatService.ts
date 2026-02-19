import Anthropic from '@anthropic-ai/sdk';
import { query, queryOne } from '../database/config';
import { getDashboardSummary } from './dashboardService';

const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
});

interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
}

/**
 * Gather platform context for the AI agent
 */
async function gatherContext(): Promise<string> {
    const summary = await getDashboardSummary();

    // Recent messages sample (last 50)
    const recentMessages = await query<{
        sender_name: string;
        sender_rfc: string;
        message_type: string;
        text: string | null;
        chat_name: string | null;
        created_at: string;
    }>(`
        SELECT
            u.name as sender_name,
            u.rfc as sender_rfc,
            m.message_type,
            LEFT(m.text, 200) as text,
            c.name as chat_name,
            m.created_at::text
        FROM messages m
        JOIN users u ON u.id = m.sender_id
        JOIN chats c ON c.id = m.chat_id
        ORDER BY m.created_at DESC
        LIMIT 50
    `);

    // Users with most shared media
    const topMediaUsers = await query<{
        name: string;
        rfc: string;
        images: string;
        videos: string;
        files: string;
        total: string;
    }>(`
        SELECT
            u.name,
            u.rfc,
            COALESCE(SUM(CASE WHEN m.message_type = 'image' THEN 1 ELSE 0 END), 0)::text as images,
            COALESCE(SUM(CASE WHEN m.message_type = 'video' THEN 1 ELSE 0 END), 0)::text as videos,
            COALESCE(SUM(CASE WHEN m.message_type = 'file' THEN 1 ELSE 0 END), 0)::text as files,
            COALESCE(SUM(CASE WHEN m.message_type IN ('image', 'video', 'file') THEN 1 ELSE 0 END), 0)::text as total
        FROM users u
        LEFT JOIN messages m ON m.sender_id = u.id AND m.message_type IN ('image', 'video', 'file')
        GROUP BY u.id, u.name, u.rfc
        ORDER BY total DESC
        LIMIT 20
    `);

    // Active chats
    const activeChats = await query<{
        name: string;
        is_group: boolean;
        member_count: string;
        message_count: string;
        last_activity: string;
    }>(`
        SELECT
            c.name,
            c.is_group,
            (SELECT COUNT(*)::text FROM chat_members cm WHERE cm.chat_id = c.id) as member_count,
            (SELECT COUNT(*)::text FROM messages m WHERE m.chat_id = c.id) as message_count,
            (SELECT MAX(m.created_at)::text FROM messages m WHERE m.chat_id = c.id) as last_activity
        FROM chats c
        ORDER BY last_activity DESC NULLS LAST
        LIMIT 20
    `);

    // Recent reports
    const recentReports = await query<{
        reporter_name: string;
        reported_name: string;
        reason: string;
        status: string;
        created_at: string;
    }>(`
        SELECT
            reporter.name as reporter_name,
            reported.name as reported_name,
            cr.reason,
            cr.status,
            cr.created_at::text
        FROM content_reports cr
        JOIN users reporter ON reporter.id = cr.reporter_id
        JOIN users reported ON reported.id = cr.reported_user_id
        ORDER BY cr.created_at DESC
        LIMIT 15
    `);

    return `
=== RESUMEN DE LA PLATAFORMA ===
- Total de usuarios: ${summary.users.total}
- Roles: ${summary.users.byRole.map(r => `${r.role}: ${r.count}`).join(', ')}
- Total de chats: ${summary.chats.total} (${summary.chats.groups} grupales, ${summary.chats.individual} individuales)
- Total de mensajes: ${summary.messages.total}
- Tipos de mensaje: ${summary.messages.byType.map(t => `${t.type}: ${t.count}`).join(', ')}
- Solicitudes de llamada: ${summary.callRequests.total} (${summary.callRequests.byStatus.map(s => `${s.status}: ${s.count}`).join(', ')})
- Historial de llamadas: ${summary.callHistory.total} (${summary.callHistory.byStatus.map(s => `${s.status}: ${s.count}`).join(', ')})
- Reportes: ${summary.reports.total} (${summary.reports.byStatus.map(s => `${s.status}: ${s.count}`).join(', ')})
- Usuarios bloqueados: ${summary.blockedUsers}

=== USUARIOS CON MAS ARCHIVOS COMPARTIDOS ===
${topMediaUsers.map(u => `- ${u.name || 'Sin nombre'} (RFC: ${u.rfc}): ${u.images} imagenes, ${u.videos} videos, ${u.files} archivos = ${u.total} total`).join('\n')}

=== CHATS ACTIVOS (ULTIMOS 20) ===
${activeChats.map(c => `- ${c.name || 'Chat sin nombre'} (${c.is_group ? 'grupo' : 'individual'}): ${c.member_count} miembros, ${c.message_count} mensajes, ultima actividad: ${c.last_activity || 'N/A'}`).join('\n')}

=== MENSAJES RECIENTES (ULTIMOS 50) ===
${recentMessages.map(m => `- [${m.created_at}] ${m.sender_name || m.sender_rfc} en "${m.chat_name || 'chat'}": (${m.message_type}) ${m.text || '[media]'}`).join('\n')}

=== REPORTES RECIENTES ===
${recentReports.map(r => `- ${r.reporter_name} reporto a ${r.reported_name}: "${r.reason}" - Estado: ${r.status} (${r.created_at})`).join('\n')}
`.trim();
};

const SYSTEM_PROMPT = `Eres un asistente de IA para consultores de una aplicacion de mensajeria empresarial. Tu rol es ayudar a los consultores a entender y analizar la actividad de la plataforma.

Tienes acceso a datos en tiempo real de la plataforma que incluyen:
- Estadisticas generales (usuarios, mensajes, llamadas, reportes)
- Informacion de chats activos y su actividad
- Documentos, fotos y archivos compartidos por los clientes
- Mensajes recientes y patrones de comunicacion
- Reportes de contenido y estado de moderacion

Responde en español de manera clara y concisa. Cuando el consultor pregunte sobre datos especificos, utiliza la informacion del contexto proporcionado. Si no tienes la informacion exacta, indicalo honestamente.

Puedes ayudar con:
- Resumenes de actividad de la plataforma
- Analisis de patrones de uso
- Informacion sobre usuarios especificos y sus archivos compartidos
- Estado de reportes y moderacion
- Tendencias en la comunicacion
- Cualquier pregunta sobre los datos de la plataforma`;

/**
 * Send a message to the AI agent and get a response
 */
export async function sendAiChatMessage(
    messages: ChatMessage[],
): Promise<string> {
    const context = await gatherContext();

    // Build messages array for Claude, injecting context into the first user message
    const claudeMessages: Array<{ role: 'user' | 'assistant'; content: string }> = [];

    for (let i = 0; i < messages.length; i++) {
        const msg = messages[i];
        if (i === 0 && msg.role === 'user') {
            // Inject context into first user message
            claudeMessages.push({
                role: 'user',
                content: `[DATOS DE LA PLATAFORMA EN TIEMPO REAL]\n${context}\n\n[PREGUNTA DEL CONSULTOR]\n${msg.content}`,
            });
        } else {
            claudeMessages.push({ role: msg.role, content: msg.content });
        }
    }

    const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2048,
        system: SYSTEM_PROMPT,
        messages: claudeMessages,
    });

    const textBlock = response.content.find(block => block.type === 'text');
    return textBlock ? textBlock.text : 'No se pudo generar una respuesta.';
}
