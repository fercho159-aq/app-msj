import { query, queryOne } from '../database/config';
import bcrypt from 'bcryptjs';

export interface User {
    id: string;
    rfc: string;
    name: string | null;
    avatar_url: string | null;
    last_seen: Date;
    created_at: Date;
    updated_at: Date;
}

export interface CreateUserInput {
    rfc: string;
    name?: string;
    avatar_url?: string;
}

export interface UpdateUserInput {
    name?: string;
    avatar_url?: string;
    phone?: string;
    role?: string;
}

// Crear o obtener usuario por RFC
export const createOrGetUserByRFC = async (rfc: string, password?: string): Promise<User> => {
    // Validar formato RFC básico o Admin
    const rfcRegex = /^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/i;
    // We allow consultans specific formats too if needed

    // Normalizar RFC
    const normalizedRFC = rfc.toUpperCase();

    // Buscar usuario existente
    let user = await queryOne<User>(
        'SELECT * FROM users WHERE rfc = $1',
        [normalizedRFC]
    );

    if (user) {
        return user;
    }

    let hashedPassword = null;
    if (password) {
        hashedPassword = await bcrypt.hash(password, 10);
    }

    // Crear nuevo usuario
    const result = await query<User>(
        `INSERT INTO users (rfc, name, password) 
     VALUES ($1, $2, $3) 
     RETURNING *`,
        [normalizedRFC, `Usuario ${normalizedRFC.substring(0, 4)}`, hashedPassword]
    );

    return result[0];
}

export const verifyCredentials = async (identifier: string, password?: string): Promise<{ isValid: boolean; user?: User; error?: string }> => {
    // Try to find by RFC first
    const normalizedIdentifier = identifier.toUpperCase();
    let user = await queryOne<User & { password?: string }>(
        'SELECT * FROM users WHERE rfc = $1',
        [normalizedIdentifier]
    );

    // If not found by RFC, try by Name (Exact match or case insensitive?)
    if (!user) {
        user = await queryOne<User & { password?: string }>(
            'SELECT * FROM users WHERE name ILIKE $1',
            [identifier]
        );
    }

    if (!user) {
        return { isValid: false, error: 'Usuario no encontrado' };
    }

    if (user.password) {
        if (!password) {
            return { isValid: false, error: 'Contraseña requerida' };
        }

        // Check if password matches (bcrypt compare)
        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            // FALLBACK: Check if it's a legacy plain text password (TEMPORARY MIGRATION LOGIC)
            if (user.password === password) {
                // It matched plain text! We should probably hash it now for the future.
                const newHash = await bcrypt.hash(password, 10);
                await query('UPDATE users SET password = $1 WHERE id = $2', [newHash, user.id]);
                // Proceed as valid
            } else {
                return { isValid: false, error: 'Contraseña incorrecta' };
            }
        }
    }

    // Remove password from returned object
    const { password: _, ...userWithoutPassword } = user;
    return { isValid: true, user: userWithoutPassword };
}

// Obtener usuario por ID
export async function getUserById(id: string): Promise<User | null> {
    return queryOne<User>('SELECT * FROM users WHERE id = $1', [id]);
}

// Obtener usuario por RFC
export async function getUserByRFC(rfc: string): Promise<User | null> {
    return queryOne<User>('SELECT * FROM users WHERE rfc = $1', [rfc.toUpperCase()]);
}

// Actualizar usuario
export async function updateUser(id: string, data: UpdateUserInput): Promise<User | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (data.name !== undefined) {
        fields.push(`name = $${paramIndex++}`);
        values.push(data.name);
    }
    if (data.avatar_url !== undefined) {
        fields.push(`avatar_url = $${paramIndex++}`);
        values.push(data.avatar_url);
    }

    if (fields.length === 0) {
        return getUserById(id);
    }

    values.push(id);
    const result = await query<User>(
        `UPDATE users SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
        values
    );

    return result[0] || null;
}

// Buscar usuarios por nombre
export async function searchUsers(searchTerm: string, excludeUserId?: string): Promise<User[]> {
    let sql = `
    SELECT * FROM users 
    WHERE (name ILIKE $1 OR rfc ILIKE $1)
  `;
    const params: any[] = [`%${searchTerm}%`];

    if (excludeUserId) {
        sql += ` AND id != $2`;
        params.push(excludeUserId);
    }

    sql += ` ORDER BY name LIMIT 20`;

    return query<User>(sql, params);
}

// Obtener todos los usuarios
export async function getAllUsers(): Promise<User[]> {
    return query<User>('SELECT * FROM users ORDER BY name');
}

// Actualizar estado del usuario
export async function updateUserStatus(userId: string, status: string): Promise<void> {
    await query('UPDATE users SET status = $1, last_seen = NOW() WHERE id = $2', [status, userId]);
}

// Obtener usuario por teléfono
export async function getUserByPhone(phone: string): Promise<User | null> {
    return queryOne<User>('SELECT * FROM users WHERE phone = $1', [phone]);
}
