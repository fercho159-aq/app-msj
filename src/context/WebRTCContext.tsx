import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect,
  ReactNode,
} from 'react';
import { Platform } from 'react-native';
import { ICE_SERVERS, MEDIA_CONSTRAINTS, SDP_CONSTRAINTS } from '../config/webrtc';
import { spreedService } from '../services/spreedService';

// Importación condicional de WebRTC para React Native
// En web usamos las APIs nativas del navegador
let RTCPeerConnection: any;
let RTCSessionDescription: any;
let RTCIceCandidate: any;
let mediaDevices: any;
let MediaStream: any;

if (Platform.OS !== 'web') {
  // Para React Native, necesitas instalar react-native-webrtc
  try {
    const webrtc = require('react-native-webrtc');
    RTCPeerConnection = webrtc.RTCPeerConnection;
    RTCSessionDescription = webrtc.RTCSessionDescription;
    RTCIceCandidate = webrtc.RTCIceCandidate;
    mediaDevices = webrtc.mediaDevices;
    MediaStream = webrtc.MediaStream;
    console.log('[WebRTC] react-native-webrtc cargado correctamente');
    console.log('[WebRTC] RTCPeerConnection disponible:', !!RTCPeerConnection);
    console.log('[WebRTC] mediaDevices disponible:', !!mediaDevices);
  } catch (e) {
    console.error('[WebRTC] Error cargando react-native-webrtc:', e);
  }
} else {
  // Para Web, usar APIs nativas
  RTCPeerConnection = window.RTCPeerConnection;
  RTCSessionDescription = window.RTCSessionDescription;
  RTCIceCandidate = window.RTCIceCandidate;
  mediaDevices = navigator.mediaDevices;
  MediaStream = window.MediaStream;
}

export interface WebRTCState {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isConnected: boolean;
  isInCall: boolean;
  isMuted: boolean;
  isSpeakerOn: boolean;
  isVideoEnabled: boolean;
  callDuration: number;
  remoteUserId: string | null;
}

export interface WebRTCContextType extends WebRTCState {
  // Control de llamada
  initializeMedia: (video: boolean) => Promise<MediaStream | null>;
  createOffer: (targetUserId: string) => Promise<RTCSessionDescriptionInit | null>;
  handleOffer: (
    fromUserId: string,
    sdp: RTCSessionDescriptionInit
  ) => Promise<RTCSessionDescriptionInit | null>;
  handleAnswer: (sdp: RTCSessionDescriptionInit) => Promise<void>;
  handleCandidate: (candidate: RTCIceCandidateInit) => Promise<void>;
  endCall: () => void;

  // Control de media
  toggleMute: () => void;
  toggleVideo: () => void;
  toggleSpeaker: () => void;
  switchCamera: () => Promise<void>;

  // Cleanup
  cleanup: () => void;
}

const initialState: WebRTCState = {
  localStream: null,
  remoteStream: null,
  isConnected: false,
  isInCall: false,
  isMuted: false,
  isSpeakerOn: false,
  isVideoEnabled: false,
  callDuration: 0,
  remoteUserId: null,
};

const WebRTCContext = createContext<WebRTCContextType | undefined>(undefined);

export const WebRTCProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<WebRTCState>(initialState);
  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const callTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pendingCandidates = useRef<RTCIceCandidateInit[]>([]);
  const remoteUserIdRef = useRef<string | null>(null);

  // Obtener configuración ICE combinada (servidores estáticos + dinámicos de Spreed)
  const getIceConfiguration = useCallback((): RTCConfiguration => {
    const dynamicServers = spreedService.iceServers;
    // Filtrar servidores con URLs vacías que causan error en PeerConnection
    const allServers = [...(ICE_SERVERS.iceServers || []), ...dynamicServers].filter(server => {
      if (!server.urls) return false;
      if (Array.isArray(server.urls) && server.urls.length === 0) return false;
      return true;
    });
    return {
      ...ICE_SERVERS,
      iceServers: allServers,
    };
  }, []);

  // Crear peer connection
  const createPeerConnection = useCallback((): RTCPeerConnection | null => {
    if (!RTCPeerConnection) {
      console.error('[WebRTC] RTCPeerConnection no disponible');
      return null;
    }

    try {
      const config = getIceConfiguration();
      console.log('[WebRTC] Creando PeerConnection con config:', JSON.stringify(config));

      const pc = new RTCPeerConnection(config);

      // Manejar ICE candidates
      pc.onicecandidate = (event: RTCPeerConnectionIceEvent) => {
        if (event.candidate && remoteUserIdRef.current) {
          console.log('[WebRTC] Enviando ICE candidate');
          spreedService.sendCandidate(remoteUserIdRef.current, event.candidate);
        }
      };

      // Manejar cambios de estado de conexión
      pc.onconnectionstatechange = () => {
        console.log('[WebRTC] Connection state:', pc.connectionState);

        if (pc.connectionState === 'connected') {
          setState(prev => ({ ...prev, isConnected: true, isInCall: true }));
          startCallTimer();
        } else if (
          pc.connectionState === 'disconnected' ||
          pc.connectionState === 'failed' ||
          pc.connectionState === 'closed'
        ) {
          setState(prev => ({ ...prev, isConnected: false }));
        }
      };

      // Manejar estado de ICE
      pc.oniceconnectionstatechange = () => {
        console.log('[WebRTC] ICE connection state:', pc.iceConnectionState);
      };

      // Manejar streams remotos
      pc.ontrack = (event: RTCTrackEvent) => {
        console.log('[WebRTC] Track recibido:', event.track.kind);

        if (event.streams && event.streams[0]) {
          remoteStreamRef.current = event.streams[0];
          setState(prev => ({ ...prev, remoteStream: event.streams[0] }));
        }
      };

      // Para navegadores más antiguos
      (pc as any).onaddstream = (event: any) => {
        console.log('[WebRTC] Stream remoto añadido (legacy)');
        if (event.stream) {
          remoteStreamRef.current = event.stream;
          setState(prev => ({ ...prev, remoteStream: event.stream }));
        }
      };

      peerConnection.current = pc;
      return pc;
    } catch (error) {
      console.error('[WebRTC] Error creando PeerConnection:', error);
      return null;
    }
  }, [getIceConfiguration]);

  // Inicializar media (obtener audio/video local)
  const initializeMedia = useCallback(async (video: boolean): Promise<MediaStream | null> => {
    if (!mediaDevices) {
      console.error('[WebRTC] mediaDevices no disponible');
      return null;
    }

    try {
      const constraints: MediaStreamConstraints = {
        audio: MEDIA_CONSTRAINTS.audio,
        video: video ? MEDIA_CONSTRAINTS.video : false,
      };

      console.log('[WebRTC] Solicitando media con constraints:', JSON.stringify(constraints));

      const stream = await mediaDevices.getUserMedia(constraints);
      localStreamRef.current = stream;

      setState(prev => ({
        ...prev,
        localStream: stream,
        isVideoEnabled: video,
      }));

      console.log('[WebRTC] Media obtenido:', stream.getTracks().map((t: MediaStreamTrack) => t.kind));
      return stream;
    } catch (error) {
      console.error('[WebRTC] Error obteniendo media:', error);
      return null;
    }
  }, []);

  // Crear oferta SDP (quien inicia la llamada)
  const createOffer = useCallback(
    async (targetUserId: string): Promise<RTCSessionDescriptionInit | null> => {
      try {
        remoteUserIdRef.current = targetUserId;

        // Crear peer connection si no existe
        let pc = peerConnection.current;
        if (!pc) {
          pc = createPeerConnection();
          if (!pc) return null;
        }

        // Agregar tracks locales
        if (localStreamRef.current) {
          localStreamRef.current.getTracks().forEach((track: MediaStreamTrack) => {
            pc!.addTrack(track, localStreamRef.current!);
          });
        }

        // Crear oferta
        const offer = await pc.createOffer(SDP_CONSTRAINTS);
        await pc.setLocalDescription(offer);

        console.log('[WebRTC] Oferta creada');

        setState(prev => ({ ...prev, remoteUserId: targetUserId }));

        return offer;
      } catch (error) {
        console.error('[WebRTC] Error creando oferta:', error);
        return null;
      }
    },
    [createPeerConnection]
  );

  // Manejar oferta recibida (quien recibe la llamada)
  const handleOffer = useCallback(
    async (
      fromUserId: string,
      sdp: RTCSessionDescriptionInit
    ): Promise<RTCSessionDescriptionInit | null> => {
      try {
        remoteUserIdRef.current = fromUserId;

        // Crear peer connection si no existe
        let pc = peerConnection.current;
        if (!pc) {
          pc = createPeerConnection();
          if (!pc) return null;
        }

        // Agregar tracks locales
        if (localStreamRef.current) {
          localStreamRef.current.getTracks().forEach((track: MediaStreamTrack) => {
            pc!.addTrack(track, localStreamRef.current!);
          });
        }

        // Establecer descripción remota
        await pc.setRemoteDescription(new RTCSessionDescription(sdp));

        // Procesar candidatos pendientes
        for (const candidate of pendingCandidates.current) {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        }
        pendingCandidates.current = [];

        // Crear respuesta
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        console.log('[WebRTC] Respuesta creada');

        setState(prev => ({ ...prev, remoteUserId: fromUserId }));

        return answer;
      } catch (error) {
        console.error('[WebRTC] Error manejando oferta:', error);
        return null;
      }
    },
    [createPeerConnection]
  );

  // Manejar respuesta recibida
  const handleAnswer = useCallback(async (sdp: RTCSessionDescriptionInit): Promise<void> => {
    try {
      const pc = peerConnection.current;
      if (!pc) {
        console.error('[WebRTC] No hay PeerConnection para manejar answer');
        return;
      }

      await pc.setRemoteDescription(new RTCSessionDescription(sdp));

      // Procesar candidatos pendientes
      for (const candidate of pendingCandidates.current) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      }
      pendingCandidates.current = [];

      console.log('[WebRTC] Respuesta procesada');
    } catch (error) {
      console.error('[WebRTC] Error manejando respuesta:', error);
    }
  }, []);

  // Manejar candidato ICE recibido
  const handleCandidate = useCallback(async (candidate: RTCIceCandidateInit): Promise<void> => {
    try {
      const pc = peerConnection.current;

      if (!pc || !pc.remoteDescription) {
        // Guardar candidato para después
        console.log('[WebRTC] Guardando candidato ICE pendiente');
        pendingCandidates.current.push(candidate);
        return;
      }

      await pc.addIceCandidate(new RTCIceCandidate(candidate));
      console.log('[WebRTC] Candidato ICE agregado');
    } catch (error) {
      console.error('[WebRTC] Error agregando candidato ICE:', error);
    }
  }, []);

  // Terminar llamada
  const endCall = useCallback(() => {
    console.log('[WebRTC] Terminando llamada');

    // Enviar Bye si hay usuario remoto
    if (remoteUserIdRef.current) {
      spreedService.sendBye(remoteUserIdRef.current);
    }

    cleanup();
  }, []);

  // Limpiar recursos
  const cleanup = useCallback(() => {
    // Detener timer
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
      callTimerRef.current = null;
    }

    // Detener tracks locales
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track: MediaStreamTrack) => {
        track.stop();
      });
      localStreamRef.current = null;
    }

    // Cerrar peer connection
    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }

    // Limpiar referencias
    remoteStreamRef.current = null;
    remoteUserIdRef.current = null;
    pendingCandidates.current = [];

    // Resetear estado
    setState(initialState);
  }, []);

  // Iniciar timer de llamada
  const startCallTimer = useCallback(() => {
    if (callTimerRef.current) return;

    callTimerRef.current = setInterval(() => {
      setState(prev => ({
        ...prev,
        callDuration: prev.callDuration + 1,
      }));
    }, 1000);
  }, []);

  // Toggle mute
  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setState(prev => ({ ...prev, isMuted: !audioTrack.enabled }));
      }
    }
  }, []);

  // Toggle video
  const toggleVideo = useCallback(() => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setState(prev => ({ ...prev, isVideoEnabled: videoTrack.enabled }));
      }
    }
  }, []);

  // Toggle speaker (solo funciona en nativo con react-native-webrtc)
  const toggleSpeaker = useCallback(() => {
    // En React Native, necesitarías usar InCallManager
    // Por ahora solo actualizamos el estado
    setState(prev => ({ ...prev, isSpeakerOn: !prev.isSpeakerOn }));
  }, []);

  // Cambiar cámara (frontal/trasera)
  const switchCamera = useCallback(async () => {
    if (!localStreamRef.current || Platform.OS === 'web') return;

    try {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack && typeof (videoTrack as any)._switchCamera === 'function') {
        (videoTrack as any)._switchCamera();
      }
    } catch (error) {
      console.error('[WebRTC] Error cambiando cámara:', error);
    }
  }, []);

  // Escuchar eventos de Spreed para WebRTC
  useEffect(() => {
    const handleSpreedAnswer = async (data: { from: string; sdp: string; type: string }) => {
      if (data.sdp) {
        await handleAnswer({ type: data.type as RTCSdpType, sdp: data.sdp });
      }
    };

    const handleSpreedCandidate = async (data: {
      from: string;
      candidate: string;
      sdpMLineIndex: number;
      sdpMid: string;
    }) => {
      if (data.candidate) {
        await handleCandidate({
          candidate: data.candidate,
          sdpMLineIndex: data.sdpMLineIndex,
          sdpMid: data.sdpMid,
        });
      }
    };

    const handleSpreedBye = () => {
      cleanup();
    };

    spreedService.on('answer', handleSpreedAnswer);
    spreedService.on('candidate', handleSpreedCandidate);
    spreedService.on('bye', handleSpreedBye);

    return () => {
      spreedService.off('answer', handleSpreedAnswer);
      spreedService.off('candidate', handleSpreedCandidate);
      spreedService.off('bye', handleSpreedBye);
    };
  }, [handleAnswer, handleCandidate, cleanup]);

  // Cleanup al desmontar
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  const value: WebRTCContextType = {
    ...state,
    initializeMedia,
    createOffer,
    handleOffer,
    handleAnswer,
    handleCandidate,
    endCall,
    toggleMute,
    toggleVideo,
    toggleSpeaker,
    switchCamera,
    cleanup,
  };

  return <WebRTCContext.Provider value={value}>{children}</WebRTCContext.Provider>;
};

export const useWebRTC = (): WebRTCContextType => {
  const context = useContext(WebRTCContext);
  if (!context) {
    throw new Error('useWebRTC debe usarse dentro de WebRTCProvider');
  }
  return context;
};

export default WebRTCContext;
