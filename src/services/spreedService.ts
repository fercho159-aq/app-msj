/**
 * Spreed-WebRTC Channeling API Client
 * Implementa el protocolo de señalización v1.4.0
 * https://github.com/strukturag/spreed-webrtc
 */

import { SPREED_CONFIG, CHANNELING_API_VERSION } from '../config/webrtc';

// Tipos de documentos del protocolo Channeling
export interface SelfDocument {
  Type: 'Self';
  Id: string;
  Sid: string;
  Userid: string;
  Token: string;
  Version: string;
  Turn?: {
    username: string;
    password: string;
    ttl: number;
    urls: string[];
  };
  Stun?: string[];
}

export interface HelloDocument {
  Type: 'Hello';
  Hello: {
    Version: string;
    Ua: string;
    Id?: string;
    Name?: string;
  };
}

export interface WelcomeDocument {
  Type: 'Welcome';
  Welcome: {
    Room?: {
      Name: string;
      Type: string;
    };
    Users?: Array<{
      Type: string;
      Id: string;
      Ua: string;
      Status?: {
        displayName?: string;
      };
    }>;
  };
}

export interface RoomDocument {
  Type: 'Room';
  Room: {
    Name: string;
    Type?: string;
  };
}

export interface OfferDocument {
  Type: 'Offer';
  Offer: {
    Type: string;
    Sdp: string;
    To: string;
    _conference?: boolean;
  };
}

export interface AnswerDocument {
  Type: 'Answer';
  Answer: {
    Type: string;
    Sdp: string;
    To: string;
  };
}

export interface CandidateDocument {
  Type: 'Candidate';
  Candidate: {
    Type: string;
    sdpMLineIndex: number;
    sdpMid: string;
    candidate: string;
    To: string;
  };
}

export interface ByeDocument {
  Type: 'Bye';
  Bye: {
    To: string;
    Reason?: 'busy' | 'reject' | 'pickuptimeout' | 'abort';
  };
}

export interface ChatDocument {
  Type: 'Chat';
  Chat: {
    To: string;
    Message?: string;
    Type?: string;
    Status?: {
      Typing?: string;
    };
  };
}

export interface StatusDocument {
  Type: 'Status';
  Status: {
    displayName?: string;
    buddyPicture?: string;
    Rev?: number;
  };
}

export interface JoinedDocument {
  Type: 'Joined';
  Id: string;
  Ua: string;
  Status?: {
    displayName?: string;
  };
}

export interface LeftDocument {
  Type: 'Left';
  Id: string;
}

export interface AliveDocument {
  Type: 'Alive';
  Alive: Record<string, never>;  // Empty object as per Spreed protocol
}

// Mensaje envuelto del servidor
export interface ServerMessage {
  From?: string;
  To?: string;
  Data: {
    Type: string;
    [key: string]: any;
  };
  Iid?: string;
  A?: string;
}

// Tipos de eventos
export type SpreedEventType =
  | 'connected'
  | 'disconnected'
  | 'error'
  | 'self'
  | 'welcome'
  | 'joined'
  | 'left'
  | 'offer'
  | 'answer'
  | 'candidate'
  | 'bye'
  | 'chat'
  | 'status'
  | 'users';

type EventCallback = (...args: any[]) => void;

class SpreedService {
  private ws: WebSocket | null = null;
  private token: string | null = null;
  private sessionId: string | null = null;
  private myId: string | null = null;
  private currentRoom: string | null = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 2000;
  private messageQueue: any[] = [];
  private iidCounter = 0;
  private pendingCallbacks: Map<string, (data: any) => void> = new Map();
  private eventListeners: Map<SpreedEventType, Set<EventCallback>> = new Map();
  private keepAliveInterval: NodeJS.Timeout | null = null;
  private userName: string = '';
  private turnServers: RTCIceServer[] = [];

  constructor() {
    // Inicializar listeners vacíos
    const events: SpreedEventType[] = [
      'connected', 'disconnected', 'error', 'self', 'welcome',
      'joined', 'left', 'offer', 'answer', 'candidate', 'bye',
      'chat', 'status', 'users'
    ];
    events.forEach(event => {
      this.eventListeners.set(event, new Set());
    });
  }

  // Getters
  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  get userId(): string | null {
    return this.myId;
  }

  get roomName(): string | null {
    return this.currentRoom;
  }

  get iceServers(): RTCIceServer[] {
    return this.turnServers;
  }

  // Event emitter
  on(event: SpreedEventType, callback: EventCallback): void {
    this.eventListeners.get(event)?.add(callback);
  }

  off(event: SpreedEventType, callback: EventCallback): void {
    this.eventListeners.get(event)?.delete(callback);
  }

  private emit(event: SpreedEventType, ...args: any[]): void {
    this.eventListeners.get(event)?.forEach(callback => {
      try {
        callback(...args);
      } catch (error) {
        console.error(`Error in ${event} listener:`, error);
      }
    });
  }

  // Conectar al servidor
  connect(userName?: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.isConnected) {
        resolve();
        return;
      }

      if (userName) {
        this.userName = userName;
      }

      let url = SPREED_CONFIG.WS_URL;
      if (this.token) {
        url += `?t=${this.token}`;
      }

      console.log('[Spreed] Conectando a:', url);

      try {
        this.ws = new WebSocket(url);

        const onOpen = () => {
          console.log('[Spreed] WebSocket conectado');
          this.reconnectAttempts = 0;
          this.startKeepAlive();
          // No resolvemos aquí, esperamos al documento Self
        };

        const onMessage = (event: MessageEvent) => {
          this.handleMessage(event.data);
        };

        const onError = (event: Event) => {
          console.error('[Spreed] WebSocket error:', event);
          this.emit('error', event);
          reject(new Error('WebSocket connection error'));
        };

        const onClose = (event: CloseEvent) => {
          console.log('[Spreed] WebSocket cerrado:', event.code, event.reason);
          this.stopKeepAlive();
          this.emit('disconnected', event);

          // Intentar reconectar si no fue un cierre intencional
          if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.scheduleReconnect();
          }
        };

        // Listener temporal para Self que resuelve la promesa
        const selfListener = (data: SelfDocument) => {
          this.off('self', selfListener);
          resolve();
        };
        this.on('self', selfListener);

        this.ws.onopen = onOpen;
        this.ws.onmessage = onMessage;
        this.ws.onerror = onError;
        this.ws.onclose = onClose;

      } catch (error) {
        console.error('[Spreed] Error creando WebSocket:', error);
        reject(error);
      }
    });
  }

  // Desconectar
  disconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    this.stopKeepAlive();

    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }

    this.token = null;
    this.sessionId = null;
    this.myId = null;
    this.currentRoom = null;
    this.messageQueue = [];
    this.pendingCallbacks.clear();
  }

  // Manejar mensajes entrantes
  private handleMessage(data: string): void {
    try {
      const msg = JSON.parse(data) as ServerMessage | { Type: string; [key: string]: any };

      // Documento directo del servidor (Self, Welcome, etc.)
      if ('Type' in msg && !('Data' in msg)) {
        this.handleDocument(msg as any, undefined);
        return;
      }

      // Mensaje envuelto
      const wrapped = msg as ServerMessage;
      if (wrapped.Data) {
        this.handleDocument(wrapped.Data, wrapped.From);

        // Manejar callback pendiente
        if (wrapped.Iid && this.pendingCallbacks.has(wrapped.Iid)) {
          const callback = this.pendingCallbacks.get(wrapped.Iid)!;
          this.pendingCallbacks.delete(wrapped.Iid);
          callback(wrapped.Data);
        }
      }
    } catch (error) {
      console.error('[Spreed] Error parsing message:', error);
    }
  }

  // Manejar documentos específicos
  private handleDocument(doc: { Type: string; [key: string]: any }, from?: string): void {
    console.log('[Spreed] Documento recibido:', doc.Type, from ? `de ${from}` : '');

    switch (doc.Type) {
      case 'Self':
        this.handleSelf(doc as SelfDocument);
        break;

      case 'Welcome':
        this.handleWelcome(doc as WelcomeDocument);
        break;

      case 'Joined':
        this.emit('joined', { id: doc.Id, ua: doc.Ua, status: doc.Status });
        break;

      case 'Left':
        this.emit('left', { id: doc.Id });
        break;

      case 'Offer':
        this.emit('offer', {
          from,
          sdp: doc.Offer?.Sdp,
          type: doc.Offer?.Type,
        });
        break;

      case 'Answer':
        this.emit('answer', {
          from,
          sdp: doc.Answer?.Sdp,
          type: doc.Answer?.Type,
        });
        break;

      case 'Candidate':
        this.emit('candidate', {
          from,
          candidate: doc.Candidate?.candidate,
          sdpMLineIndex: doc.Candidate?.sdpMLineIndex,
          sdpMid: doc.Candidate?.sdpMid,
        });
        break;

      case 'Bye':
        this.emit('bye', {
          from,
          reason: doc.Bye?.Reason,
        });
        break;

      case 'Chat':
        this.emit('chat', {
          from,
          message: doc.Chat?.Message,
          type: doc.Chat?.Type,
          status: doc.Chat?.Status,
        });
        break;

      case 'Status':
        this.emit('status', {
          from,
          displayName: doc.Status?.displayName,
          buddyPicture: doc.Status?.buddyPicture,
        });
        break;

      case 'Users':
        this.emit('users', doc.Users || []);
        break;

      case 'Alive':
        // Respuesta keepalive, ignorar
        break;

      case 'Error':
        console.error('[Spreed] Error del servidor:', doc);
        this.emit('error', doc);
        break;

      default:
        console.log('[Spreed] Documento no manejado:', doc.Type);
    }
  }

  // Manejar documento Self
  private handleSelf(self: SelfDocument): void {
    console.log('[Spreed] Self recibido:', self.Id);

    this.myId = self.Id;
    this.sessionId = self.Sid;
    this.token = self.Token;

    // Guardar servidores TURN si están disponibles
    if (self.Turn?.urls) {
      this.turnServers = [{
        urls: self.Turn.urls,
        username: self.Turn.username,
        credential: self.Turn.password,
      }];
    }

    if (self.Stun && self.Stun.length > 0) {
      this.turnServers.push({
        urls: self.Stun,
      });
    }

    // Enviar Hello para confirmar conexión
    this.sendHello();

    this.emit('self', self);
    this.emit('connected');

    // Enviar mensajes en cola
    this.flushQueue();
  }

  // Manejar documento Welcome
  private handleWelcome(welcome: WelcomeDocument): void {
    console.log('[Spreed] Welcome recibido:', welcome.Welcome?.Room?.Name);

    if (welcome.Welcome?.Room?.Name) {
      this.currentRoom = welcome.Welcome.Room.Name;
    }

    this.emit('welcome', welcome.Welcome);

    // Emitir lista de usuarios
    if (welcome.Welcome?.Users) {
      this.emit('users', welcome.Welcome.Users);
    }
  }

  // Enviar documento Hello
  private sendHello(): void {
    const hello: HelloDocument = {
      Type: 'Hello',
      Hello: {
        Version: CHANNELING_API_VERSION,
        Ua: `MSJ-App/1.0 (React Native)`,
        Id: this.myId || undefined,
        Name: this.userName || undefined,
      },
    };
    this.send(hello);
  }

  // Unirse a una sala
  joinRoom(roomName: string): void {
    console.log('[Spreed] Uniéndose a sala:', roomName);

    // Primero salir de cualquier sala existente
    if (this.currentRoom && this.currentRoom !== roomName) {
      this.leaveRoom();
    }

    const room: RoomDocument = {
      Type: 'Room',
      Room: {
        Name: roomName,
        Type: 'conference',
      },
    };
    this.send(room);
    this.currentRoom = roomName;
  }

  // Salir de la sala actual
  leaveRoom(): void {
    if (this.currentRoom) {
      const leave = {
        Type: 'Leave',
        Leave: {},
      };
      this.send(leave);
      this.currentRoom = null;
    }
  }

  // Enviar oferta SDP
  sendOffer(to: string, sdp: RTCSessionDescriptionInit): void {
    console.log('[Spreed] Enviando Offer a:', to);

    const offer: OfferDocument = {
      Type: 'Offer',
      Offer: {
        Type: sdp.type || 'offer',
        Sdp: sdp.sdp || '',
        To: to,
      },
    };
    this.send(offer);
  }

  // Enviar respuesta SDP
  sendAnswer(to: string, sdp: RTCSessionDescriptionInit): void {
    console.log('[Spreed] Enviando Answer a:', to);

    const answer: AnswerDocument = {
      Type: 'Answer',
      Answer: {
        Type: sdp.type || 'answer',
        Sdp: sdp.sdp || '',
        To: to,
      },
    };
    this.send(answer);
  }

  // Enviar candidato ICE
  sendCandidate(to: string, candidate: RTCIceCandidate): void {
    console.log('[Spreed] Enviando Candidate a:', to);

    const candidateDoc: CandidateDocument = {
      Type: 'Candidate',
      Candidate: {
        Type: 'candidate',
        sdpMLineIndex: candidate.sdpMLineIndex ?? 0,
        sdpMid: candidate.sdpMid || '',
        candidate: candidate.candidate,
        To: to,
      },
    };
    this.send(candidateDoc);
  }

  // Enviar Bye (terminar llamada)
  sendBye(to: string, reason?: 'busy' | 'reject' | 'pickuptimeout' | 'abort'): void {
    console.log('[Spreed] Enviando Bye a:', to, reason);

    const bye: ByeDocument = {
      Type: 'Bye',
      Bye: {
        To: to,
        Reason: reason,
      },
    };
    this.send(bye);
  }

  // Enviar mensaje de chat
  sendChat(to: string, message: string): void {
    const chat: ChatDocument = {
      Type: 'Chat',
      Chat: {
        To: to,
        Message: message,
      },
    };
    this.send(chat);
  }

  // Actualizar estado (nombre de usuario, foto)
  updateStatus(displayName?: string, buddyPicture?: string): void {
    const status: StatusDocument = {
      Type: 'Status',
      Status: {
        displayName,
        buddyPicture,
      },
    };
    this.send(status);
  }

  // Enviar documento genérico
  private send(doc: { Type: string; [key: string]: any }, callback?: (data: any) => void): void {
    if (!this.isConnected) {
      console.log('[Spreed] No conectado, encolando mensaje:', doc.Type);
      this.messageQueue.push({ doc, callback });
      return;
    }

    const message: any = { ...doc };

    if (callback) {
      const iid = `${++this.iidCounter}`;
      message.Iid = iid;
      this.pendingCallbacks.set(iid, callback);
    }

    try {
      this.ws!.send(JSON.stringify(message));
    } catch (error) {
      console.error('[Spreed] Error enviando mensaje:', error);
    }
  }

  // Enviar mensajes en cola
  private flushQueue(): void {
    while (this.messageQueue.length > 0 && this.isConnected) {
      const { doc, callback } = this.messageQueue.shift()!;
      this.send(doc, callback);
    }
  }

  // Programar reconexión
  private scheduleReconnect(): void {
    if (this.reconnectTimeout) return;

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    console.log(`[Spreed] Reconectando en ${delay}ms (intento ${this.reconnectAttempts})`);

    this.reconnectTimeout = setTimeout(() => {
      this.reconnectTimeout = null;
      this.connect(this.userName).catch(error => {
        console.error('[Spreed] Error en reconexión:', error);
      });
    }, delay);
  }

  // Keep-alive
  private startKeepAlive(): void {
    this.keepAliveInterval = setInterval(() => {
      if (this.isConnected) {
        const alive: AliveDocument = {
          Type: 'Alive',
          Alive: {},
        };
        this.send(alive);
      }
    }, 30000);
  }

  private stopKeepAlive(): void {
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
      this.keepAliveInterval = null;
    }
  }
}

// Singleton
export const spreedService = new SpreedService();
export default spreedService;
