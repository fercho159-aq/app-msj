export interface InpcEntry {
    fecha: string; // "YYYY/MM"
    valor: number;
}

export interface ContribucionInput {
    montoHistorico: number;
    fechaPago: Date;       // Fecha en que debio pagarse
    fechaActualizacion: Date; // Fecha a la que se actualiza
    ejercicioFiscal?: number;
    periodo?: number;      // Mes del periodo (1-12)
}

export interface MultaInput {
    montoHistorico: number;
    fechaNotificacion: Date;
}

export interface FactorActualizacion {
    inpcReciente: InpcEntry;
    inpcAntiguo: InpcEntry;
    factor: number;
}

export interface ResultadoContribucion {
    montoHistorico: number;
    factorActualizacion: FactorActualizacion;
    montoActualizacion: number;
    contribucionActualizada: number;
    mesesRecargo: number;
    tasaRecargos: number;
    totalRecargos: number;
    totalPagar: number;
}

export interface ResultadoMulta {
    montoHistorico: number;
    factorActualizacion: FactorActualizacion;
    montoActualizacion: number;
    multaActualizada: number;
}

export interface ResultadoCalculo {
    contribucion?: ResultadoContribucion;
    multa?: ResultadoMulta;
    granTotal: number;
    fechaCalculo: Date;
}
