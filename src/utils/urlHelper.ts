import { api } from '../api/client';

// Obtener la URL base desde la configuración del cliente API
// Hack sucio para obtener la URL privada si no se exporta,
// pero asumiremos que podemos reconstruirla o importarla si cambiáramos client.ts
// Por ahora, usamos el valor por defecto si no está en env.
const DEFAULT_API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://appsoluciones.duckdns.org/api';

/**
 * Convierte una ruta relativa o URL parcial en una URL absoluta válida para mostrar imágenes.
 * @param url La ruta o URL de la imagen (ej: "/uploads/foto.png" o "http://...")
 * @returns URL absoluta o null si la entrada es inválida
 */
export const getAbsoluteMediaUrl = (url: string | null | undefined): string | null => {
    if (!url) return null;

    // Si ya es una URL completa (http/https), la devolvemos
    if (url.startsWith('http://') || url.startsWith('https://')) {
        // Corrección opcional para localhost en Android/iOS si fuera necesario, 
        // pero mejor confiar en que la URL ya es correcta si es absoluta.
        return url;
    }

    // Si es una ruta relativa que empieza con /, construimos la URL completa
    if (url.startsWith('/')) {
        // Quitamos '/api' del final de la URL base si existe, para concatenar /uploads
        // Asumiendo que la estructura es base_domain/uploads vs base_domain/api/uploads
        // Normalmente las subidas estáticas están en la raíz del servidor público o en /public

        let baseUrl = DEFAULT_API_URL;

        // Si la URL base termina en /api, la quitamos para adjuntar recursos estáticos
        // Esto depende de cómo el backend sirva los estáticos. 
        // Si están servidos por express.static('uploads'), suelen estar en /uploads
        if (baseUrl.endsWith('/api')) {
            baseUrl = baseUrl.slice(0, -4);
        }

        // Asegurar que no haya doble slash // (aunque http lo suele manejar)
        if (baseUrl.endsWith('/')) {
            baseUrl = baseUrl.slice(0, -1);
        }

        return `${baseUrl}${url}`;
    }

    // Si es un blob local o file://, devolver tal cual
    if (url.startsWith('file://') || url.startsWith('blob:') || url.startsWith('data:')) {
        return url;
    }

    // Fallback: intentar concatenar a la base por si acaso
    return `${DEFAULT_API_URL.replace(/\/api$/, '')}/${url}`;
};
