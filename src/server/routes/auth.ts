import { Router, Request, Response } from 'express';
import { createOrGetUserByRFC, getUserByRFC, updateUser, verifyCredentials } from '../../services/userService';

const router = Router();

import { createChat } from '../../services/chatService';

const ADMIN_RFC = 'ADMIN000CONS';

// POST /api/auth/login - Login/Registro con RFC
router.post('/login', async (req: Request, res: Response) => {
    try {
        console.log('Login attempt:', req.body);
        const { rfc, password, role, phone, name } = req.body;

        // --- ADVISOR LOGIC ---
        if (role === 'advisor') {
            // Case 1: Registration (Phone is provided)
            if (phone) {
                if (!password) {
                    return res.status(400).json({ error: 'Contraseña requerida para registro' });
                }

                // Prioritize explicit RFC if provided, otherwise generate from Phone
                const advisorRfc = rfc || `ADV${phone.replace(/\D/g, '').substring(0, 10)}`;
                console.log(`[Auth] Advisor Registration/Login - Using RFC: ${advisorRfc}`);

                // Try to login if exists
                const authResult = await verifyCredentials(advisorRfc, password);

                let user;
                if (authResult.isValid && authResult.user) {
                    user = authResult.user;
                } else {
                    // Register new advisor
                    // Check if "Name" is provided for registration
                    if (!name) {
                        return res.status(400).json({ error: 'Nombre es requerido para registro' });
                    }

                    user = await createOrGetUserByRFC(advisorRfc, password);

                    // Update extra fields
                    await updateUser(user.id, {
                        name: name || user.name,
                    });

                    // Direct update for phone/role
                    const { query } = require('../../database/config');
                    await query('UPDATE users SET phone = $1, role = $2 WHERE id = $3', [phone, 'advisor', user.id]);

                    user = { ...user, name: name, phone, role: 'advisor' };
                }

                res.json({
                    success: true,
                    user: {
                        id: user.id,
                        rfc: user.rfc,
                        name: user.name,
                        avatar_url: user.avatar_url,
                        role: 'advisor'
                    },
                    message: 'Sesión de asesor iniciada'
                });
                return;

            } else {
                // Case 2: Login (No phone, Name + Password)
                if (!name || !password) {
                    return res.status(400).json({ error: 'Nombre y contraseña son requeridos' });
                }

                // Verify using Name
                const authResult = await verifyCredentials(name, password);

                if (authResult.isValid && authResult.user) {
                    const user = authResult.user;
                    res.json({
                        success: true,
                        user: {
                            id: user.id,
                            rfc: user.rfc,
                            name: user.name,
                            avatar_url: user.avatar_url,
                            role: 'advisor'
                        },
                        message: 'Sesión iniciada'
                    });
                    return;
                } else {
                    return res.status(401).json({ error: 'Credenciales incorrectas (Nombre o Contraseña)' });
                }
            }
        }
        // ---------------------

        if (!rfc) {
            console.warn('[Auth] Login failed: RFC is missing in body');
            return res.status(400).json({ error: 'El RFC es requerido' });
        }

        // Validar formato RFC (permitir el del admin y nuevos consultores)
        // Adjust regex or validity check? createOrGetUserByRFC has validation inside.
        // We can skip local regex or make it permissive for CONSULTANT pattern.

        // 1. Try to verify credentials first
        const authResult = await verifyCredentials(rfc, password);

        let user;

        if (authResult.isValid && authResult.user) {
            // User exists and password (if any) is correct
            user = authResult.user;
        } else if (authResult.error === 'Contraseña incorrecta' || authResult.error === 'Contraseña requerida') {
            console.warn(`[Auth] Login failed for RFC ${rfc}: ${authResult.error}`);
            // Exists but failed auth
            return res.status(401).json({ error: authResult.error });
        } else {
            // User validation failed (likely not found)
            // Proceed to create/register logic (only for basic users?)
            // Or allow creation.

            // Check regex before creating
            const rfcRegex = /^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/i;
            // Also allow new consultant format if we want auto-create? No, they are seeded.

            /* TEMPORARILY DISABLED
            if (!rfcRegex.test(rfc) && rfc !== ADMIN_RFC && !rfc.startsWith('CONS') && !rfc.startsWith('ADV')) {
                console.warn(`[Auth] RFC Validation Failed: '${rfc}'`);
                console.warn(`[Auth] Regex Check: ${rfcRegex.source} -> ${rfcRegex.test(rfc)}`);
                console.warn(`[Auth] Code details: Length=${rfc.length}, CharCodes=${Array.from(rfc).map(c => c.charCodeAt(0))}`);

                return res.status(400).json({ error: `RFC inválido para registro (${rfc})` });
            }
            */

            // Auto-create (Register)
            console.log(`[Auth] Creating/Registering new user with RFC: ${rfc}`);
            user = await createOrGetUserByRFC(rfc, password);
        }

        // Logic for Admin/Consultants (Legacy and New)
        // If it's one of the seated consultants, we might want to ensure they are "online" etc.
        // ... (Existing logic continues below)

        // Ensure "Consultor" name logic (Legacy for ADMIN000CONS)
        if (user.rfc === ADMIN_RFC && user.name !== 'Consultor') {
            await updateUser(user.id, { name: 'Consultor' });
            user.name = 'Consultor';
        }

        // 3. Si el usuario NO es consultor/admin, crear chat con los consultores?
        // Existing logic created chat with ADMIN_RFC. 
        // We probably shouldn't break this.
        if (user.rfc !== ADMIN_RFC && !user.rfc.startsWith('CONS') && !user.rfc.startsWith('ADV')) {
            try {
                // Ensure Admin exists specifically for the chat target?
                let adminUser = await getUserByRFC(ADMIN_RFC);
                // If seeded Admin/Consultant doesn't exist (it should), handle it.
                if (adminUser) {
                    await createChat(user.id, adminUser.id);
                }
            } catch (error) {
                console.error('Error creando chat con Consultor:', error);
            }
        }

        res.json({
            success: true,
            user: {
                id: user.id,
                rfc: user.rfc,
                name: user.name,
                avatar_url: user.avatar_url,
                // status: 'online', // Removed
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

        // Status update removed
        // await updateUserStatus(userId, 'offline');

        res.json({ success: true, message: 'Sesión cerrada' });

    } catch (error: any) {
        console.error('Error en logout:', error);
        res.status(500).json({ error: error.message });
    }
});

export { router as authRoutes };
