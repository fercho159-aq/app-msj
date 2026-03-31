/**
 * Funciones puras de calculo fiscal (Art. 17-A y 21 CFF)
 */
import {
    InpcEntry,
    ContribucionInput,
    MultaInput,
    FactorActualizacion,
    ResultadoContribucion,
    ResultadoMulta,
    ResultadoCalculo,
} from '../types';
import { mesAnterior, mesesEntre } from './fechas';

/** Tasa mensual de recargos por mora (Art. 21 CFF) - vigente */
export const TASA_RECARGOS = 0.0147; // 1.47%

/**
 * Busca el INPC para un periodo "YYYY/MM" en el arreglo de datos.
 * Retorna undefined si no lo encuentra.
 */
export function buscarInpc(datos: InpcEntry[], periodo: string): InpcEntry | undefined {
    return datos.find((e) => e.fecha === periodo);
}

/**
 * Calcula el Factor de Actualizacion (Art. 17-A CFF)
 * Factor = INPC(mes anterior al mas reciente) / INPC(mes anterior al mas antiguo)
 * El factor nunca puede ser menor a 1.
 */
export function calcularFactorActualizacion(
    datos: InpcEntry[],
    fechaAntigua: Date,
    fechaReciente: Date,
): FactorActualizacion {
    const periodoReciente = mesAnterior(fechaReciente);
    const periodoAntiguo = mesAnterior(fechaAntigua);

    const inpcReciente = buscarInpc(datos, periodoReciente);
    const inpcAntiguo = buscarInpc(datos, periodoAntiguo);

    if (!inpcReciente) {
        throw new Error(`No se encontro INPC para el periodo ${periodoReciente}`);
    }
    if (!inpcAntiguo) {
        throw new Error(`No se encontro INPC para el periodo ${periodoAntiguo}`);
    }

    let factor = inpcReciente.valor / inpcAntiguo.valor;
    // El factor de actualizacion no puede ser menor a 1
    if (factor < 1) factor = 1;

    return {
        inpcReciente,
        inpcAntiguo,
        factor: parseFloat(factor.toFixed(6)),
    };
}

/**
 * Calcula la actualizacion y recargos de una contribucion
 */
export function calcularContribucion(
    datos: InpcEntry[],
    input: ContribucionInput,
): ResultadoContribucion {
    const fa = calcularFactorActualizacion(datos, input.fechaPago, input.fechaActualizacion);

    const contribucionActualizada = parseFloat((input.montoHistorico * fa.factor).toFixed(2));
    const montoActualizacion = parseFloat((contribucionActualizada - input.montoHistorico).toFixed(2));

    const mesesRecargo = mesesEntre(input.fechaPago, input.fechaActualizacion);
    const totalRecargos = parseFloat((contribucionActualizada * TASA_RECARGOS * mesesRecargo).toFixed(2));
    const totalPagar = parseFloat((contribucionActualizada + totalRecargos).toFixed(2));

    return {
        montoHistorico: input.montoHistorico,
        factorActualizacion: fa,
        montoActualizacion,
        contribucionActualizada,
        mesesRecargo,
        tasaRecargos: TASA_RECARGOS,
        totalRecargos,
        totalPagar,
    };
}

/**
 * Calcula la actualizacion de una multa
 */
export function calcularMulta(
    datos: InpcEntry[],
    input: MultaInput,
    fechaActualizacion: Date,
): ResultadoMulta {
    const fa = calcularFactorActualizacion(datos, input.fechaNotificacion, fechaActualizacion);

    const multaActualizada = parseFloat((input.montoHistorico * fa.factor).toFixed(2));
    const montoActualizacion = parseFloat((multaActualizada - input.montoHistorico).toFixed(2));

    return {
        montoHistorico: input.montoHistorico,
        factorActualizacion: fa,
        montoActualizacion,
        multaActualizada,
    };
}

/**
 * Calcula el resultado completo (contribucion + multa opcional)
 */
export function calcularTodo(
    datos: InpcEntry[],
    contribucionInput: ContribucionInput,
    multaInput?: MultaInput,
): ResultadoCalculo {
    const contribucion = calcularContribucion(datos, contribucionInput);

    let multa: ResultadoMulta | undefined;
    if (multaInput && multaInput.montoHistorico > 0) {
        multa = calcularMulta(datos, multaInput, contribucionInput.fechaActualizacion);
    }

    const granTotal = contribucion.totalPagar + (multa?.multaActualizada ?? 0);

    return {
        contribucion,
        multa,
        granTotal: parseFloat(granTotal.toFixed(2)),
        fechaCalculo: new Date(),
    };
}

/** Formatea numero a moneda MXN */
export function formatMXN(valor: number): string {
    return '$' + valor.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
