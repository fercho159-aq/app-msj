import crypto from 'crypto';

// Configuración TURN desde variables de entorno
const TURN_SERVER_URL = process.env.TURN_SERVER_URL || '';
const TURN_SECRET = process.env.TURN_SECRET || '';
const TURN_STATIC_USER = process.env.TURN_STATIC_USER || '';
const TURN_STATIC_PASS = process.env.TURN_STATIC_PASS || '';
const TURN_TTL = parseInt(process.env.TURN_TTL || '86400'); // 24 horas por defecto

interface TurnCredentials {
    iceServers: RTCIceServer[];
}

interface RTCIceServer {
    urls: string | string[];
    username?: string;
    credential?: string;
}

/**
 * Genera credenciales TURN.
 *
 * Soporta dos modos:
 * 1. HMAC-SHA1 (recomendado): Usa TURN_SECRET para generar credenciales temporales
 *    compatibles con coturn use-auth-secret
 * 2. Estático: Usa TURN_STATIC_USER y TURN_STATIC_PASS para credenciales fijas
 *    compatibles con coturn lt-cred-mech
 */
export function getTurnCredentials(): TurnCredentials {
    const iceServers: RTCIceServer[] = [];

    if (!TURN_SERVER_URL) {
        console.warn('[TURN] TURN_SERVER_URL no configurado - llamadas solo funcionarán con STUN');
        return { iceServers };
    }

    // Generar URLs para UDP y TCP
    const turnUrls = [
        `turn:${TURN_SERVER_URL}:3478?transport=udp`,
        `turn:${TURN_SERVER_URL}:3478?transport=tcp`,
        `turns:${TURN_SERVER_URL}:5349?transport=tcp`,
    ];

    if (TURN_SECRET) {
        // Modo HMAC-SHA1: credenciales temporales (coturn use-auth-secret)
        const timestamp = Math.floor(Date.now() / 1000) + TURN_TTL;
        const username = `${timestamp}:webrtc`;
        const credential = crypto
            .createHmac('sha1', TURN_SECRET)
            .update(username)
            .digest('base64');

        iceServers.push({
            urls: turnUrls,
            username,
            credential,
        });

        console.log(`[TURN] Credenciales HMAC generadas, expiran en ${TURN_TTL}s`);
    } else if (TURN_STATIC_USER && TURN_STATIC_PASS) {
        // Modo estático: credenciales fijas (coturn lt-cred-mech)
        iceServers.push({
            urls: turnUrls,
            username: TURN_STATIC_USER,
            credential: TURN_STATIC_PASS,
        });

        console.log('[TURN] Usando credenciales estáticas');
    } else {
        console.warn('[TURN] TURN_SERVER_URL configurado pero sin credenciales (TURN_SECRET o TURN_STATIC_USER/TURN_STATIC_PASS)');
    }

    return { iceServers };
}
