import { Router, Request, Response } from 'express';
import { createOrGetUserByRFC, getUserByRFC, updateUserStatus, updateUser } from '../../services/userService';

const router = Router();

import { createChat } from '../../services/chatService';

const ADMIN_RFC = 'ADMIN000CONS';

// POST /api/auth/login - Login/Registro con RFC
router.post('/login', async (req: Request, res: Response) => {
    try {
        const { rfc } = req.body;

        if (!rfc) {
            return res.status(400).json({ error: 'El RFC es requerido' });
        }

        // Validar formato RFC (permitir el del admin)
        const rfcRegex = /^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/i;
        const isAdmin = rfc === ADMIN_RFC;

        if (!isAdmin && !rfcRegex.test(rfc)) {
            return res.status(400).json({
                error: 'RFC inválido',
                message: 'El RFC debe tener el formato correcto (ej: GARM850101ABC)'
            });
        }

        // 1. Asegurar que el Admin "Consultor" exista
        let adminUser = await getUserByRFC(ADMIN_RFC);
        if (!adminUser) {
            adminUser = await createOrGetUserByRFC(ADMIN_RFC);
        }

        // Asegurar el nombre "Consultor"
        if (adminUser.name !== 'Consultor') {
            await updateUser(adminUser.id, { name: 'Consultor' });
            adminUser.name = 'Consultor';
        }


        // 2. Crear o obtener el usuario actual
        const user = await createOrGetUserByRFC(rfc);

        // Si es el admin, asegurar su nombre en la instancia actual
        if (user.rfc === ADMIN_RFC && user.name !== 'Consultor') {
            await updateUser(user.id, { name: 'Consultor' });
            user.name = 'Consultor';
        }

        // 3. Si el usuario NO es el admin, crear chat con el Consultor
        if (user.rfc !== ADMIN_RFC) {
            try {
                // Crear chat con el admin
                await createChat(user.id, adminUser.id);
            } catch (error) {
                console.error('Error creando chat con Consultor:', error);
            }
        }

        // Actualizar estado a online
        await updateUserStatus(user.id, 'online');

        res.json({
            success: true,
            user: {
                id: user.id,
                rfc: user.rfc,
                name: user.name,
                avatar_url: user.avatar_url,
                status: 'online',
            },
            message: 'Sesión iniciada correctamente'
        });

    } catch (error: any) {
        console.error('Error en login:', error);
        res.status(500).json({ error: error.message || 'Error al iniciar sesión' });
    }
});

// POST /api/auth/logout - Cerrar sesión
router.post('/logout', async (req: Request, res: Response) => {
    try {
        const { userId } = req.body;

        if (!userId) {
            return res.status(400).json({ error: 'userId es requerido' });
        }

        await updateUserStatus(userId, 'offline');

        res.json({ success: true, message: 'Sesión cerrada' });

    } catch (error: any) {
        console.error('Error en logout:', error);
        res.status(500).json({ error: error.message });
    }
});

export { router as authRoutes };
