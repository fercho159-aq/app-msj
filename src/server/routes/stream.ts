import { Router, Request, Response } from 'express';
import { StreamClient } from '@stream-io/node-sdk';

const router = Router();

// Configuración de Stream - Las credenciales deberían estar en variables de entorno
const STREAM_API_KEY = process.env.STREAM_API_KEY || '5x8d9e6pwqjt';
const STREAM_API_SECRET = process.env.STREAM_API_SECRET || '7mhtnfbzns2jvgnvpp2ckqvqfs7rt8snqqv2fv67gkqskrrzcsfmb7xwprtd8acf';

// Inicializar cliente de Stream
const streamClient = new StreamClient(STREAM_API_KEY, STREAM_API_SECRET);

// Generar token para un usuario
router.post('/token', async (req: Request, res: Response) => {
    try {
        const { userId, userName } = req.body;

        if (!userId) {
            return res.status(400).json({ error: 'userId es requerido' });
        }

        // Crear o actualizar usuario en Stream
        await streamClient.upsertUsers([{
            id: userId,
            name: userName || userId,
            role: 'user',
        }]);

        // Generar token de usuario (válido por 1 hora)
        const token = streamClient.generateUserToken({ user_id: userId });

        res.json({
            token,
            apiKey: STREAM_API_KEY,
            userId,
        });
    } catch (error) {
        console.error('Error generando token de Stream:', error);
        res.status(500).json({ error: 'Error generando token' });
    }
});

// Crear una llamada de audio
router.post('/call/create', async (req: Request, res: Response) => {
    try {
        const { callId, creatorId, participantIds } = req.body;

        if (!callId || !creatorId) {
            return res.status(400).json({ error: 'callId y creatorId son requeridos' });
        }

        // Crear la llamada en Stream
        const call = streamClient.video.call('audio_room', callId);

        await call.create({
            data: {
                created_by_id: creatorId,
                members: participantIds?.map((id: string) => ({ user_id: id })) || [{ user_id: creatorId }],
                custom: {
                    type: 'audio_only',
                },
            },
        });

        res.json({
            success: true,
            callId,
            callType: 'audio_room',
        });
    } catch (error) {
        console.error('Error creando llamada:', error);
        res.status(500).json({ error: 'Error creando llamada' });
    }
});

export const streamRoutes = router;
