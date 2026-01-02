import { Router, Request, Response } from 'express';
import {
    getAllUsers,
    getUserById,
    updateUser,
    searchUsers,
    updateUserStatus
} from '../../services/userService';

const router = Router();

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
        const user = await getUserById(id);

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

        const user = await updateUser(id, { name, avatar_url, status });

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

        await updateUserStatus(id, status);

        res.json({ success: true, message: 'Estado actualizado' });

    } catch (error: any) {
        console.error('Error al actualizar estado:', error);
        res.status(500).json({ error: error.message });
    }
});

export { router as userRoutes };
