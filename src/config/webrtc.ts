// Configuración de WebRTC para Spreed-WebRTC

export const SPREED_CONFIG = {
  // URL del servidor WebSocket de Spreed
  WS_URL: 'wss://calls.mawsoluciones.com/ws',

  // URL base del servidor
  BASE_URL: 'https://calls.mawsoluciones.com',
};

export const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    // Servidores STUN públicos de Google
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
  ],
  iceCandidatePoolSize: 10,
};

// Configuración de media constraints
export const MEDIA_CONSTRAINTS = {
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
  },
  video: {
    facingMode: 'user',
    width: { ideal: 1280, max: 1920 },
    height: { ideal: 720, max: 1080 },
    frameRate: { ideal: 30, max: 60 },
  },
};

// Configuración de SDP
export const SDP_CONSTRAINTS = {
  offerToReceiveAudio: true,
  offerToReceiveVideo: true,
};

// Versión del protocolo Channeling API
export const CHANNELING_API_VERSION = '1.4.0';
