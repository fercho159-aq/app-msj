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
