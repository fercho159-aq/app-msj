// Configuración de la API - Ahora usando HTTPS
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://appsoluciones.duckdns.org/api';

// Configuración de reintentos
const RETRY_CONFIG = {
    maxRetries: 3,
    baseDelay: 1000, // 1 segundo
    maxDelay: 10000, // 10 segundos máximo
};

interface ApiResponse<T> {
    data?: T;
    error?: string;
    isNetworkError?: boolean;
}

// Tipos de rol de usuario
export type UserRole = 'usuario' | 'asesor' | 'consultor';

// Función para esperar con backoff exponencial
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const calculateBackoff = (attempt: number): number => {
    const delay = RETRY_CONFIG.baseDelay * Math.pow(2, attempt);
    // Agregar jitter (variación aleatoria) para evitar thundering herd
    const jitter = delay * 0.2 * Math.random();
    return Math.min(delay + jitter, RETRY_CONFIG.maxDelay);
};

class ApiClient {
    private baseUrl: string;
    private userId: string | null = null;
    private userRole: UserRole = 'usuario';

    constructor(baseUrl: string) {
        this.baseUrl = baseUrl;
    }

    // Método para probar la conectividad con el servidor
    async testServerConnection(): Promise<{ success: boolean; latency?: number; error?: string }> {
        const start = Date.now();
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

            const response = await fetch(`${this.baseUrl}/health`, {
                method: 'GET',
                signal: controller.signal,
            });

            clearTimeout(timeoutId);
            const latency = Date.now() - start;

            if (response.ok) {
                return { success: true, latency };
            }
            return { success: false, error: `Server responded with ${response.status}` };
        } catch (error: any) {
            return {
                success: false,
                error: error.name === 'AbortError' ? 'Timeout' : 'Sin conexión al servidor',
            };
        }
    }

    setUserId(userId: string) {
        this.userId = userId;
    }

    getUserId() {
        return this.userId;
    }

    setUserRole(role: UserRole) {
        this.userRole = role;
    }

    getUserRole() {
        return this.userRole;
    }

    private async request<T>(
        endpoint: string,
        options: RequestInit = {},
        retryCount: number = 0
    ): Promise<ApiResponse<T>> {
        const url = `${this.baseUrl}${endpoint}`;

        console.log(`🌐 API Request: ${options.method || 'GET'} ${url}${retryCount > 0 ? ` (intento ${retryCount + 1})` : ''}`);

        try {
            // Crear un AbortController para timeout
            const controller = new AbortController();
            const timeoutMs = retryCount > 0 ? 45000 : 30000; // Más tiempo en reintentos
            const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

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

                // Reintentar en errores de servidor (5xx) pero no en errores de cliente (4xx)
                if (response.status >= 500 && retryCount < RETRY_CONFIG.maxRetries) {
                    const delay = calculateBackoff(retryCount);
                    console.log(`⏳ Reintentando en ${Math.round(delay / 1000)}s...`);
                    await wait(delay);
                    return this.request<T>(endpoint, options, retryCount + 1);
                }

                return { error: data.error || 'Error en la solicitud' };
            }

            return { data };
        } catch (error: any) {
            console.error('❌ API Network Error:', {
                message: error.message,
                name: error.name,
                url: url,
                attempt: retryCount + 1,
            });

            // Determinar si debemos reintentar
            const isRetryable =
                error.name === 'AbortError' ||
                error.message?.includes('Network request failed') ||
                error.message?.includes('Failed to fetch') ||
                error.message?.includes('timeout');

            if (isRetryable && retryCount < RETRY_CONFIG.maxRetries) {
                const delay = calculateBackoff(retryCount);
                console.log(`⏳ Error de red, reintentando en ${Math.round(delay / 1000)}s...`);
                await wait(delay);
                return this.request<T>(endpoint, options, retryCount + 1);
            }

            // Mensaje más descriptivo según el tipo de error
            let errorMessage = 'Error de conexión';
            if (error.name === 'AbortError') {
                errorMessage = 'Tiempo de espera agotado. Verifica tu conexión a internet.';
            } else if (error.message?.includes('Network request failed')) {
                errorMessage = 'No se pudo conectar al servidor. Verifica tu conexión a internet.';
            }

            return { error: errorMessage, isNetworkError: true };
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
            // Guardar el rol del usuario
            this.userRole = (result.data.user.role as UserRole) || 'usuario';
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
            this.userRole = 'usuario';
        }

        return result;
    }

    // ==================== DELETE ACCOUNT ====================

    async deleteAccount() {
        if (!this.userId) return { error: 'No hay sesión activa' };

        const result = await this.request<{ success: boolean; message: string }>('/auth/delete-account', {
            method: 'DELETE',
            body: JSON.stringify({ userId: this.userId }),
        });

        if (result.data) {
            this.userId = null;
            this.userRole = 'usuario';
        }

        return result;
    }

    // ==================== USERS ====================

    async getUsers(search?: string) {
        const params = new URLSearchParams();
        if (search) params.append('search', search);
        if (this.userId) params.append('exclude', this.userId);
        // Pasar el rol del usuario para filtrar correctamente
        // Usuarios y asesores solo verán consultores
        params.append('requesterRole', this.userRole);

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

    async uploadFile(fileUri: string, type: 'image' | 'video' | 'audio' | 'file', retryCount: number = 0): Promise<ApiResponse<{ url: string; filename: string; type: string }>> {
        if (!this.userId) return { error: 'No hay sesión activa' };

        try {
            const formData = new FormData();

            const filename = fileUri.split('/').pop() || `upload-${Date.now()}`;
            const match = /\.(\w+)$/.exec(filename);
            const ext = match ? match[1] : '';

            let mimeType = 'application/octet-stream';
            if (type === 'image') mimeType = `image/${ext === 'text' ? 'jpeg' : ext}`;
            else if (type === 'audio') mimeType = `audio/${ext}`;
            else if (type === 'video') mimeType = `video/${ext}`;

            formData.append('file', {
                uri: fileUri,
                name: filename,
                type: mimeType,
            } as any);

            const url = `${this.baseUrl}/upload`;
            console.log(`📤 Upload: ${url}${retryCount > 0 ? ` (intento ${retryCount + 1})` : ''}`);

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s para uploads

            const response = await fetch(url, {
                method: 'POST',
                body: formData,
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            const data = await response.json();

            if (!response.ok) {
                // Reintentar en errores de servidor
                if (response.status >= 500 && retryCount < RETRY_CONFIG.maxRetries) {
                    const delay = calculateBackoff(retryCount);
                    console.log(`⏳ Upload: reintentando en ${Math.round(delay / 1000)}s...`);
                    await wait(delay);
                    return this.uploadFile(fileUri, type, retryCount + 1);
                }
                return { error: data.error || 'Error al subir archivo' };
            }

            return { data };
        } catch (error: any) {
            console.error('❌ Upload Error:', error);

            // Reintentar en errores de red
            const isRetryable =
                error.name === 'AbortError' ||
                error.message?.includes('Network request failed');

            if (isRetryable && retryCount < RETRY_CONFIG.maxRetries) {
                const delay = calculateBackoff(retryCount);
                console.log(`⏳ Upload: error de red, reintentando en ${Math.round(delay / 1000)}s...`);
                await wait(delay);
                return this.uploadFile(fileUri, type, retryCount + 1);
            }

            return {
                error: error.name === 'AbortError'
                    ? 'Tiempo de espera agotado al subir archivo'
                    : 'Error de conexión al subir archivo',
                isNetworkError: true,
            };
        }
    }

    // ==================== OCR FISCAL ====================

    async uploadFiscalDocument(fileUri: string, isPDF: boolean = false, retryCount: number = 0): Promise<ApiResponse<{ success: boolean; data: FiscalDataOCR }>> {
        try {
            const formData = new FormData();

            const filename = fileUri.split('/').pop() || `fiscal-${Date.now()}${isPDF ? '.pdf' : '.jpg'}`;
            const match = /\.(\w+)$/.exec(filename);
            const ext = match ? match[1].toLowerCase() : (isPDF ? 'pdf' : 'jpg');

            let mimeType = 'image/jpeg';
            if (ext === 'pdf') mimeType = 'application/pdf';
            else if (ext === 'png') mimeType = 'image/png';
            else if (ext === 'webp') mimeType = 'image/webp';

            formData.append('document', {
                uri: fileUri,
                name: filename,
                type: mimeType,
            } as any);

            const url = `${this.baseUrl}/ocr/fiscal-document`;
            console.log(`🔍 OCR Request: POST ${url} (${isPDF ? 'PDF' : 'Image'})${retryCount > 0 ? ` (intento ${retryCount + 1})` : ''}`);

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), isPDF ? 90000 : 60000);

            const response = await fetch(url, {
                method: 'POST',
                body: formData,
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            const data = await response.json();
            console.log(`✅ OCR Response:`, data.success ? 'Exito' : data.error);

            if (!response.ok) {
                // Reintentar solo en errores de servidor
                if (response.status >= 500 && retryCount < RETRY_CONFIG.maxRetries) {
                    const delay = calculateBackoff(retryCount);
                    console.log(`⏳ OCR: reintentando en ${Math.round(delay / 1000)}s...`);
                    await wait(delay);
                    return this.uploadFiscalDocument(fileUri, isPDF, retryCount + 1);
                }
                return { error: data.error || 'Error al procesar documento' };
            }

            return { data };
        } catch (error: any) {
            console.error('❌ OCR Error:', error);

            // Reintentar en errores de red (pero no en timeout de OCR que puede ser legítimo)
            const isRetryable = error.message?.includes('Network request failed');

            if (isRetryable && retryCount < RETRY_CONFIG.maxRetries) {
                const delay = calculateBackoff(retryCount);
                console.log(`⏳ OCR: error de red, reintentando en ${Math.round(delay / 1000)}s...`);
                await wait(delay);
                return this.uploadFiscalDocument(fileUri, isPDF, retryCount + 1);
            }

            if (error.name === 'AbortError') {
                return { error: 'El procesamiento tardó demasiado. Por favor intente con una imagen más clara o un PDF más pequeño.' };
            }

            return { error: 'Error de conexión al procesar documento', isNetworkError: true };
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

    // ==================== LABELS ====================

    async getLabels() {
        return this.request<{ labels: ChatLabel[] }>('/labels');
    }

    async getChatLabels(chatId: string) {
        return this.request<{ labels: ChatLabel[] }>(`/labels/chat/${chatId}`);
    }

    async assignLabel(chatId: string, labelId: string) {
        if (!this.userId) return { error: 'No hay sesión activa' };

        return this.request<{ success: boolean }>(`/labels/chat/${chatId}`, {
            method: 'POST',
            body: JSON.stringify({ labelId, userId: this.userId }),
        });
    }

    async removeLabel(chatId: string, labelId: string) {
        return this.request<{ success: boolean }>(`/labels/chat/${chatId}/${labelId}`, {
            method: 'DELETE',
        });
    }

    async createLabel(name: string, color: string, icon: string = 'pricetag') {
        return this.request<{ label: ChatLabel }>('/labels', {
            method: 'POST',
            body: JSON.stringify({ name, color, icon }),
        });
    }

    // ==================== CHECKID API ====================

    async consultarRFC(terminoBusqueda: string): Promise<ApiResponse<CheckIdResponse>> {
        const CHECKID_API_KEY = 'ewXxGI3XHrCJn41umWcaCGQLXTFn/sbk/EMeptuIuCI=';
        const CHECKID_URL = 'https://www.checkid.mx/api/Busqueda';

        try {
            console.log(`🔍 CheckId Request: POST ${CHECKID_URL}`);

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000);

            const response = await fetch(CHECKID_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    apiKey: CHECKID_API_KEY,
                    terminoBusqueda: terminoBusqueda.toUpperCase().trim(),
                    obtenerRFC: true,
                    obtenerCURP: true,
                    obtenerCodigoPostal: true,
                    obtenerRegimenFiscal: true,
                    obtenerNSS: false,
                    obtenerEstado69o69B: false,
                }),
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            const data = await response.json();
            console.log(`✅ CheckId Response:`, data.exitoso ? 'Exitoso' : data.error);

            if (!response.ok) {
                return { error: data.error || 'Error al consultar RFC' };
            }

            return { data };
        } catch (error: any) {
            console.error('❌ CheckId Error:', error);

            if (error.name === 'AbortError') {
                return { error: 'Tiempo de espera agotado. Intente de nuevo.' };
            }

            return { error: 'Error de conexión al consultar RFC', isNetworkError: true };
        }
    }
}

// Tipos
export interface User {
    id: string;
    rfc: string;
    name: string | null;
    avatar_url: string | null;
    status?: 'online' | 'offline' | 'typing';
    role?: UserRole;
    // Campos fiscales del OCR
    phone?: string | null;
    razon_social?: string | null;
    tipo_persona?: string | null;
    curp?: string | null;
    regimen_fiscal?: string | null;
    codigo_postal?: string | null;
    estado?: string | null;
    domicilio?: string | null;
}

export interface ChatLabel {
    id: string;
    name: string;
    color: string;
    icon: string;
}

export interface Chat {
    id: string;
    isGroup: boolean;
    groupName: string | null;
    groupAvatar: string | null;
    participants: User[];
    lastMessage: Message | null;
    unreadCount: number;
    labels?: ChatLabel[];
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

export interface FiscalDataOCR {
    rfc: string;
    curp: string | null;
    nombre: string;
    tipoPersona: 'fisica' | 'moral';
    regimenFiscal: string | null;
    codigoRegimen: string | null;
    domicilio: {
        calle: string | null;
        numeroExterior: string | null;
        numeroInterior: string | null;
        colonia: string | null;
        municipio: string | null;
        estado: string | null;
        codigoPostal: string | null;
    };
    fechaInicioOperaciones: string | null;
    estatusRFC: string | null;
    confianza: number;
}

// Interfaz para respuesta de CheckId API
export interface CheckIdResponse {
    exitoso: boolean;
    codigoError: string | null;
    error: string | null;
    resultado: {
        rfc: {
            rfc: string;
            razonSocial: string;
            valido: boolean;
            curp: string;
        } | null;
        curp: {
            curp: string;
            nombres: string;
            primerApellido: string;
            segundoApellido: string;
        } | null;
        codigoPostal: {
            codigoPostal: string;
        } | null;
        regimenFiscal: {
            regimenesFiscales: string;
        } | null;
        nss: {
            nss: string;
        } | null;
        estado69o69B: {
            conProblema: boolean;
        } | null;
    };
}

// Exportar instancia única
export const api = new ApiClient(API_URL);
export default api;
