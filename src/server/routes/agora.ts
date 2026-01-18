import { Router, Request, Response } from 'express';
import { RtcTokenBuilder, RtcRole } from 'agora-access-token';

const router = Router();

// Configuración de Agora - Las credenciales deben estar en variables de entorno
const APP_ID = process.env.AGORA_APP_ID;
const APP_CERTIFICATE = process.env.AGORA_APP_CERTIFICATE;

// Generar token para una llamada
router.post('/token', (req: Request, res: Response) => {
    try {
        const { channelName, uid, role = 'publisher', expiryTime = 3600 } = req.body;

        if (!APP_ID || !APP_CERTIFICATE) {
            console.error('Faltan credenciales de Agora (AGORA_APP_ID o AGORA_APP_CERTIFICATE)');
            return res.status(500).json({ error: 'Error de configuración del servidor' });
        }

        if (!channelName) {
            return res.status(400).json({ error: 'channelName es requerido' });
        }

        // Si uid es 0, dejamos que Agora asigne uno, pero mejor pedirlo
        // Nota: uid debe ser un entero de 32 bits (número) para usar RtcTokenBuilder standard, 
        // o string si usamos buildTokenWithAccount.
        // Asumiendo que usamos User Accounts (strings/uuids de nuestra DB):
        const account = uid ? String(uid) : '';

        if (!account) {
            return res.status(400).json({ error: 'uid es requerido' });
        }

        // Definir rol
        let rtcRole = RtcRole.PUBLISHER;
        if (role === 'subscriber') {
            rtcRole = RtcRole.SUBSCRIBER;
        }

        // Tiempo de expiración
        const currentTimestamp = Math.floor(Date.now() / 1000);
        const privilegeExpiredTs = currentTimestamp + expiryTime;

        // Generar token
        const token = RtcTokenBuilder.buildTokenWithAccount(
            APP_ID,
            APP_CERTIFICATE,
            channelName,
            account,
            rtcRole,
            privilegeExpiredTs
        );

        console.log(`✅ Token de Agora generado para canal ${channelName}, usuario ${account}`);

        res.json({
            token,
            appId: APP_ID,
            channelName,
            uid: account
        });

    } catch (error) {
        console.error('Error generando token de Agora:', error);
        res.status(500).json({ error: 'Error generando token' });
    }
});

export const agoraRoutes = router;
