import { User, Message, Chat } from '../types';

export const currentUser: User = {
    id: 'user-1',
    name: 'Tú',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop',
    status: 'online',
};

export const users: User[] = [
    {
        id: 'user-2',
        name: 'María García',
        avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop',
        status: 'online',
    },
    {
        id: 'user-3',
        name: 'Carlos López',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop',
        status: 'offline',
        lastSeen: new Date(Date.now() - 1000 * 60 * 30),
    },
    {
        id: 'user-4',
        name: 'Ana Martínez',
        avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop',
        status: 'typing',
    },
    {
        id: 'user-5',
        name: 'Roberto Sánchez',
        avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop',
        status: 'online',
    },
    {
        id: 'user-6',
        name: 'Laura Fernández',
        avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop',
        status: 'offline',
        lastSeen: new Date(Date.now() - 1000 * 60 * 60 * 2),
    },
    {
        id: 'user-7',
        name: 'Diego Ramírez',
        avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop',
        status: 'online',
    },
];

export const messages: Record<string, Message[]> = {
    'chat-1': [
        {
            id: 'msg-1',
            text: '¡Hola! ¿Cómo estás? 😊',
            senderId: 'user-2',
            timestamp: new Date(Date.now() - 1000 * 60 * 60),
            status: 'read',
            type: 'text',
        },
        {
            id: 'msg-2',
            text: '¡Muy bien! Trabajando en un proyecto nuevo',
            senderId: 'user-1',
            timestamp: new Date(Date.now() - 1000 * 60 * 58),
            status: 'read',
            type: 'text',
        },
        {
            id: 'msg-3',
            text: '¿Qué tipo de proyecto? 🤔',
            senderId: 'user-2',
            timestamp: new Date(Date.now() - 1000 * 60 * 55),
            status: 'read',
            type: 'text',
        },
        {
            id: 'msg-4',
            text: 'Una app de mensajería en React Native 📱',
            senderId: 'user-1',
            timestamp: new Date(Date.now() - 1000 * 60 * 50),
            status: 'read',
            type: 'text',
        },
        {
            id: 'msg-5',
            text: '¡Wow! Eso suena increíble 🚀 Me encantaría verla cuando esté lista',
            senderId: 'user-2',
            timestamp: new Date(Date.now() - 1000 * 60 * 5),
            status: 'read',
            type: 'text',
        },
    ],
    'chat-2': [
        {
            id: 'msg-6',
            text: '¿Viste el partido de ayer?',
            senderId: 'user-3',
            timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24),
            status: 'read',
            type: 'text',
        },
        {
            id: 'msg-7',
            text: 'Sí, estuvo muy reñido ⚽',
            senderId: 'user-1',
            timestamp: new Date(Date.now() - 1000 * 60 * 60 * 23),
            status: 'read',
            type: 'text',
        },
    ],
    'chat-3': [
        {
            id: 'msg-8',
            text: '¿Nos vemos mañana para el café?',
            senderId: 'user-4',
            timestamp: new Date(Date.now() - 1000 * 60 * 2),
            status: 'delivered',
            type: 'text',
        },
    ],
    'chat-4': [
        {
            id: 'msg-9',
            text: 'Te envié los documentos por email 📧',
            senderId: 'user-5',
            timestamp: new Date(Date.now() - 1000 * 60 * 60 * 3),
            status: 'read',
            type: 'text',
        },
        {
            id: 'msg-10',
            text: 'Perfecto, los revisaré en un momento',
            senderId: 'user-1',
            timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
            status: 'read',
            type: 'text',
        },
    ],
    'chat-5': [
        {
            id: 'msg-11',
            text: '¡Feliz cumpleaños! 🎂🎉',
            senderId: 'user-1',
            timestamp: new Date(Date.now() - 1000 * 60 * 60 * 48),
            status: 'read',
            type: 'text',
        },
        {
            id: 'msg-12',
            text: '¡Muchísimas gracias! 🥳❤️',
            senderId: 'user-6',
            timestamp: new Date(Date.now() - 1000 * 60 * 60 * 47),
            status: 'read',
            type: 'text',
        },
    ],
    'chat-6': [
        {
            id: 'msg-13',
            text: '¿Cómo va el código?',
            senderId: 'user-7',
            timestamp: new Date(Date.now() - 1000 * 60 * 15),
            status: 'read',
            type: 'text',
        },
        {
            id: 'msg-14',
            text: 'Casi listo, solo faltan algunos detalles 💻',
            senderId: 'user-1',
            timestamp: new Date(Date.now() - 1000 * 60 * 10),
            status: 'delivered',
            type: 'text',
        },
    ],
};

export const chats: Chat[] = [
    {
        id: 'chat-1',
        participants: [currentUser, users[0]],
        lastMessage: messages['chat-1'][messages['chat-1'].length - 1],
        unreadCount: 2,
        isGroup: false,
    },
    {
        id: 'chat-3',
        participants: [currentUser, users[2]],
        lastMessage: messages['chat-3'][messages['chat-3'].length - 1],
        unreadCount: 1,
        isGroup: false,
    },
    {
        id: 'chat-6',
        participants: [currentUser, users[5]],
        lastMessage: messages['chat-6'][messages['chat-6'].length - 1],
        unreadCount: 0,
        isGroup: false,
    },
    {
        id: 'chat-2',
        participants: [currentUser, users[1]],
        lastMessage: messages['chat-2'][messages['chat-2'].length - 1],
        unreadCount: 0,
        isGroup: false,
    },
    {
        id: 'chat-4',
        participants: [currentUser, users[3]],
        lastMessage: messages['chat-4'][messages['chat-4'].length - 1],
        unreadCount: 0,
        isGroup: false,
    },
    {
        id: 'chat-5',
        participants: [currentUser, users[4]],
        lastMessage: messages['chat-5'][messages['chat-5'].length - 1],
        unreadCount: 0,
        isGroup: false,
    },
];
