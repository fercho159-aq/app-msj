import { Router, Request, Response } from 'express';
import { createOrGetUserByRFC, getUserByRFC, updateUser, verifyCredentials } from '../../services/userService';
import { query } from '../../database/config';
import bcrypt from 'bcryptjs';

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

        // Extract registration data for general users
        const {
            razonSocial,
            tipoPersona,
            termsAccepted,
            isRegistration // Flag to indicate this is a new registration
        } = req.body;

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
            // User not found - Registration flow for general users
            if (isRegistration) {
                // Validate required registration fields
                if (!termsAccepted) {
                    return res.status(400).json({ error: 'Debe aceptar los términos y condiciones' });
                }
                if (!phone) {
                    return res.status(400).json({ error: 'El número de teléfono es requerido' });
                }
                if (!password) {
                    return res.status(400).json({ error: 'La contraseña es requerida' });
                }

                console.log(`[Auth] Registering new general user with RFC: ${rfc}`);

                // Create user with password
                user = await createOrGetUserByRFC(rfc, password);

                // Update fiscal and registration fields
                await query(`
                    UPDATE users SET
                        phone = $1,
                        role = $2,
                        razon_social = $3,
                        tipo_persona = $4,
                        terms_accepted = $5,
                        terms_accepted_at = NOW(),
                        name = $6
                    WHERE id = $7
                `, [
                    phone,
                    'user',
                    razonSocial || null,
                    tipoPersona || null,
                    true,
                    razonSocial || name || `Usuario ${rfc.substring(0, 4)}`,
                    user.id
                ]);

                user = {
                    ...user,
                    phone,
                    role: 'user',
                    razon_social: razonSocial,
                    tipo_persona: tipoPersona,
                    terms_accepted: true,
                    name: razonSocial || name || user.name
                };
            } else {
                // Not a registration, user doesn't exist - return error
                return res.status(404).json({ error: 'Usuario no encontrado. Por favor regístrese primero.' });
            }
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

// POST /api/auth/setup-admin - Establecer contraseña del admin (uso único)
router.post('/setup-admin', async (req: Request, res: Response) => {
    try {
        const { password, secretKey } = req.body;

        // Clave secreta para proteger este endpoint
        if (secretKey !== 'SETUP_ADMIN_2026') {
            return res.status(403).json({ error: 'No autorizado' });
        }

        if (!password || password.length < 4) {
            return res.status(400).json({ error: 'La contraseña debe tener al menos 4 caracteres' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        await query('UPDATE users SET password = $1 WHERE rfc = $2', [hashedPassword, 'ADMIN000CONS']);

        console.log('[Auth] Contraseña del admin ADMIN000CONS configurada correctamente');
        res.json({ success: true, message: 'Contraseña del admin configurada' });

    } catch (error: any) {
        console.error('Error configurando contraseña del admin:', error);
        res.status(500).json({ error: error.message || 'Error configurando contraseña' });
    }
});

export { router as authRoutes };
