import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TextInput,
    TouchableOpacity,
    Platform,
    KeyboardAvoidingView,
    StatusBar,
    Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { calcularTodo, formatMXN, TASA_RECARGOS } from './utils/calculos';
import { periodoLegible } from './utils/fechas';
import { ResultadoCalculo } from './types';
import { INPC_DATA, INPC_ULTIMO_PERIODO } from './data/inpc';

/** Aplica mascara DD/MM/YYYY mientras el usuario escribe */
function applyDateMask(raw: string): string {
    const digits = raw.replace(/\D/g, '').slice(0, 8);
    if (digits.length <= 2) return digits;
    if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

/** Parsea DD/MM/YYYY a Date. Retorna null si es invalido. */
function parseDate(text: string): Date | null {
    const match = text.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!match) return null;
    const day = parseInt(match[1], 10);
    const month = parseInt(match[2], 10);
    const year = parseInt(match[3], 10);
    if (month < 1 || month > 12 || day < 1 || day > 31 || year < 2000) return null;
    const d = new Date(year, month - 1, day);
    if (d.getDate() !== day || d.getMonth() !== month - 1 || d.getFullYear() !== year) return null;
    return d;
}

interface Props {
    navigation: any;
}

export function CalculadoraFiscalScreen({ navigation }: Props) {
    const { colors, isDark } = useTheme();

    const [montoStr, setMontoStr] = useState('');
    const [fechaDebioStr, setFechaDebioStr] = useState('');
    const [fechaPagoStr, setFechaPagoStr] = useState('');

    const [resultado, setResultado] = useState<ResultadoCalculo | null>(null);
    const [calcError, setCalcError] = useState<string | null>(null);
    const [fieldErrors, setFieldErrors] = useState<{ monto?: boolean; fechaDebio?: boolean; fechaPago?: boolean }>({});

    const handleCalcular = () => {
        setCalcError(null);
        setResultado(null);
        const errors: typeof fieldErrors = {};

        const monto = parseFloat(montoStr.replace(/,/g, ''));
        if (isNaN(monto) || monto <= 0) errors.monto = true;

        const fechaDebio = parseDate(fechaDebioStr);
        if (!fechaDebio) errors.fechaDebio = true;

        const fechaPago = parseDate(fechaPagoStr);
        if (!fechaPago) errors.fechaPago = true;

        if (fechaDebio && fechaPago && fechaPago <= fechaDebio) {
            errors.fechaPago = true;
            setCalcError('La fecha de pago debe ser posterior a la fecha en que debio pagarse');
        }

        setFieldErrors(errors);
        if (Object.keys(errors).length > 0) {
            if (!calcError) setCalcError('Completa correctamente los campos marcados');
            return;
        }

        try {
            const res = calcularTodo(
                INPC_DATA,
                {
                    montoHistorico: monto,
                    fechaPago: fechaDebio!,
                    fechaActualizacion: fechaPago!,
                },
            );
            setResultado(res);
        } catch (err: any) {
            setCalcError(err.message || 'Error al calcular');
        }
    };

    const handleLimpiar = () => {
        setMontoStr('');
        setFechaDebioStr('');
        setFechaPagoStr('');
        setResultado(null);
        setCalcError(null);
        setFieldErrors({});
    };

    const inputStyle = (hasError?: boolean) => [
        styles.input,
        {
            backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#FFFFFF',
            color: colors.textPrimary,
            borderColor: hasError ? '#dc2626' : colors.border,
        },
    ];

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Calculadora Fiscal</Text>
                <View style={{ width: 40 }} />
            </View>

            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Logos */}
                    <View style={styles.logosContainer}>
                        <Image
                            source={require('../../assets/logo-sat.png')}
                            style={styles.logoSat}
                            resizeMode="contain"
                        />
                        <Image
                            source={require('../../assets/logo-adeudos.png')}
                            style={styles.logoAdeudos}
                            resizeMode="contain"
                        />
                    </View>

                    {/* Disclaimer */}
                    <View style={[styles.disclaimer, { backgroundColor: colors.primary + '15', borderColor: colors.primary + '40' }]}>
                        <Ionicons name="information-circle" size={18} color={colors.primary} />
                        <Text style={[styles.disclaimerText, { color: colors.textSecondary }]}>
                            Este simulador es informativo. Los calculos oficiales los emite el SAT.
                        </Text>
                    </View>

                    {/* INPC Info */}
                    <View style={[styles.inpcStatus, { backgroundColor: colors.surface }]}>
                        <Ionicons name="stats-chart" size={16} color={colors.primary} />
                        <Text style={[styles.inpcStatusText, { color: colors.textMuted }]}>
                            INPC: {INPC_DATA.length} periodos hasta {periodoLegible(INPC_ULTIMO_PERIODO)}
                        </Text>
                    </View>

                    {/* Formulario */}
                    <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                            <Ionicons name="calculator" size={18} color={colors.primary} /> Datos del Adeudo
                        </Text>

                        {/* Importe */}
                        <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Importe a pagar ($) *</Text>
                        <TextInput
                            style={inputStyle(fieldErrors.monto)}
                            value={montoStr}
                            onChangeText={setMontoStr}
                            placeholder="10,000.00"
                            placeholderTextColor={colors.textMuted}
                            keyboardType="decimal-pad"
                        />

                        {/* Fecha debio pagar */}
                        <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Fecha en que debio pagarse *</Text>
                        <TextInput
                            style={inputStyle(fieldErrors.fechaDebio)}
                            value={fechaDebioStr}
                            onChangeText={(t) => setFechaDebioStr(applyDateMask(t))}
                            placeholder="DD/MM/AAAA"
                            placeholderTextColor={colors.textMuted}
                            keyboardType="number-pad"
                            maxLength={10}
                        />

                        {/* Fecha se pago */}
                        <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Fecha en que se pago *</Text>
                        <TextInput
                            style={inputStyle(fieldErrors.fechaPago)}
                            value={fechaPagoStr}
                            onChangeText={(t) => setFechaPagoStr(applyDateMask(t))}
                            placeholder="DD/MM/AAAA"
                            placeholderTextColor={colors.textMuted}
                            keyboardType="number-pad"
                            maxLength={10}
                        />

                    </View>

                    {/* Error */}
                    {calcError && (
                        <View style={[styles.errorBox, { borderColor: '#dc2626' }]}>
                            <Ionicons name="alert-circle" size={16} color="#dc2626" />
                            <Text style={styles.errorText}>{calcError}</Text>
                        </View>
                    )}

                    {/* Botones */}
                    <View style={styles.buttonsRow}>
                        <TouchableOpacity
                            style={[styles.calcBtn, { backgroundColor: colors.primary }]}
                            onPress={handleCalcular}
                        >
                            <Ionicons name="calculator" size={20} color="#fff" />
                            <Text style={styles.calcBtnText}>CALCULAR</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.clearBtn, { borderColor: colors.border }]}
                            onPress={handleLimpiar}
                        >
                            <Ionicons name="trash-outline" size={18} color={colors.textMuted} />
                            <Text style={[styles.clearBtnText, { color: colors.textMuted }]}>Limpiar</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Resultados */}
                    {resultado && (
                        <ResultadoPanel resultado={resultado} colors={colors} />
                    )}

                    <View style={{ height: 40 }} />
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}

/** Panel de resultados */
function ResultadoPanel({ resultado, colors }: { resultado: ResultadoCalculo; colors: any }) {
    const c = resultado.contribucion;
    if (!c) return null;

    const inpcPago = c.factorActualizacion.inpcReciente;
    const inpcDebio = c.factorActualizacion.inpcAntiguo;
    const labelPago = periodoLegible(inpcPago.fecha).split(' ')[0]; // solo nombre del mes
    const labelDebio = periodoLegible(inpcDebio.fecha).split(' ')[0];

    return (
        <View style={[styles.resultPanel, { backgroundColor: colors.surface, borderColor: colors.primary + '40' }]}>
            <Text style={[styles.resultTitle, { color: colors.primary }]}>Resultado del Calculo</Text>

            {/* Seccion Actualizacion */}
            <Text style={[styles.resultSubtitle, { color: colors.textPrimary }]}>
                <Ionicons name="trending-up" size={15} color={colors.primary} /> Calculo de Actualizacion
            </Text>

            <ResultRow label={`INPC ${labelPago}:`} value={inpcPago.valor.toFixed(3)} colors={colors} />
            <ResultRow label={`INPC ${labelDebio}:`} value={inpcDebio.valor.toFixed(3)} colors={colors} />
            <ResultRow label="Factor Actualizacion:" value={c.factorActualizacion.factor.toFixed(4)} colors={colors} />
            <ResultRow label="= Impuesto Actualizado:" value={formatMXN(c.contribucionActualizada)} colors={colors} bold />

            <View style={[styles.divider, { backgroundColor: colors.divider }]} />

            {/* Seccion Recargos */}
            <Text style={[styles.resultSubtitle, { color: colors.textPrimary }]}>
                <Ionicons name="time" size={15} color={colors.primary} /> Calculo de Recargo
            </Text>

            <ResultRow
                label="Meses Transcurridos:"
                value={`${c.mesesRecargo} a ${(c.tasaRecargos * 100).toFixed(2)}%`}
                colors={colors}
            />
            <ResultRow label="Recargos en Meses:" value={formatMXN(c.totalRecargos)} colors={colors} />
            <ResultRow label="= Importe Recargo:" value={formatMXN(c.totalRecargos)} colors={colors} bold />

            {/* Total */}
            <View style={[styles.totalBox, { backgroundColor: colors.primary }]}>
                <Text style={styles.totalLabel}>= IMPUESTO A PAGAR</Text>
                <Text style={styles.totalValue}>{formatMXN(c.totalPagar)}</Text>
            </View>
        </View>
    );
}

function ResultRow({ label, value, colors, bold }: { label: string; value: string; colors: any; bold?: boolean }) {
    return (
        <View style={styles.resultRow}>
            <Text style={[styles.resultLabel, { color: colors.textSecondary }, bold && { fontWeight: '600', color: colors.textPrimary }]} numberOfLines={2}>
                {label}
            </Text>
            <Text style={[styles.resultValue, { color: colors.textPrimary }, bold && { fontWeight: '700' }]}>
                {value}
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: Platform.OS === 'ios' ? 56 : 16,
        paddingBottom: 12,
    },
    backBtn: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 16,
    },
    logosContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        marginBottom: 16,
        paddingVertical: 8,
    },
    logoSat: {
        width: 120,
        height: 60,
    },
    logoAdeudos: {
        width: 160,
        height: 60,
    },
    disclaimer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 10,
        borderWidth: 1,
        marginBottom: 12,
        gap: 8,
    },
    disclaimerText: {
        flex: 1,
        fontSize: 12,
        lineHeight: 16,
    },
    inpcStatus: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        borderRadius: 8,
        marginBottom: 12,
        gap: 8,
    },
    inpcStatusText: {
        fontSize: 12,
        flex: 1,
    },
    section: {
        borderRadius: 12,
        borderWidth: 1,
        padding: 16,
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 12,
    },
    inputLabel: {
        fontSize: 13,
        fontWeight: '500',
        marginBottom: 6,
        marginTop: 8,
    },
    input: {
        borderWidth: 1,
        borderRadius: 10,
        padding: 12,
        fontSize: 16,
        marginBottom: 4,
    },
    errorBox: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 8,
        borderWidth: 1,
        marginBottom: 12,
        gap: 8,
        backgroundColor: '#fef2f2',
    },
    errorText: {
        color: '#dc2626',
        fontSize: 13,
        flex: 1,
    },
    buttonsRow: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 16,
    },
    calcBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 14,
        borderRadius: 12,
        gap: 8,
    },
    calcBtnText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
    clearBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 14,
        borderRadius: 12,
        borderWidth: 1,
        gap: 6,
        paddingHorizontal: 20,
    },
    clearBtnText: {
        fontSize: 14,
        fontWeight: '500',
    },
    resultPanel: {
        borderRadius: 12,
        borderWidth: 1.5,
        padding: 16,
        marginBottom: 8,
    },
    resultTitle: {
        fontSize: 17,
        fontWeight: '800',
        marginBottom: 12,
        textAlign: 'center',
    },
    resultSubtitle: {
        fontSize: 14,
        fontWeight: '700',
        marginBottom: 8,
        marginTop: 4,
    },
    resultRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 5,
    },
    resultLabel: {
        fontSize: 12,
        flex: 1,
        marginRight: 8,
    },
    resultValue: {
        fontSize: 13,
        fontWeight: '500',
        textAlign: 'right',
    },
    divider: {
        height: 1,
        marginVertical: 10,
    },
    totalBox: {
        marginTop: 12,
        borderRadius: 10,
        padding: 16,
        alignItems: 'center',
    },
    totalLabel: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '600',
        opacity: 0.9,
    },
    totalValue: {
        color: '#fff',
        fontSize: 24,
        fontWeight: '800',
        marginTop: 4,
    },
});
