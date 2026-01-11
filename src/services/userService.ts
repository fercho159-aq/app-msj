import { query, queryOne } from '../database/config';

export interface User {
    id: string;
    rfc: string;
    name: string | null;
    avatar_url: string | null;
    status: 'online' | 'offline' | 'typing';
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
    status?: 'online' | 'offline' | 'typing';
}

// Crear o obtener usuario por RFC
export const createOrGetUserByRFC = async (rfc: string): Promise<User> => {
    // Validar formato RFC básico o Admin
    const rfcRegex = /^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/i;
    const isAdmin = rfc === 'ADMIN000CONS';

    if (!isAdmin && !rfcRegex.test(rfc)) {
        throw new Error('RFC inválido. Debe tener el formato correcto (ej: GARM850101ABC)');
    }

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

    // Crear nuevo usuario
    const result = await query<User>(
        `INSERT INTO users (rfc, name, status) 
     VALUES ($1, $2, 'offline') 
     RETURNING *`,
        [normalizedRFC, `Usuario ${normalizedRFC.substring(0, 4)}`]
    );

    return result[0];
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
    if (data.status !== undefined) {
        fields.push(`status = $${paramIndex++}`);
        values.push(data.status);
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

// Actualizar estado del usuario
export async function updateUserStatus(id: string, status: 'online' | 'offline' | 'typing'): Promise<void> {
    await query(
        `UPDATE users SET status = $1, last_seen = NOW() WHERE id = $2`,
        [status, id]
    );
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
