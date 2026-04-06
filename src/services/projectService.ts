import { query, queryOne, transaction } from '../database/config';

// ==================== CLIENTS ====================

export interface ClientRow {
    id: string;
    rfc: string;
    name: string | null;
    avatar_url: string | null;
    phone: string | null;
    razon_social: string | null;
    regimen_fiscal: string | null;
    efirma_expiry: string | null;
    csd_expiry: string | null;
    projects_count: number;
}

export interface ClientsResult {
    clients: ClientRow[];
    total: number;
    page: number;
    limit: number;
}

export async function getClients(
    page: number = 1,
    limit: number = 20,
    search?: string
): Promise<ClientsResult> {
    const offset = (page - 1) * limit;

    const whereClause = search
        ? `WHERE COALESCE(u.role, 'usuario') != 'consultor' AND (u.rfc ILIKE $1 OR u.name ILIKE $1 OR u.razon_social ILIKE $1)`
        : `WHERE COALESCE(u.role, 'usuario') != 'consultor'`;
    const searchPattern = `%${search}%`;

    const countResult = await queryOne<{ count: string }>(
        `SELECT COUNT(*)::text as count FROM users u ${whereClause}`,
        search ? [searchPattern] : []
    );

    const params = search
        ? [searchPattern, limit, offset]
        : [limit, offset];
    const limitParam = search ? '$2' : '$1';
    const offsetParam = search ? '$3' : '$2';

    const clients = await query<ClientRow>(`
        SELECT
            u.id,
            u.rfc,
            u.name,
            u.avatar_url,
            u.phone,
            u.razon_social,
            u.regimen_fiscal,
            u.efirma_expiry::text,
            u.csd_expiry::text,
            COALESCE(p.cnt, 0)::int as projects_count
        FROM users u
        LEFT JOIN (
            SELECT client_id, COUNT(*)::int as cnt FROM projects GROUP BY client_id
        ) p ON p.client_id = u.id
        ${whereClause}
        ORDER BY u.name ASC NULLS LAST, u.rfc ASC
        LIMIT ${limitParam} OFFSET ${offsetParam}
    `, params);

    return {
        clients,
        total: parseInt(countResult?.count || '0', 10),
        page,
        limit,
    };
}

export async function createClient(data: {
    rfc: string;
    name?: string;
    razon_social?: string;
    phone?: string;
    tipo_persona?: string;
    regimen_fiscal?: string;
    codigo_postal?: string;
    estado?: string;
    domicilio?: string;
    curp?: string;
}): Promise<ClientFiscalProfile> {
    const result = await queryOne<ClientFiscalProfile>(`
        INSERT INTO users (rfc, name, razon_social, phone, tipo_persona, regimen_fiscal, codigo_postal, estado, domicilio, curp, role)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'usuario')
        RETURNING id, rfc, name, avatar_url, phone, razon_social, tipo_persona,
            curp, regimen_fiscal, codigo_postal, estado, domicilio,
            capital::text, efirma_expiry::text, csd_expiry::text,
            created_at::text
    `, [
        data.rfc,
        data.name || null,
        data.razon_social || null,
        data.phone || null,
        data.tipo_persona || null,
        data.regimen_fiscal || null,
        data.codigo_postal || null,
        data.estado || null,
        data.domicilio || null,
        data.curp || null,
    ]);

    if (!result) throw new Error('Error al crear cliente');
    return result;
}

// ==================== CLIENT FISCAL PROFILE ====================

export interface ClientFiscalProfile {
    id: string;
    rfc: string;
    name: string | null;
    avatar_url: string | null;
    phone: string | null;
    razon_social: string | null;
    tipo_persona: string | null;
    curp: string | null;
    regimen_fiscal: string | null;
    codigo_postal: string | null;
    estado: string | null;
    domicilio: string | null;
    capital: string | null;
    efirma_expiry: string | null;
    csd_expiry: string | null;
    created_at: string;
}

export async function getClientFiscalProfile(clientId: string): Promise<ClientFiscalProfile | null> {
    return queryOne<ClientFiscalProfile>(`
        SELECT
            id, rfc, name, avatar_url, phone, razon_social, tipo_persona,
            curp, regimen_fiscal, codigo_postal, estado, domicilio,
            capital::text, efirma_expiry::text, csd_expiry::text,
            created_at::text
        FROM users
        WHERE id = $1
    `, [clientId]);
}

export async function updateClientFiscalFields(
    clientId: string,
    data: { capital?: number; efirma_expiry?: string; csd_expiry?: string }
): Promise<ClientFiscalProfile | null> {
    const sets: string[] = [];
    const params: any[] = [];
    let idx = 1;

    if (data.capital !== undefined) {
        sets.push(`capital = $${idx++}`);
        params.push(data.capital);
    }
    if (data.efirma_expiry !== undefined) {
        sets.push(`efirma_expiry = $${idx++}`);
        params.push(data.efirma_expiry || null);
    }
    if (data.csd_expiry !== undefined) {
        sets.push(`csd_expiry = $${idx++}`);
        params.push(data.csd_expiry || null);
    }

    if (sets.length === 0) return getClientFiscalProfile(clientId);

    params.push(clientId);
    await query(
        `UPDATE users SET ${sets.join(', ')} WHERE id = $${idx}`,
        params
    );

    return getClientFiscalProfile(clientId);
}

// ==================== PROJECTS ====================

export interface ProjectRow {
    id: string;
    client_id: string;
    client_name: string | null;
    client_rfc: string;
    name: string;
    service_type: string;
    description: string | null;
    status: string;
    created_by: string;
    total_phases: number;
    completed_phases: number;
    created_at: string;
    updated_at: string;
}

export interface ProjectDetail {
    id: string;
    client_id: string;
    name: string;
    service_type: string;
    description: string | null;
    status: string;
    created_by: string;
    created_at: string;
    updated_at: string;
    phases: PhaseRow[];
}

export async function getProjects(filters: {
    clientId?: string;
    status?: string;
    page?: number;
    limit?: number;
}): Promise<{ projects: ProjectRow[]; total: number }> {
    const conditions: string[] = [];
    const params: any[] = [];
    let idx = 1;

    if (filters.clientId) {
        conditions.push(`p.client_id = $${idx++}`);
        params.push(filters.clientId);
    }
    if (filters.status) {
        conditions.push(`p.status = $${idx++}`);
        params.push(filters.status);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const page = filters.page || 1;
    const limit = filters.limit || 50;
    const offset = (page - 1) * limit;

    const countResult = await queryOne<{ count: string }>(
        `SELECT COUNT(*)::text as count FROM projects p ${whereClause}`,
        params
    );

    params.push(limit, offset);
    const limitIdx = idx++;
    const offsetIdx = idx++;

    const projects = await query<ProjectRow>(`
        SELECT
            p.id, p.client_id, u.name as client_name, u.rfc as client_rfc,
            p.name, p.service_type, p.description, p.status,
            p.created_by,
            COALESCE(ph.total, 0)::int as total_phases,
            COALESCE(ph.completed, 0)::int as completed_phases,
            p.created_at::text, p.updated_at::text
        FROM projects p
        JOIN users u ON u.id = p.client_id
        LEFT JOIN (
            SELECT project_id,
                COUNT(*)::int as total,
                SUM(CASE WHEN status = 'completado' THEN 1 ELSE 0 END)::int as completed
            FROM project_phases GROUP BY project_id
        ) ph ON ph.project_id = p.id
        ${whereClause}
        ORDER BY p.created_at DESC
        LIMIT $${limitIdx} OFFSET $${offsetIdx}
    `, params);

    return {
        projects,
        total: parseInt(countResult?.count || '0', 10),
    };
}

export async function getProjectById(projectId: string): Promise<ProjectDetail | null> {
    const project = await queryOne<Omit<ProjectDetail, 'phases'>>(`
        SELECT id, client_id, name, service_type, description, status,
               created_by, created_at::text, updated_at::text
        FROM projects WHERE id = $1
    `, [projectId]);

    if (!project) return null;

    const phases = await query<PhaseRow>(`
        SELECT
            pp.id, pp.project_id, pp.name, pp.description, pp.status,
            pp.executor_id, eu.name as executor_name,
            pp.sort_order, pp.deadline::text,
            pp.depends_on_phase_id, dep.name as depends_on_phase_name,
            pp.started_at::text, pp.completed_at::text,
            pp.created_at::text, pp.updated_at::text,
            COALESCE(d.cnt, 0)::int as docs_count,
            COALESCE(c.cnt, 0)::int as checklist_total,
            COALESCE(c.done, 0)::int as checklist_done
        FROM project_phases pp
        LEFT JOIN users eu ON eu.id = pp.executor_id
        LEFT JOIN project_phases dep ON dep.id = pp.depends_on_phase_id
        LEFT JOIN (SELECT phase_id, COUNT(*)::int as cnt FROM phase_documents GROUP BY phase_id) d ON d.phase_id = pp.id
        LEFT JOIN (
            SELECT phase_id, COUNT(*)::int as cnt,
                   SUM(CASE WHEN is_completed THEN 1 ELSE 0 END)::int as done
            FROM phase_checklist_items GROUP BY phase_id
        ) c ON c.phase_id = pp.id
        WHERE pp.project_id = $1
        ORDER BY pp.sort_order ASC, pp.created_at ASC
    `, [projectId]);

    return { ...project, phases };
}

export async function createProject(data: {
    clientId: string;
    name: string;
    serviceType: string;
    description?: string;
    createdBy: string;
}): Promise<ProjectDetail> {
    const result = await queryOne<{ id: string }>(`
        INSERT INTO projects (client_id, name, service_type, description, created_by)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id
    `, [data.clientId, data.name, data.serviceType, data.description || null, data.createdBy]);

    return (await getProjectById(result!.id))!;
}

export async function updateProject(
    projectId: string,
    data: { name?: string; serviceType?: string; description?: string; status?: string }
): Promise<ProjectDetail | null> {
    const sets: string[] = [];
    const params: any[] = [];
    let idx = 1;

    if (data.name) { sets.push(`name = $${idx++}`); params.push(data.name); }
    if (data.serviceType) { sets.push(`service_type = $${idx++}`); params.push(data.serviceType); }
    if (data.description !== undefined) { sets.push(`description = $${idx++}`); params.push(data.description); }
    if (data.status) { sets.push(`status = $${idx++}`); params.push(data.status); }

    if (sets.length === 0) return getProjectById(projectId);

    params.push(projectId);
    await query(`UPDATE projects SET ${sets.join(', ')} WHERE id = $${idx}`, params);
    return getProjectById(projectId);
}

// ==================== PHASES ====================

export interface PhaseRow {
    id: string;
    project_id: string;
    name: string;
    description: string | null;
    status: string;
    executor_id: string | null;
    executor_name: string | null;
    sort_order: number;
    deadline: string | null;
    depends_on_phase_id: string | null;
    depends_on_phase_name: string | null;
    started_at: string | null;
    completed_at: string | null;
    created_at: string;
    updated_at: string;
    docs_count: number;
    checklist_total: number;
    checklist_done: number;
}

export async function createPhase(data: {
    projectId: string;
    name: string;
    description?: string;
    executorId?: string;
    deadline?: string;
    dependsOnPhaseId?: string;
}): Promise<PhaseRow> {
    const maxOrder = await queryOne<{ max_order: number }>(
        `SELECT COALESCE(MAX(sort_order), -1)::int + 1 as max_order FROM project_phases WHERE project_id = $1`,
        [data.projectId]
    );

    const result = await queryOne<{ id: string }>(`
        INSERT INTO project_phases (project_id, name, description, executor_id, deadline, sort_order, depends_on_phase_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id
    `, [data.projectId, data.name, data.description || null, data.executorId || null, data.deadline || null, maxOrder?.max_order || 0, data.dependsOnPhaseId || null]);

    const phases = await query<PhaseRow>(`
        SELECT pp.id, pp.project_id, pp.name, pp.description, pp.status,
               pp.executor_id, eu.name as executor_name,
               pp.sort_order, pp.deadline::text,
               pp.depends_on_phase_id, dep.name as depends_on_phase_name,
               pp.started_at::text, pp.completed_at::text,
               pp.created_at::text, pp.updated_at::text,
               0 as docs_count, 0 as checklist_total, 0 as checklist_done
        FROM project_phases pp
        LEFT JOIN users eu ON eu.id = pp.executor_id
        LEFT JOIN project_phases dep ON dep.id = pp.depends_on_phase_id
        WHERE pp.id = $1
    `, [result!.id]);

    return phases[0];
}

export async function updatePhase(
    phaseId: string,
    data: { name?: string; description?: string; status?: string; executorId?: string; deadline?: string; dependsOnPhaseId?: string | null }
): Promise<PhaseRow | null> {
    // If trying to start or complete, check dependency
    if (data.status === 'en_curso' || data.status === 'completado') {
        const currentPhase = await queryOne<{ depends_on_phase_id: string | null }>(
            'SELECT depends_on_phase_id FROM project_phases WHERE id = $1', [phaseId]
        );
        if (currentPhase?.depends_on_phase_id) {
            const depPhase = await queryOne<{ status: string; name: string }>(
                'SELECT status, name FROM project_phases WHERE id = $1', [currentPhase.depends_on_phase_id]
            );
            if (depPhase && depPhase.status !== 'completado') {
                throw new Error(`No se puede avanzar esta fase. La fase "${depPhase.name}" debe completarse primero.`);
            }
        }
    }

    const sets: string[] = [];
    const params: any[] = [];
    let idx = 1;

    if (data.name) { sets.push(`name = $${idx++}`); params.push(data.name); }
    if (data.description !== undefined) { sets.push(`description = $${idx++}`); params.push(data.description); }
    if (data.status) {
        sets.push(`status = $${idx++}`);
        params.push(data.status);
        if (data.status === 'en_curso') {
            sets.push('started_at = COALESCE(started_at, NOW())');
        } else if (data.status === 'completado') {
            sets.push('completed_at = NOW()');
        }
    }
    if (data.executorId !== undefined) { sets.push(`executor_id = $${idx++}`); params.push(data.executorId || null); }
    if (data.deadline !== undefined) { sets.push(`deadline = $${idx++}`); params.push(data.deadline || null); }
    if (data.dependsOnPhaseId !== undefined) { sets.push(`depends_on_phase_id = $${idx++}`); params.push(data.dependsOnPhaseId || null); }

    if (sets.length === 0) return null;

    params.push(phaseId);
    await query(`UPDATE project_phases SET ${sets.join(', ')} WHERE id = $${idx}`, params);

    const phases = await query<PhaseRow>(`
        SELECT pp.id, pp.project_id, pp.name, pp.description, pp.status,
               pp.executor_id, eu.name as executor_name,
               pp.sort_order, pp.deadline::text,
               pp.depends_on_phase_id, dep.name as depends_on_phase_name,
               pp.started_at::text, pp.completed_at::text,
               pp.created_at::text, pp.updated_at::text,
               COALESCE(d.cnt, 0)::int as docs_count,
               COALESCE(c.cnt, 0)::int as checklist_total,
               COALESCE(c.done, 0)::int as checklist_done
        FROM project_phases pp
        LEFT JOIN users eu ON eu.id = pp.executor_id
        LEFT JOIN project_phases dep ON dep.id = pp.depends_on_phase_id
        LEFT JOIN (SELECT phase_id, COUNT(*)::int as cnt FROM phase_documents GROUP BY phase_id) d ON d.phase_id = pp.id
        LEFT JOIN (
            SELECT phase_id, COUNT(*)::int as cnt,
                   SUM(CASE WHEN is_completed THEN 1 ELSE 0 END)::int as done
            FROM phase_checklist_items GROUP BY phase_id
        ) c ON c.phase_id = pp.id
        WHERE pp.id = $1
    `, [phaseId]);

    return phases[0] || null;
}

export async function deletePhase(phaseId: string): Promise<void> {
    await query('DELETE FROM project_phases WHERE id = $1', [phaseId]);
}

export async function reorderPhases(projectId: string, phaseIds: string[]): Promise<void> {
    await transaction(async (client) => {
        for (let i = 0; i < phaseIds.length; i++) {
            await client.query(
                'UPDATE project_phases SET sort_order = $1 WHERE id = $2 AND project_id = $3',
                [i, phaseIds[i], projectId]
            );
        }
    });
}

// ==================== PHASE DETAIL ====================

export interface PhaseDetail {
    phase: PhaseRow;
    documents: PhaseDocument[];
    observations: PhaseObservation[];
    checklist: ChecklistItem[];
}

export async function getPhaseDetail(phaseId: string): Promise<PhaseDetail | null> {
    const phases = await query<PhaseRow>(`
        SELECT pp.id, pp.project_id, pp.name, pp.description, pp.status,
               pp.executor_id, eu.name as executor_name,
               pp.sort_order, pp.deadline::text,
               pp.depends_on_phase_id, dep.name as depends_on_phase_name,
               pp.started_at::text, pp.completed_at::text,
               pp.created_at::text, pp.updated_at::text,
               COALESCE(d.cnt, 0)::int as docs_count,
               COALESCE(c.cnt, 0)::int as checklist_total,
               COALESCE(c.done, 0)::int as checklist_done
        FROM project_phases pp
        LEFT JOIN users eu ON eu.id = pp.executor_id
        LEFT JOIN project_phases dep ON dep.id = pp.depends_on_phase_id
        LEFT JOIN (SELECT phase_id, COUNT(*)::int as cnt FROM phase_documents GROUP BY phase_id) d ON d.phase_id = pp.id
        LEFT JOIN (
            SELECT phase_id, COUNT(*)::int as cnt,
                   SUM(CASE WHEN is_completed THEN 1 ELSE 0 END)::int as done
            FROM phase_checklist_items GROUP BY phase_id
        ) c ON c.phase_id = pp.id
        WHERE pp.id = $1
    `, [phaseId]);

    if (phases.length === 0) return null;

    const [documents, observations, checklist] = await Promise.all([
        getPhaseDocuments(phaseId),
        getPhaseObservations(phaseId),
        getPhaseChecklist(phaseId),
    ]);

    return { phase: phases[0], documents, observations, checklist };
}

// ==================== DOCUMENTS ====================

export interface PhaseDocument {
    id: string;
    phase_id: string;
    file_url: string;
    file_name: string;
    file_type: string | null;
    file_size: number | null;
    source: string;
    message_id: string | null;
    uploaded_by: string;
    uploader_name: string | null;
    created_at: string;
}

export async function getPhaseDocuments(phaseId: string): Promise<PhaseDocument[]> {
    return query<PhaseDocument>(`
        SELECT pd.id, pd.phase_id, pd.file_url, pd.file_name, pd.file_type,
               pd.file_size::int, pd.source, pd.message_id,
               pd.uploaded_by, u.name as uploader_name,
               pd.created_at::text
        FROM phase_documents pd
        LEFT JOIN users u ON u.id = pd.uploaded_by
        WHERE pd.phase_id = $1
        ORDER BY pd.created_at DESC
    `, [phaseId]);
}

export async function addPhaseDocument(data: {
    phaseId: string;
    fileUrl: string;
    fileName: string;
    fileType?: string;
    fileSize?: number;
    source?: string;
    messageId?: string;
    uploadedBy: string;
}): Promise<PhaseDocument> {
    const result = await queryOne<{ id: string }>(`
        INSERT INTO phase_documents (phase_id, file_url, file_name, file_type, file_size, source, message_id, uploaded_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id
    `, [data.phaseId, data.fileUrl, data.fileName, data.fileType || null, data.fileSize || null, data.source || 'upload', data.messageId || null, data.uploadedBy]);

    const docs = await query<PhaseDocument>(`
        SELECT pd.id, pd.phase_id, pd.file_url, pd.file_name, pd.file_type,
               pd.file_size::int, pd.source, pd.message_id,
               pd.uploaded_by, u.name as uploader_name,
               pd.created_at::text
        FROM phase_documents pd
        LEFT JOIN users u ON u.id = pd.uploaded_by
        WHERE pd.id = $1
    `, [result!.id]);

    return docs[0];
}

export async function removePhaseDocument(docId: string): Promise<void> {
    await query('DELETE FROM phase_documents WHERE id = $1', [docId]);
}

// ==================== CLOUD FILES (from messages) ====================

export interface CloudFile {
    id: string;
    message_type: string;
    media_url: string;
    text: string | null;
    file_name: string | null;
    chat_id: string;
    created_at: string;
}

export async function getClientCloudFiles(clientId: string): Promise<CloudFile[]> {
    return query<CloudFile>(`
        SELECT id, message_type, media_url, text,
               COALESCE(text, 'archivo_' || id) as file_name,
               chat_id, created_at::text
        FROM messages
        WHERE sender_id = $1
          AND message_type IN ('image', 'video', 'file')
          AND media_url IS NOT NULL
        ORDER BY created_at DESC
        LIMIT 200
    `, [clientId]);
}

// ==================== OBSERVATIONS ====================

export interface PhaseObservation {
    id: string;
    phase_id: string;
    author_id: string;
    author_name: string | null;
    content: string;
    created_at: string;
    updated_at: string;
}

export async function getPhaseObservations(phaseId: string): Promise<PhaseObservation[]> {
    return query<PhaseObservation>(`
        SELECT po.id, po.phase_id, po.author_id, u.name as author_name,
               po.content, po.created_at::text, po.updated_at::text
        FROM phase_observations po
        LEFT JOIN users u ON u.id = po.author_id
        WHERE po.phase_id = $1
        ORDER BY po.created_at DESC
    `, [phaseId]);
}

export async function addPhaseObservation(data: {
    phaseId: string;
    authorId: string;
    content: string;
}): Promise<PhaseObservation> {
    const result = await queryOne<{ id: string }>(`
        INSERT INTO phase_observations (phase_id, author_id, content)
        VALUES ($1, $2, $3)
        RETURNING id
    `, [data.phaseId, data.authorId, data.content]);

    const obs = await query<PhaseObservation>(`
        SELECT po.id, po.phase_id, po.author_id, u.name as author_name,
               po.content, po.created_at::text, po.updated_at::text
        FROM phase_observations po
        LEFT JOIN users u ON u.id = po.author_id
        WHERE po.id = $1
    `, [result!.id]);

    return obs[0];
}

export async function updatePhaseObservation(obsId: string, content: string): Promise<PhaseObservation | null> {
    await query('UPDATE phase_observations SET content = $1 WHERE id = $2', [content, obsId]);

    const obs = await query<PhaseObservation>(`
        SELECT po.id, po.phase_id, po.author_id, u.name as author_name,
               po.content, po.created_at::text, po.updated_at::text
        FROM phase_observations po
        LEFT JOIN users u ON u.id = po.author_id
        WHERE po.id = $1
    `, [obsId]);

    return obs[0] || null;
}

export async function deletePhaseObservation(obsId: string): Promise<void> {
    await query('DELETE FROM phase_observations WHERE id = $1', [obsId]);
}

// ==================== CHECKLIST ====================

export interface ChecklistItem {
    id: string;
    phase_id: string;
    label: string;
    is_completed: boolean;
    completed_by: string | null;
    completer_name: string | null;
    completed_at: string | null;
    sort_order: number;
    created_at: string;
}

export async function getPhaseChecklist(phaseId: string): Promise<ChecklistItem[]> {
    return query<ChecklistItem>(`
        SELECT ci.id, ci.phase_id, ci.label, ci.is_completed,
               ci.completed_by, u.name as completer_name,
               ci.completed_at::text, ci.sort_order, ci.created_at::text
        FROM phase_checklist_items ci
        LEFT JOIN users u ON u.id = ci.completed_by
        WHERE ci.phase_id = $1
        ORDER BY ci.sort_order ASC, ci.created_at ASC
    `, [phaseId]);
}

export async function addChecklistItem(data: {
    phaseId: string;
    label: string;
}): Promise<ChecklistItem> {
    const maxOrder = await queryOne<{ max_order: number }>(
        `SELECT COALESCE(MAX(sort_order), -1)::int + 1 as max_order FROM phase_checklist_items WHERE phase_id = $1`,
        [data.phaseId]
    );

    const result = await queryOne<{ id: string }>(`
        INSERT INTO phase_checklist_items (phase_id, label, sort_order)
        VALUES ($1, $2, $3)
        RETURNING id
    `, [data.phaseId, data.label, maxOrder?.max_order || 0]);

    const items = await query<ChecklistItem>(`
        SELECT ci.id, ci.phase_id, ci.label, ci.is_completed,
               ci.completed_by, NULL as completer_name,
               ci.completed_at::text, ci.sort_order, ci.created_at::text
        FROM phase_checklist_items ci
        WHERE ci.id = $1
    `, [result!.id]);

    return items[0];
}

export async function toggleChecklistItem(itemId: string, userId: string): Promise<ChecklistItem | null> {
    await query(`
        UPDATE phase_checklist_items
        SET is_completed = NOT is_completed,
            completed_by = CASE WHEN NOT is_completed THEN $1::uuid ELSE NULL END,
            completed_at = CASE WHEN NOT is_completed THEN NOW() ELSE NULL END
        WHERE id = $2
    `, [userId, itemId]);

    const items = await query<ChecklistItem>(`
        SELECT ci.id, ci.phase_id, ci.label, ci.is_completed,
               ci.completed_by, u.name as completer_name,
               ci.completed_at::text, ci.sort_order, ci.created_at::text
        FROM phase_checklist_items ci
        LEFT JOIN users u ON u.id = ci.completed_by
        WHERE ci.id = $1
    `, [itemId]);

    return items[0] || null;
}

export async function deleteChecklistItem(itemId: string): Promise<void> {
    await query('DELETE FROM phase_checklist_items WHERE id = $1', [itemId]);
}

// ==================== DEADLINE ALERTS ====================

export interface DeadlineAlert {
    phase_id: string;
    phase_name: string;
    project_id: string;
    project_name: string;
    client_name: string | null;
    deadline: string;
    status: string;
    severity: 'red' | 'yellow' | 'green';
    days_remaining: number;
}

export async function getDeadlineAlerts(): Promise<DeadlineAlert[]> {
    return query<DeadlineAlert>(`
        SELECT
            pp.id as phase_id,
            pp.name as phase_name,
            p.id as project_id,
            p.name as project_name,
            u.name as client_name,
            pp.deadline::text,
            pp.status,
            CASE
                WHEN pp.deadline < CURRENT_DATE THEN 'red'
                WHEN pp.deadline <= CURRENT_DATE + INTERVAL '7 days' THEN 'yellow'
                ELSE 'green'
            END as severity,
            (pp.deadline - CURRENT_DATE)::int as days_remaining
        FROM project_phases pp
        JOIN projects p ON p.id = pp.project_id
        JOIN users u ON u.id = p.client_id
        WHERE pp.deadline IS NOT NULL
          AND pp.status NOT IN ('completado')
          AND p.status = 'activo'
        ORDER BY pp.deadline ASC
    `);
}

// ==================== PROJECTS SUMMARY ====================

export interface ProjectsSummary {
    totalClients: number;
    activeProjects: number;
    overduePhases: number;
    completionRate: number;
    alerts: DeadlineAlert[];
}

export async function getProjectsSummary(): Promise<ProjectsSummary> {
    const [totalClients, activeProjects, overduePhases, completionRate, alerts] = await Promise.all([
        queryOne<{ count: string }>(`
            SELECT COUNT(*)::text as count FROM users
            WHERE COALESCE(role, 'usuario') != 'consultor'
        `),
        queryOne<{ count: string }>(`
            SELECT COUNT(*)::text as count FROM projects WHERE status = 'activo'
        `),
        queryOne<{ count: string }>(`
            SELECT COUNT(*)::text as count
            FROM project_phases pp
            JOIN projects p ON p.id = pp.project_id
            WHERE pp.deadline < CURRENT_DATE
              AND pp.status NOT IN ('completado')
              AND p.status = 'activo'
        `),
        queryOne<{ rate: string }>(`
            SELECT COALESCE(
                ROUND(
                    (SUM(CASE WHEN status = 'completado' THEN 1 ELSE 0 END)::numeric /
                     NULLIF(COUNT(*), 0)::numeric) * 100, 1
                ), 0
            )::text as rate
            FROM project_phases
        `),
        getDeadlineAlerts(),
    ]);

    return {
        totalClients: parseInt(totalClients?.count || '0', 10),
        activeProjects: parseInt(activeProjects?.count || '0', 10),
        overduePhases: parseInt(overduePhases?.count || '0', 10),
        completionRate: parseFloat(completionRate?.rate || '0'),
        alerts: alerts.filter(a => a.severity !== 'green'),
    };
}

// ==================== CONSULTORS LIST (for executor selector) ====================

export interface ConsultorRow {
    id: string;
    name: string | null;
    rfc: string;
}

export async function getConsultors(): Promise<ConsultorRow[]> {
    return query<ConsultorRow>(`
        SELECT id, name, rfc FROM users
        WHERE COALESCE(role, 'usuario') = 'consultor'
        ORDER BY name ASC
    `);
}
