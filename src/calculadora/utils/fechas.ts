/**
 * Utilidades para manejo de fechas fiscales (Art. 17-A CFF)
 */

/** Retorna "YYYY/MM" del mes inmediato anterior a la fecha dada */
export function mesAnterior(fecha: Date): string {
    const d = new Date(fecha.getFullYear(), fecha.getMonth() - 1, 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    return `${y}/${m}`;
}

/** Calcula meses completos entre dos fechas */
export function mesesEntre(desde: Date, hasta: Date): number {
    const anios = hasta.getFullYear() - desde.getFullYear();
    const meses = hasta.getMonth() - desde.getMonth();
    let total = anios * 12 + meses;
    if (total < 0) total = 0;
    return total;
}

/** Formatea fecha a DD/MM/YYYY */
export function formatFecha(fecha: Date): string {
    const d = String(fecha.getDate()).padStart(2, '0');
    const m = String(fecha.getMonth() + 1).padStart(2, '0');
    const y = fecha.getFullYear();
    return `${d}/${m}/${y}`;
}

/** Convierte "YYYY/MM" a nombre legible "Enero 2024" */
const MESES = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

export function periodoLegible(periodo: string): string {
    const [y, m] = periodo.split('/');
    return `${MESES[parseInt(m, 10) - 1]} ${y}`;
}
