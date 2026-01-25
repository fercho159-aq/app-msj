// Tipos principales de la aplicación de mensajería

export interface User {
    id: string;
    name: string;
    avatar: string;
    status: 'online' | 'offline' | 'typing';
    lastSeen?: Date;
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
    UserProfile: { userId: string; userName: string; userAvatar: string; userRfc?: string | null; chatId: string };
    Profile: { userId: string };
    Settings: undefined;
    EditProfile: undefined;
    Privacy: undefined;
    Notifications: undefined;
    Appearance: undefined;
    ChatSettings: undefined;
    HelpCenter: undefined;
    Terms: undefined;
};

export type BottomTabParamList = {
    Chats: undefined;
    Calls: undefined;
    Settings: undefined;
};
