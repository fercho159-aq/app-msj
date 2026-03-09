import React, { useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, ScrollView,
    ActivityIndicator, StyleSheet, Modal, Platform, useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../context/ThemeContext';
import { api } from '../../api/client';
import type { CheckIdResponse } from '../../api/client';

interface RfcSearchModalProps {
    visible: boolean;
    onClose: () => void;
}

interface Estado69Detail {
    conProblema: boolean;
    situacion: string | null;
    problemas: Array<{ descripcion: string; fechaPublicacion: string }>;
    oficiosEFOS: Array<{ tipo: string; oficioID: string; fechaPublicacionSAT: string }>;
}

interface ResultData {
    rfc: string;
    razonSocial: string;
    valido: boolean;
    tipoPersona: 'fisica' | 'moral';
    // FIEL
    validoHasta: string | null;
    // Representante legal
    rfcRepresentante: string | null;
    curpRepresentante: string | null;
    emailContacto: string | null;
    // CURP data
    curp: string | null;
    nombres: string | null;
    primerApellido: string | null;
    segundoApellido: string | null;
    sexo: string | null;
    entidadNacimiento: string | null;
    fechaNacimiento: string | null;
    // Fiscal
    codigoPostal: string | null;
    regimenFiscal: string | null;
    entidadFederativa: string | null;
    // Extras
    nss: string | null;
    estado69: Estado69Detail | null;
}

export const RfcSearchModal: React.FC<RfcSearchModalProps> = ({ visible, onClose }) => {
    const { colors, isDark } = useTheme();
    const { width: screenWidth } = useWindowDimensions();
    const isMobile = screenWidth < 768;
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<ResultData | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleSearch = async () => {
        const term = searchTerm.trim().toUpperCase();
        if (!term) return;

        setIsLoading(true);
        setError(null);
        setResult(null);

        try {
            const response = await api.searchRFC(term);

            if (response.error) {
                setError(response.error);
                return;
            }

            const data = response.data as CheckIdResponse;

            if (!data.exitoso) {
                setError(data.error || 'No se encontraron resultados para este RFC.');
                return;
            }

            const r = data.resultado;
            console.log('📋 CheckID resultado completo:', JSON.stringify(data, null, 2));

            const e69 = r.estado69o69B;
            setResult({
                rfc: r.rfc?.rfc || term,
                razonSocial: r.rfc?.razonSocial || 'No disponible',
                valido: r.rfc?.valido ?? false,
                tipoPersona: data.tipoPersona || (term.length === 12 ? 'moral' : 'fisica'),
                validoHasta: r.rfc?.validoHastaText || r.rfc?.validoHasta || null,
                rfcRepresentante: r.rfc?.rfcRepresentante || null,
                curpRepresentante: r.rfc?.curpRepresentante || null,
                emailContacto: r.rfc?.emailContacto || null,
                curp: r.rfc?.curp || r.curp?.curp || null,
                nombres: r.curp?.nombres || null,
                primerApellido: r.curp?.primerApellido || null,
                segundoApellido: r.curp?.segundoApellido || null,
                sexo: r.curp?.sexo || null,
                entidadNacimiento: r.curp?.entidad || null,
                fechaNacimiento: r.curp?.fechaNacimientoText || null,
                codigoPostal: r.codigoPostal?.codigoPostal || null,
                regimenFiscal: r.regimenFiscal?.regimenesFiscales || null,
                entidadFederativa: data.entidadFederativa || r.curp?.entidad || null,
                nss: r.nss?.nss || null,
                estado69: e69 ? {
                    conProblema: e69.conProblema,
                    situacion: e69.detalles?.situacionContribuyente || null,
                    problemas: e69.detalles?.problemas || [],
                    oficiosEFOS: e69.detalles?.oficiosEFOS || [],
                } : null,
            });
        } catch (err) {
            setError('Error de conexion. Intenta de nuevo.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleClose = () => {
        setSearchTerm('');
        setResult(null);
        setError(null);
        onClose();
    };

    const cardBg = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.95)';
    const cardBorder = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';
    const fieldBg = isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)';

    const renderField = (label: string, value: string | null, icon: keyof typeof Ionicons.glyphMap) => {
        const hasValue = !!value;
        return (
            <View style={[styles.field, { backgroundColor: fieldBg }]}>
                <View style={[styles.fieldIcon, !hasValue && { opacity: 0.4 }]}>
                    <Ionicons name={icon} size={16} color={colors.primary} />
                </View>
                <View style={styles.fieldContent}>
                    <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>{label}</Text>
                    <Text
                        style={[styles.fieldValue, { color: hasValue ? colors.textPrimary : colors.textMuted }]}
                        selectable={hasValue}
                    >
                        {value || 'No disponible'}
                    </Text>
                </View>
            </View>
        );
    };

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
            <View style={styles.overlay}>
                <View style={[
                    styles.modal,
                    {
                        backgroundColor: isDark ? '#111113' : '#FFFFFF',
                        borderColor: cardBorder,
                    },
                    isMobile && styles.modalMobile,
                ]}>
                    {/* Header */}
                    <LinearGradient
                        colors={isDark ? ['#1a1a2e', '#16213e'] as [string, string] : ['#5C76B2', '#7A93C8'] as [string, string]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.header}
                    >
                        <View style={styles.headerLeft}>
                            <View style={styles.headerIconBg}>
                                <Ionicons name="search" size={18} color="#FFFFFF" />
                            </View>
                            <View>
                                <Text style={styles.headerTitle}>Buscar RFC</Text>
                                <Text style={styles.headerSubtitle}>Consulta datos fiscales por RFC</Text>
                            </View>
                        </View>
                        <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
                            <Ionicons name="close" size={20} color="rgba(255,255,255,0.9)" />
                        </TouchableOpacity>
                    </LinearGradient>

                    {/* Search Input */}
                    <View style={styles.searchSection}>
                        <View style={[styles.searchRow, isMobile && styles.searchRowMobile]}>
                            <View style={[
                                styles.inputContainer,
                                {
                                    backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                                    borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
                                },
                            ]}>
                                <Ionicons name="document-text-outline" size={18} color={colors.textMuted} />
                                <TextInput
                                    style={[styles.input, { color: colors.textPrimary }]}
                                    placeholder="Ingresa un RFC (ej. XAXX010101000)"
                                    placeholderTextColor={colors.textMuted}
                                    value={searchTerm}
                                    onChangeText={(t) => setSearchTerm(t.toUpperCase())}
                                    onSubmitEditing={handleSearch}
                                    autoCapitalize="characters"
                                    maxLength={13}
                                    editable={!isLoading}
                                />
                                {searchTerm.length > 0 && !isLoading && (
                                    <TouchableOpacity onPress={() => setSearchTerm('')}>
                                        <Ionicons name="close-circle" size={18} color={colors.textMuted} />
                                    </TouchableOpacity>
                                )}
                            </View>
                            <TouchableOpacity
                                onPress={handleSearch}
                                disabled={!searchTerm.trim() || isLoading}
                                style={[styles.searchBtn, (!searchTerm.trim() || isLoading) && { opacity: 0.5 }]}
                            >
                                <LinearGradient
                                    colors={['#5C76B2', '#7A93C8'] as [string, string]}
                                    style={styles.searchBtnGradient}
                                >
                                    {isLoading ? (
                                        <ActivityIndicator size="small" color="#FFFFFF" />
                                    ) : (
                                        <>
                                            <Ionicons name="search" size={16} color="#FFFFFF" />
                                            <Text style={styles.searchBtnText}>Buscar</Text>
                                        </>
                                    )}
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Results */}
                    <ScrollView
                        style={styles.body}
                        contentContainerStyle={styles.bodyContent}
                        showsVerticalScrollIndicator={false}
                    >
                        {error && (
                            <View style={[styles.errorBox, { backgroundColor: isDark ? 'rgba(239,68,68,0.1)' : 'rgba(239,68,68,0.06)' }]}>
                                <Ionicons name="alert-circle" size={20} color="#EF4444" />
                                <Text style={[styles.errorText, { color: isDark ? '#FCA5A5' : '#DC2626' }]}>{error}</Text>
                            </View>
                        )}

                        {!result && !error && !isLoading && (
                            <View style={styles.emptyState}>
                                <View style={[styles.emptyIcon, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(92,118,178,0.08)' }]}>
                                    <Ionicons name="document-text-outline" size={36} color={isDark ? '#97B1DE' : '#5C76B2'} />
                                </View>
                                <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                                    Consulta datos del SAT
                                </Text>
                                <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
                                    Ingresa un RFC para obtener razon social, CURP, regimen fiscal, codigo postal y mas.
                                </Text>
                            </View>
                        )}

                        {result && (
                            <View style={styles.resultContainer}>
                                {/* Status badges row */}
                                <View style={styles.badgesRow}>
                                    <View style={[
                                        styles.statusBadge,
                                        {
                                            backgroundColor: result.valido
                                                ? (isDark ? 'rgba(16,185,129,0.12)' : 'rgba(16,185,129,0.08)')
                                                : (isDark ? 'rgba(239,68,68,0.12)' : 'rgba(239,68,68,0.08)'),
                                        },
                                    ]}>
                                        <Ionicons
                                            name={result.valido ? 'checkmark-circle' : 'close-circle'}
                                            size={16}
                                            color={result.valido ? '#10B981' : '#EF4444'}
                                        />
                                        <Text style={[styles.statusText, { color: result.valido ? '#10B981' : '#EF4444' }]}>
                                            RFC {result.valido ? 'Valido' : 'No valido'}
                                        </Text>
                                    </View>
                                    <View style={[styles.statusBadge, {
                                        backgroundColor: isDark ? 'rgba(139,92,246,0.12)' : 'rgba(139,92,246,0.08)',
                                    }]}>
                                        <Ionicons
                                            name={result.tipoPersona === 'moral' ? 'business' : 'person'}
                                            size={16}
                                            color="#8B5CF6"
                                        />
                                        <Text style={[styles.statusText, { color: '#8B5CF6' }]}>
                                            Persona {result.tipoPersona === 'moral' ? 'Moral' : 'Fisica'}
                                        </Text>
                                    </View>
                                </View>

                                {/* Main info card */}
                                <View style={[styles.resultCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                                    <View style={styles.resultHeader}>
                                        <LinearGradient
                                            colors={result.tipoPersona === 'moral'
                                                ? ['#8B5CF6', '#C4B5FD'] as [string, string]
                                                : ['#5C76B2', '#97B1DE'] as [string, string]}
                                            style={styles.resultAvatar}
                                        >
                                            <Ionicons
                                                name={result.tipoPersona === 'moral' ? 'business' : 'person'}
                                                size={22}
                                                color="#FFFFFF"
                                            />
                                        </LinearGradient>
                                        <View style={styles.resultHeaderInfo}>
                                            <Text style={[styles.resultName, { color: colors.textPrimary }]} numberOfLines={2}>
                                                {result.razonSocial}
                                            </Text>
                                            <Text style={[styles.resultRfc, { color: colors.primary }]} selectable>
                                                {result.rfc}
                                            </Text>
                                        </View>
                                    </View>
                                </View>

                                {/* Datos Fiscales */}
                                <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>DATOS FISCALES</Text>
                                <View style={styles.fieldsGrid}>
                                    {renderField('Regimen Fiscal', result.regimenFiscal, 'briefcase-outline')}
                                    {renderField('Codigo Postal', result.codigoPostal, 'location-outline')}
                                    {renderField('Entidad Federativa', result.entidadFederativa, 'map-outline')}
                                    {renderField('FIEL valida hasta', result.validoHasta, 'calendar-outline')}
                                    {renderField('Email de Contacto', result.emailContacto, 'mail-outline')}
                                </View>

                                {/* Representante Legal / Persona */}
                                <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
                                    {result.tipoPersona === 'moral' ? 'REPRESENTANTE LEGAL' : 'DATOS PERSONALES'}
                                </Text>
                                <View style={styles.fieldsGrid}>
                                    {renderField(
                                        result.tipoPersona === 'moral' ? 'Nombre del Representante' : 'Nombre completo',
                                        [result.nombres, result.primerApellido, result.segundoApellido].filter(Boolean).join(' ') || null,
                                        'person-outline'
                                    )}
                                    {result.tipoPersona === 'moral' && renderField('RFC del Representante', result.rfcRepresentante, 'document-text-outline')}
                                    {renderField(
                                        result.tipoPersona === 'moral' ? 'CURP del Representante' : 'CURP',
                                        result.curpRepresentante || result.curp,
                                        'card-outline'
                                    )}
                                    {renderField('Fecha de Nacimiento', result.fechaNacimiento, 'calendar-outline')}
                                    {renderField('Sexo', result.sexo, 'people-outline')}
                                    {renderField('Entidad de Nacimiento', result.entidadNacimiento, 'flag-outline')}
                                    {renderField('NSS', result.nss, 'shield-outline')}
                                </View>

                                {/* Estado 69 / 69-B */}
                                <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>SITUACION FISCAL</Text>
                                {(() => {
                                    const e = result.estado69;
                                    const hasData = e !== null;
                                    const hasProblem = e?.conProblema === true;
                                    const colorOk = '#10B981';
                                    const colorBad = '#EF4444';
                                    const color = !hasData ? colors.textMuted : (hasProblem ? colorBad : colorOk);
                                    return (
                                        <View style={styles.fieldsGrid}>
                                            <View style={[styles.field, {
                                                backgroundColor: !hasData ? fieldBg
                                                    : hasProblem
                                                        ? (isDark ? 'rgba(239,68,68,0.1)' : 'rgba(239,68,68,0.06)')
                                                        : (isDark ? 'rgba(16,185,129,0.1)' : 'rgba(16,185,129,0.06)'),
                                            }]}>
                                                <View style={[styles.fieldIcon, {
                                                    backgroundColor: !hasData ? 'rgba(92,118,178,0.1)'
                                                        : hasProblem ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.15)',
                                                }]}>
                                                    <Ionicons
                                                        name={!hasData ? 'help-circle-outline' : (hasProblem ? 'warning' : 'checkmark-circle')}
                                                        size={16}
                                                        color={!hasData ? colors.primary : color}
                                                    />
                                                </View>
                                                <View style={styles.fieldContent}>
                                                    <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>LISTA 69 / 69-B (SAT)</Text>
                                                    <Text style={[styles.fieldValue, { color, fontWeight: '700' }]}>
                                                        {!hasData ? 'No disponible' : (hasProblem ? 'CON PROBLEMA FISCAL' : 'Sin problemas fiscales')}
                                                    </Text>
                                                </View>
                                            </View>
                                            {e?.situacion && renderField('Situacion', e.situacion, 'information-circle-outline')}
                                            {e?.problemas && e.problemas.length > 0 && e.problemas.map((p, i) => (
                                                <View key={i} style={[styles.field, { backgroundColor: isDark ? 'rgba(239,68,68,0.06)' : 'rgba(239,68,68,0.04)' }]}>
                                                    <View style={[styles.fieldIcon, { backgroundColor: 'rgba(239,68,68,0.12)' }]}>
                                                        <Ionicons name="alert-circle" size={16} color="#EF4444" />
                                                    </View>
                                                    <View style={styles.fieldContent}>
                                                        <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>ART. 69 - {p.descripcion}</Text>
                                                        <Text style={[styles.fieldValue, { color: '#EF4444' }]}>
                                                            Publicado: {p.fechaPublicacion?.split('T')[0] || 'N/A'}
                                                        </Text>
                                                    </View>
                                                </View>
                                            ))}
                                            {e?.oficiosEFOS && e.oficiosEFOS.length > 0 && e.oficiosEFOS.map((o, i) => (
                                                <View key={`efos-${i}`} style={[styles.field, { backgroundColor: isDark ? 'rgba(239,68,68,0.06)' : 'rgba(239,68,68,0.04)' }]}>
                                                    <View style={[styles.fieldIcon, { backgroundColor: 'rgba(239,68,68,0.12)' }]}>
                                                        <Ionicons name="document-text" size={16} color="#EF4444" />
                                                    </View>
                                                    <View style={styles.fieldContent}>
                                                        <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>EFOS - {o.tipo}</Text>
                                                        <Text style={[styles.fieldValue, { color: '#EF4444' }]}>
                                                            Oficio: {o.oficioID}
                                                        </Text>
                                                    </View>
                                                </View>
                                            ))}
                                        </View>
                                    );
                                })()}
                            </View>
                        )}
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modal: {
        width: '100%',
        maxWidth: 520,
        maxHeight: '85%',
        borderRadius: 18,
        borderWidth: 1,
        overflow: 'hidden',
        ...(Platform.OS === 'web' ? {
            // @ts-ignore
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
        } : {}),
    },
    modalMobile: {
        maxWidth: '100%',
        maxHeight: '90%',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    headerIconBg: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: 'rgba(255,255,255,0.15)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
    },
    headerSubtitle: {
        color: 'rgba(255,255,255,0.65)',
        fontSize: 11,
        fontWeight: '500',
    },
    closeBtn: {
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: 'rgba(255,255,255,0.1)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    searchSection: {
        paddingHorizontal: 20,
        paddingTop: 18,
        paddingBottom: 14,
    },
    searchRow: {
        flexDirection: 'row',
        gap: 10,
    },
    searchRowMobile: {
        flexDirection: 'column',
    },
    inputContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: 1,
        gap: 10,
    },
    input: {
        flex: 1,
        fontSize: 14,
        fontWeight: '600',
        letterSpacing: 0.5,
        padding: 0,
    },
    searchBtn: {
        borderRadius: 12,
        overflow: 'hidden',
    },
    searchBtnGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 12,
    },
    searchBtnText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '700',
    },
    body: {
        flex: 1,
    },
    bodyContent: {
        padding: 20,
        paddingTop: 6,
    },
    errorBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        padding: 14,
        borderRadius: 12,
    },
    errorText: {
        flex: 1,
        fontSize: 13,
        fontWeight: '500',
    },
    emptyState: {
        alignItems: 'center',
        paddingTop: 30,
        paddingHorizontal: 20,
    },
    emptyIcon: {
        width: 64,
        height: 64,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    emptyTitle: {
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 6,
    },
    emptySubtitle: {
        fontSize: 13,
        textAlign: 'center',
        fontWeight: '500',
        lineHeight: 19,
    },
    resultContainer: {
        gap: 14,
    },
    badgesRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '700',
    },
    resultCard: {
        borderRadius: 14,
        borderWidth: 1,
        padding: 18,
    },
    resultHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
    },
    resultAvatar: {
        width: 48,
        height: 48,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    resultAvatarText: {
        color: '#FFFFFF',
        fontSize: 20,
        fontWeight: '800',
    },
    resultHeaderInfo: {
        flex: 1,
    },
    resultName: {
        fontSize: 16,
        fontWeight: '700',
        lineHeight: 22,
    },
    resultRfc: {
        fontSize: 13,
        fontWeight: '600',
        marginTop: 2,
        letterSpacing: 0.5,
    },
    sectionTitle: {
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 1,
        marginTop: 6,
        marginBottom: -4,
    },
    fieldsGrid: {
        gap: 8,
    },
    field: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: 14,
        borderRadius: 12,
    },
    fieldIcon: {
        width: 32,
        height: 32,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(92,118,178,0.1)',
    },
    fieldContent: {
        flex: 1,
    },
    fieldLabel: {
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 0.5,
        textTransform: 'uppercase',
        marginBottom: 2,
    },
    fieldValue: {
        fontSize: 14,
        fontWeight: '600',
    },
});
