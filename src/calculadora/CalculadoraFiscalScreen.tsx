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

const MESES = [
    { label: 'Enero', value: 0 },
    { label: 'Febrero', value: 1 },
    { label: 'Marzo', value: 2 },
    { label: 'Abril', value: 3 },
    { label: 'Mayo', value: 4 },
    { label: 'Junio', value: 5 },
    { label: 'Julio', value: 6 },
    { label: 'Agosto', value: 7 },
    { label: 'Septiembre', value: 8 },
    { label: 'Octubre', value: 9 },
    { label: 'Noviembre', value: 10 },
    { label: 'Diciembre', value: 11 },
];

const currentYear = new Date().getFullYear();
const ANIOS = Array.from({ length: 30 }, (_, i) => currentYear - i);

interface DatePickerInlineProps {
    label: string;
    month: number;
    year: number;
    onChangeMonth: (m: number) => void;
    onChangeYear: (y: number) => void;
    colors: any;
}

function DatePickerInline({ label, month, year, onChangeMonth, onChangeYear, colors }: DatePickerInlineProps) {
    const [showMonths, setShowMonths] = useState(false);
    const [showYears, setShowYears] = useState(false);

    return (
        <View style={styles.datePickerContainer}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{label}</Text>
            <View style={styles.dateRow}>
                <TouchableOpacity
                    style={[styles.dateBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
                    onPress={() => { setShowMonths(!showMonths); setShowYears(false); }}
                >
                    <Text style={[styles.dateBtnText, { color: colors.textPrimary }]}>
                        {MESES[month].label}
                    </Text>
                    <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.dateBtn, { backgroundColor: colors.surface, borderColor: colors.border, minWidth: 90 }]}
                    onPress={() => { setShowYears(!showYears); setShowMonths(false); }}
                >
                    <Text style={[styles.dateBtnText, { color: colors.textPrimary }]}>{year}</Text>
                    <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
                </TouchableOpacity>
            </View>
            {showMonths && (
                <View style={[styles.dropdown, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled>
                        {MESES.map((m) => (
                            <TouchableOpacity
                                key={m.value}
                                style={[styles.dropdownItem, month === m.value && { backgroundColor: colors.primaryLight + '30' }]}
                                onPress={() => { onChangeMonth(m.value); setShowMonths(false); }}
                            >
                                <Text style={[styles.dropdownText, { color: colors.textPrimary }]}>{m.label}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
            )}
            {showYears && (
                <View style={[styles.dropdown, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled>
                        {ANIOS.map((y) => (
                            <TouchableOpacity
                                key={y}
                                style={[styles.dropdownItem, year === y && { backgroundColor: colors.primaryLight + '30' }]}
                                onPress={() => { onChangeYear(y); setShowYears(false); }}
                            >
                                <Text style={[styles.dropdownText, { color: colors.textPrimary }]}>{y}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
            )}
        </View>
    );
}

interface Props {
    navigation: any;
}

export function CalculadoraFiscalScreen({ navigation }: Props) {
    const { colors } = useTheme();

    // Form state - Contribucion
    const [montoStr, setMontoStr] = useState('');
    const [pagoMonth, setPagoMonth] = useState(new Date().getMonth());
    const [pagoYear, setPagoYear] = useState(new Date().getFullYear() - 1);
    const [actMonth, setActMonth] = useState(new Date().getMonth());
    const [actYear, setActYear] = useState(new Date().getFullYear());

    // Form state - Multa (opcional)
    const [incluirMulta, setIncluirMulta] = useState(false);
    const [multaStr, setMultaStr] = useState('');
    const [notifMonth, setNotifMonth] = useState(new Date().getMonth());
    const [notifYear, setNotifYear] = useState(new Date().getFullYear() - 1);

    // Resultado
    const [resultado, setResultado] = useState<ResultadoCalculo | null>(null);
    const [calcError, setCalcError] = useState<string | null>(null);

    const handleCalcular = () => {
        setCalcError(null);
        setResultado(null);

        const monto = parseFloat(montoStr.replace(/,/g, ''));
        if (isNaN(monto) || monto <= 0) {
            setCalcError('Ingresa un monto valido');
            return;
        }

        const fechaPago = new Date(pagoYear, pagoMonth, 1);
        const fechaAct = new Date(actYear, actMonth, 1);

        if (fechaAct <= fechaPago) {
            setCalcError('La fecha de actualizacion debe ser posterior a la fecha de pago');
            return;
        }

        let multaInput;
        if (incluirMulta) {
            const multaMonto = parseFloat(multaStr.replace(/,/g, ''));
            if (isNaN(multaMonto) || multaMonto <= 0) {
                setCalcError('Ingresa un monto de multa valido');
                return;
            }
            multaInput = {
                montoHistorico: multaMonto,
                fechaNotificacion: new Date(notifYear, notifMonth, 1),
            };
        }

        try {
            const res = calcularTodo(
                INPC_DATA,
                {
                    montoHistorico: monto,
                    fechaPago,
                    fechaActualizacion: fechaAct,
                },
                multaInput,
            );
            setResultado(res);
        } catch (err: any) {
            setCalcError(err.message || 'Error al calcular');
        }
    };

    const handleLimpiar = () => {
        setMontoStr('');
        setMultaStr('');
        setResultado(null);
        setCalcError(null);
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar barStyle={colors.textPrimary === '#ffffff' ? 'light-content' : 'dark-content'} />

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

                    {/* Seccion Contribucion */}
                    <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                            <Ionicons name="calculator" size={18} color={colors.primary} /> Contribucion
                        </Text>

                        <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Monto historico ($)</Text>
                        <TextInput
                            style={[styles.input, { backgroundColor: colors.backgroundSecondary, color: colors.textPrimary, borderColor: colors.border }]}
                            value={montoStr}
                            onChangeText={setMontoStr}
                            placeholder="0.00"
                            placeholderTextColor={colors.textMuted}
                            keyboardType="decimal-pad"
                        />

                        <DatePickerInline
                            label="Fecha en que debio pagarse"
                            month={pagoMonth}
                            year={pagoYear}
                            onChangeMonth={setPagoMonth}
                            onChangeYear={setPagoYear}
                            colors={colors}
                        />

                        <DatePickerInline
                            label="Fecha de actualizacion"
                            month={actMonth}
                            year={actYear}
                            onChangeMonth={setActMonth}
                            onChangeYear={setActYear}
                            colors={colors}
                        />
                    </View>

                    {/* Seccion Multa */}
                    <TouchableOpacity
                        style={[styles.toggleMulta, { backgroundColor: colors.surface, borderColor: colors.border }]}
                        onPress={() => setIncluirMulta(!incluirMulta)}
                    >
                        <Ionicons
                            name={incluirMulta ? 'checkbox' : 'square-outline'}
                            size={22}
                            color={incluirMulta ? colors.primary : colors.textMuted}
                        />
                        <Text style={[styles.toggleMultaText, { color: colors.textPrimary }]}>Incluir multa</Text>
                    </TouchableOpacity>

                    {incluirMulta && (
                        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                                <Ionicons name="document-text" size={18} color={colors.primary} /> Multa
                            </Text>

                            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Monto historico de multa ($)</Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: colors.backgroundSecondary, color: colors.textPrimary, borderColor: colors.border }]}
                                value={multaStr}
                                onChangeText={setMultaStr}
                                placeholder="0.00"
                                placeholderTextColor={colors.textMuted}
                                keyboardType="decimal-pad"
                            />

                            <DatePickerInline
                                label="Fecha de notificacion"
                                month={notifMonth}
                                year={notifYear}
                                onChangeMonth={setNotifMonth}
                                onChangeYear={setNotifYear}
                                colors={colors}
                            />
                        </View>
                    )}

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
                            <Text style={styles.calcBtnText}>Calcular</Text>
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
    const m = resultado.multa;

    return (
        <View style={[styles.resultPanel, { backgroundColor: colors.surface, borderColor: colors.primary + '40' }]}>
            <Text style={[styles.resultTitle, { color: colors.primary }]}>Resultado del Calculo</Text>

            {c && (
                <>
                    <Text style={[styles.resultSubtitle, { color: colors.textPrimary }]}>Contribucion</Text>

                    <ResultRow label="Contribucion Historica" value={formatMXN(c.montoHistorico)} colors={colors} />
                    <ResultRow
                        label={`INPC reciente (${periodoLegible(c.factorActualizacion.inpcReciente.fecha)})`}
                        value={c.factorActualizacion.inpcReciente.valor.toFixed(3)}
                        colors={colors}
                    />
                    <ResultRow
                        label={`INPC antiguo (${periodoLegible(c.factorActualizacion.inpcAntiguo.fecha)})`}
                        value={c.factorActualizacion.inpcAntiguo.valor.toFixed(3)}
                        colors={colors}
                    />
                    <ResultRow label="Factor de Actualizacion" value={c.factorActualizacion.factor.toFixed(6)} colors={colors} bold />
                    <ResultRow label="Monto de Actualizacion" value={formatMXN(c.montoActualizacion)} colors={colors} />
                    <ResultRow label="Contribucion Actualizada" value={formatMXN(c.contribucionActualizada)} colors={colors} bold />

                    <View style={[styles.divider, { backgroundColor: colors.divider }]} />

                    <ResultRow label="Meses de recargo" value={String(c.mesesRecargo)} colors={colors} />
                    <ResultRow label="Tasa mensual de recargos" value={`${(c.tasaRecargos * 100).toFixed(2)}%`} colors={colors} />
                    <ResultRow label="Total de Recargos" value={formatMXN(c.totalRecargos)} colors={colors} bold />

                    <View style={[styles.divider, { backgroundColor: colors.divider }]} />
                    <ResultRow label="Subtotal Contribucion" value={formatMXN(c.totalPagar)} colors={colors} bold />
                </>
            )}

            {m && (
                <>
                    <View style={[styles.divider, { backgroundColor: colors.divider }]} />
                    <Text style={[styles.resultSubtitle, { color: colors.textPrimary }]}>Multa</Text>

                    <ResultRow label="Multa Historica" value={formatMXN(m.montoHistorico)} colors={colors} />
                    <ResultRow
                        label={`INPC reciente (${periodoLegible(m.factorActualizacion.inpcReciente.fecha)})`}
                        value={m.factorActualizacion.inpcReciente.valor.toFixed(3)}
                        colors={colors}
                    />
                    <ResultRow
                        label={`INPC antiguo (${periodoLegible(m.factorActualizacion.inpcAntiguo.fecha)})`}
                        value={m.factorActualizacion.inpcAntiguo.valor.toFixed(3)}
                        colors={colors}
                    />
                    <ResultRow label="Factor de Actualizacion" value={m.factorActualizacion.factor.toFixed(6)} colors={colors} />
                    <ResultRow label="Multa Actualizada" value={formatMXN(m.multaActualizada)} colors={colors} bold />
                </>
            )}

            {/* GRAN TOTAL */}
            <View style={[styles.totalBox, { backgroundColor: colors.primary }]}>
                <Text style={styles.totalLabel}>TOTAL A PAGAR</Text>
                <Text style={styles.totalValue}>{formatMXN(resultado.granTotal)}</Text>
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
        marginTop: 4,
    },
    input: {
        borderWidth: 1,
        borderRadius: 10,
        padding: 12,
        fontSize: 16,
        marginBottom: 8,
    },
    datePickerContainer: {
        marginBottom: 4,
        zIndex: 1,
    },
    dateRow: {
        flexDirection: 'row',
        gap: 8,
    },
    dateBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 1,
        borderRadius: 10,
        padding: 12,
    },
    dateBtnText: {
        fontSize: 14,
        fontWeight: '500',
    },
    dropdown: {
        borderWidth: 1,
        borderRadius: 10,
        marginTop: 4,
        marginBottom: 4,
        overflow: 'hidden',
    },
    dropdownItem: {
        padding: 12,
    },
    dropdownText: {
        fontSize: 14,
    },
    toggleMulta: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        borderRadius: 12,
        borderWidth: 1,
        marginBottom: 12,
        gap: 10,
    },
    toggleMultaText: {
        fontSize: 15,
        fontWeight: '500',
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
    // Results
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
        marginVertical: 8,
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
