
import { Router, Request, Response } from 'express';
import {
    getAllUsers,
    getUserById,
    updateUser,
    searchUsers,
    updateUserStatus
} from '../../services/userService';
import { pushNotificationService } from '../services/pushNotificationService';

const router = Router();

// POST /api/users/push-token - Registrar push token para notificaciones
router.post('/push-token', async (req: Request, res: Response) => {
    try {
        const { userId, pushToken } = req.body;

        if (!userId || !pushToken) {
            return res.status(400).json({
                error: 'userId y pushToken son requeridos'
            });
        }

        const success = await pushNotificationService.savePushToken(userId, pushToken);

        if (success) {
            res.json({ success: true, message: 'Push token registrado' });
        } else {
            res.status(500).json({ error: 'Error al guardar push token' });
        }

    } catch (error: any) {
        console.error('Error al registrar push token:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET /api/users - Listar todos los usuarios
router.get('/', async (req: Request, res: Response) => {
    try {
        const { search, exclude } = req.query;

        let users;
        if (search && typeof search === 'string') {
            users = await searchUsers(search, exclude as string);
        } else {
            users = await getAllUsers();
        }

        res.json({ users });

    } catch (error: any) {
        console.error('Error al obtener usuarios:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET /api/users/:id - Obtener usuario por ID
router.get('/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const user = await getUserById(id as string);

        if (!user) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        res.json({ user });

    } catch (error: any) {
        console.error('Error al obtener usuario:', error);
        res.status(500).json({ error: error.message });
    }
});

// PUT /api/users/:id - Actualizar usuario
router.put('/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { name, avatar_url, status } = req.body;

        // Force cast to any to avoid TS interface sync issues
        const updateData: any = { name, avatar_url, status };
        const user = await updateUser(id as string, updateData);

        if (!user) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        res.json({ user, message: 'Usuario actualizado' });

    } catch (error: any) {
        console.error('Error al actualizar usuario:', error);
        res.status(500).json({ error: error.message });
    }
});

// PATCH /api/users/:id/status - Actualizar estado del usuario
router.patch('/:id/status', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!['online', 'offline', 'typing'].includes(status)) {
            return res.status(400).json({ error: 'Estado inválido' });
        }

        await updateUserStatus(id as string, status);

        res.json({ success: true, message: 'Estado actualizado' });

    } catch (error: any) {
        console.error('Error al actualizar estado:', error);
        res.status(500).json({ error: error.message });
    }
});

export { router as userRoutes };
