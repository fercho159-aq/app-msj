// Tipos principales de la aplicación de mensajería

// Roles de usuario con permisos específicos:
// - usuario: Solo puede chatear con consultores
// - asesor: Solo puede chatear con consultores
// - consultor: Puede chatear con todos y crear grupos
export type UserRole = 'usuario' | 'asesor' | 'consultor';

export interface User {
    id: string;
    name: string;
    avatar: string;
    status: 'online' | 'offline' | 'typing';
    lastSeen?: Date;
    role?: UserRole;
}

export interface Message {
    id: string;
    text: string;
    senderId: string;
    timestamp: Date;
    status: 'sent' | 'delivered' | 'read';
    type: 'text' | 'image' | 'audio';
    imageUrl?: string;
}

export interface Chat {
    id: string;
    participants: User[];
    lastMessage?: Message;
    unreadCount: number;
    isGroup: boolean;
    groupName?: string;
    groupAvatar?: string;
}

export interface ChatListItemProps {
    chat: Chat;
    currentUserId: string;
    onPress: () => void;
}

export type RootStackParamList = {
    Login: undefined;
    Main: undefined;
    CalculadoraFiscal: undefined;
    Chat: { chatId: string; userName: string; userAvatar: string; userRfc?: string | null; participantId?: string };
    UserProfile: { userId: string; userName: string; userAvatar: string; userRfc?: string | null; chatId: string; isGroup?: boolean; participants?: User[] };
    Profile: { userId: string };
    Settings: undefined;
    EditProfile: undefined;
    Privacy: undefined;
    Notifications: undefined;
    Appearance: undefined;
    ChatSettings: undefined;
    HelpCenter: undefined;
    Terms: undefined;
    CreateGroup: undefined;
    BlockedUsers: undefined;
};

export type BottomTabParamList = {
    Dashboard: undefined;
    Chats: undefined;
    Calls: undefined;
    Settings: undefined;
};

// ==================== DASHBOARD TYPES ====================

export interface DashboardSummary {
    users: { total: number; byRole: { role: string; count: number }[] };
    chats: { total: number; groups: number; individual: number };
    messages: { total: number; byType: { type: string; count: number }[] };
    callRequests: { total: number; byStatus: { status: string; count: number }[] };
    callHistory: { total: number; byStatus: { status: string; count: number }[] };
    reports: { total: number; byStatus: { status: string; count: number }[] };
    blockedUsers: number;
}

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

export interface UserMediaDetail {
    id: string;
    message_type: string;
    media_url: string;
    text: string | null;
    chat_id: string;
    created_at: string;
}

// AI Chat
export interface AiChatMessage {
    role: 'user' | 'assistant';
    content: string;
}

// ==================== PROJECT MANAGEMENT TYPES ====================

export type ProjectStatus = 'activo' | 'pausado' | 'completado' | 'cancelado';
export type PhaseStatus = 'pendiente' | 'en_curso' | 'bloqueado' | 'completado';
export type DeadlineSeverity = 'red' | 'yellow' | 'green';

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

export interface ProjectRow {
    id: string;
    client_id: string;
    client_name: string | null;
    client_rfc: string;
    name: string;
    service_type: string;
    description: string | null;
    status: ProjectStatus;
    created_by: string;
    total_phases: number;
    completed_phases: number;
    created_at: string;
    updated_at: string;
}

export interface PhaseRow {
    id: string;
    project_id: string;
    name: string;
    description: string | null;
    status: PhaseStatus;
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

export interface ProjectDetail {
    id: string;
    client_id: string;
    name: string;
    service_type: string;
    description: string | null;
    status: ProjectStatus;
    created_by: string;
    created_at: string;
    updated_at: string;
    phases: PhaseRow[];
}

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

export interface PhaseObservation {
    id: string;
    phase_id: string;
    author_id: string;
    author_name: string | null;
    content: string;
    created_at: string;
    updated_at: string;
}

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

export interface PhaseDetail {
    phase: PhaseRow;
    documents: PhaseDocument[];
    observations: PhaseObservation[];
    checklist: ChecklistItem[];
}

export interface CloudFile {
    id: string;
    message_type: string;
    media_url: string;
    text: string | null;
    file_name: string | null;
    chat_id: string;
    created_at: string;
}

export interface DeadlineAlert {
    phase_id: string;
    phase_name: string;
    project_id: string;
    project_name: string;
    client_name: string | null;
    deadline: string;
    status: string;
    severity: DeadlineSeverity;
    days_remaining: number;
}

export interface ProjectsSummary {
    totalClients: number;
    activeProjects: number;
    overduePhases: number;
    completionRate: number;
    alerts: DeadlineAlert[];
}

export interface ConsultorRow {
    id: string;
    name: string | null;
    rfc: string;
}
