// Configuración de la API - Ahora usando HTTPS
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://appsoluciones.duckdns.org/api';

interface ApiResponse<T> {
    data?: T;
    error?: string;
}

class ApiClient {
    private baseUrl: string;
    private userId: string | null = null;

    constructor(baseUrl: string) {
        this.baseUrl = baseUrl;
    }

    setUserId(userId: string) {
        this.userId = userId;
    }

    getUserId() {
        return this.userId;
    }

    private async request<T>(
        endpoint: string,
        options: RequestInit = {}
    ): Promise<ApiResponse<T>> {
        const url = `${this.baseUrl}${endpoint}`;
        console.log(`🌐 API Request: ${options.method || 'GET'} ${url}`);

        try {
            // Crear un AbortController para timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 segundos timeout

            const response = await fetch(url, {
                ...options,
                signal: controller.signal,
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers,
                },
            });

            clearTimeout(timeoutId);
            console.log(`✅ API Response: ${response.status} ${response.statusText}`);

            const data = await response.json();

            if (!response.ok) {
                console.error('❌ API Error Response:', data);
                return { error: data.error || 'Error en la solicitud' };
            }

            return { data };
        } catch (error: any) {
            console.error('❌ API Network Error:', {
                message: error.message,
                name: error.name,
                url: url,
            });

            // Mensaje más descriptivo según el tipo de error
            let errorMessage = 'Error de conexión';
            if (error.name === 'AbortError') {
                errorMessage = 'Tiempo de espera agotado. Verifica tu conexión a internet.';
            } else if (error.message?.includes('Network request failed')) {
                errorMessage = `No se pudo conectar al servidor. URL: ${url}`;
            }

            return { error: errorMessage };
        }
    }

    // ==================== AUTH ====================

    async login(rfc: string, extraData?: any) {
        const result = await this.request<{
            success: boolean;
            user: User;
            message: string;
        }>('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ rfc, ...extraData }),
        });

        if (result.data?.user) {
            this.userId = result.data.user.id;
        }

        return result;
    }

    async logout() {
        if (!this.userId) return { error: 'No hay sesión activa' };

        const result = await this.request('/auth/logout', {
            method: 'POST',
            body: JSON.stringify({ userId: this.userId }),
        });

        if (result.data) {
            this.userId = null;
        }

        return result;
    }

    // ==================== USERS ====================

    async getUsers(search?: string) {
        const params = new URLSearchParams();
        if (search) params.append('search', search);
        if (this.userId) params.append('exclude', this.userId);

        return this.request<{ users: User[] }>(
            `/users${params.toString() ? '?' + params : ''}`
        );
    }

    async getUser(userId: string) {
        return this.request<{ user: User }>(`/users/${userId}`);
    }

    async updateUser(userId: string, data: Partial<User>) {
        return this.request<{ user: User }>(`/users/${userId}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    }

    // ==================== CHATS ====================

    async getChats() {
        if (!this.userId) return { error: 'No hay sesión activa' };

        return this.request<{ chats: Chat[] }>(`/chats?userId=${this.userId}`);
    }

    async createChat(participantId: string) {
        if (!this.userId) return { error: 'No hay sesión activa' };

        return this.request<{ chat: Chat }>('/chats', {
            method: 'POST',
            body: JSON.stringify({ userId: this.userId, participantId }),
        });
    }

    async createGroupChat(groupName: string, participantIds: string[]) {
        if (!this.userId) return { error: 'No hay sesión activa' };

        return this.request<{ chat: Chat }>('/chats', {
            method: 'POST',
            body: JSON.stringify({
                userId: this.userId,
                isGroup: true,
                groupName,
                participantIds,
            }),
        });
    }

    async getChat(chatId: string) {
        return this.request<{ chat: Chat }>(`/chats/${chatId}`);
    }

    async getChatMessages(chatId: string, limit = 50, offset = 0) {
        return this.request<{ messages: Message[] }>(
            `/chats/${chatId}/messages?limit=${limit}&offset=${offset}`
        );
    }

    async markChatAsRead(chatId: string) {
        if (!this.userId) return { error: 'No hay sesión activa' };

        return this.request(`/chats/${chatId}/read`, {
            method: 'POST',
            body: JSON.stringify({ userId: this.userId }),
        });
    }

    // ==================== UPLOAD ====================

    async uploadFile(fileUri: string, type: 'image' | 'video' | 'audio' | 'file') {
        if (!this.userId) return { error: 'No hay sesión activa' };

        try {
            const formData = new FormData();

            const filename = fileUri.split('/').pop() || `upload-${Date.now()}`;
            const match = /\.(\w+)$/.exec(filename);
            const ext = match ? match[1] : '';

            let mimeType = 'application/octet-stream';
            if (type === 'image') mimeType = `image/${ext === 'text' ? 'jpeg' : ext}`; // Simple fix for type
            else if (type === 'audio') mimeType = `audio/${ext}`;
            else if (type === 'video') mimeType = `video/${ext}`;

            // En React Native la propiedad se llama uri, name, type
            formData.append('file', {
                uri: fileUri,
                name: filename,
                type: mimeType,
            } as any);

            // Endpoint específico para subir
            const url = `${this.baseUrl}/upload`;

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    // No establecer Content-Type manualmente, fetch lo hace con el boundary
                },
                body: formData,
            });

            const data = await response.json();

            if (!response.ok) {
                return { error: data.error || 'Error al subir archivo' };
            }

            return { data }; // data contiene { url, filename, type }
        } catch (error: any) {
            console.error('Upload Error:', error);
            return { error: error.message || 'Error de subida' };
        }
    }

    // ==================== MESSAGES ====================

    async sendMessage(chatId: string, text: string, type = 'text', mediaUrl?: string) {
        if (!this.userId) return { error: 'No hay sesión activa' };

        return this.request<{ message: Message }>('/messages', {
            method: 'POST',
            body: JSON.stringify({
                chatId,
                senderId: this.userId,
                text,
                type,
                mediaUrl,
            }),
        });
    }

    async markMessagesAsRead(chatId: string) {
        if (!this.userId) return { error: 'No hay sesión activa' };

        return this.request('/messages/mark-read', {
            method: 'POST',
            body: JSON.stringify({ chatId, userId: this.userId }),
        });
    }

    async markMessagesAsDelivered(chatId: string) {
        if (!this.userId) return { error: 'No hay sesión activa' };

        return this.request('/messages/mark-delivered', {
            method: 'POST',
            body: JSON.stringify({ chatId, userId: this.userId }),
        });
    }

    async deleteMessage(messageId: string) {
        if (!this.userId) return { error: 'No hay sesión activa' };

        return this.request(`/messages/${messageId}`, {
            method: 'DELETE',
            body: JSON.stringify({ userId: this.userId }),
        });
    }

    // ==================== CALL REQUESTS ====================

    async createCallRequest(name: string, phone: string, emergency: string) {
        if (!this.userId) return { error: 'No hay sesión activa' };

        return this.request<{ callRequest: CallRequest }>('/calls/request', {
            method: 'POST',
            body: JSON.stringify({ userId: this.userId, name, phone, emergency }),
        });
    }

    async getCallRequests(status: 'pending' | 'completed' = 'pending') {
        return this.request<{ callRequests: CallRequest[] }>(`/calls/requests?status=${status}`);
    }

    async completeCallRequest(requestId: string) {
        return this.request(`/calls/requests/${requestId}/complete`, {
            method: 'PUT',
        });
    }

    async deleteCallRequest(requestId: string) {
        return this.request(`/calls/requests/${requestId}`, {
            method: 'DELETE',
        });
    }

    // ==================== DELETE CHAT ====================

    async deleteChat(chatId: string) {
        if (!this.userId) return { error: 'No hay sesión activa' };

        return this.request<{ success: boolean; message: string }>(`/chats/${chatId}`, {
            method: 'DELETE',
            body: JSON.stringify({ userId: this.userId }),
        });
    }
}

// Tipos
export interface User {
    id: string;
    rfc: string;
    name: string | null;
    avatar_url: string | null;
}

export interface Chat {
    id: string;
    isGroup: boolean;
    groupName: string | null;
    groupAvatar: string | null;
    participants: User[];
    lastMessage: Message | null;
    unreadCount: number;
    createdAt: string;
    updatedAt: string;
}

export interface Message {
    id: string;
    chatId: string;
    senderId: string;
    sender?: User;
    text: string;
    type: 'text' | 'image' | 'audio' | 'video' | 'file';
    mediaUrl: string | null;
    status: 'sent' | 'delivered' | 'read';
    timestamp: string;
}

export interface CallRequest {
    id: string;
    user_id: string;
    user_rfc?: string;
    name: string;
    phone: string;
    emergency: string;
    status: 'pending' | 'completed' | 'cancelled';
    created_at: string;
    completed_at: string | null;
}

// Exportar instancia única
export const api = new ApiClient(API_URL);
export default api;
