import { Router, Request, Response } from 'express';
import { RtcTokenBuilder, RtcRole } from 'agora-access-token';

const router = Router();

// Configuración de Agora - Las credenciales deben estar en variables de entorno
const APP_ID = process.env.AGORA_APP_ID;
const APP_CERTIFICATE = process.env.AGORA_APP_CERTIFICATE;

// Generar token para una llamada
router.post('/token', (req: Request, res: Response) => {
    try {
        const { channelName, role = 'publisher', expiryTime = 3600 } = req.body;

        if (!APP_ID) {
            console.error('❌ Falta AGORA_APP_ID');
            return res.status(500).json({ error: 'Error de configuración del servidor - falta APP_ID' });
        }

        if (!APP_CERTIFICATE) {
            console.error('❌ Falta AGORA_APP_CERTIFICATE');
            return res.status(500).json({ error: 'Error de configuración del servidor - falta APP_CERTIFICATE' });
        }

        if (!channelName) {
            return res.status(400).json({ error: 'channelName es requerido' });
        }

        // Usar UID 0 para permitir que cualquier usuario se una
        // Esto es más compatible con joinChannel en el cliente
        const numericUid = 0;

        // Definir rol
        let rtcRole = RtcRole.PUBLISHER;
        if (role === 'subscriber') {
            rtcRole = RtcRole.SUBSCRIBER;
        }

        // Tiempo de expiración
        const currentTimestamp = Math.floor(Date.now() / 1000);
        const privilegeExpiredTs = currentTimestamp + expiryTime;

        // Generar token con UID numérico (0 = wildcard, cualquier usuario puede unirse)
        const token = RtcTokenBuilder.buildTokenWithUid(
            APP_ID,
            APP_CERTIFICATE,
            channelName,
            numericUid,
            rtcRole,
            privilegeExpiredTs
        );

        console.log(`✅ Token de Agora generado para canal ${channelName}, UID: ${numericUid}`);

        res.json({
            token,
            appId: APP_ID,
            channelName,
            uid: numericUid
        });

    } catch (error) {
        console.error('Error generando token de Agora:', error);
        res.status(500).json({ error: 'Error generando token' });
    }
});

export const agoraRoutes = router;
