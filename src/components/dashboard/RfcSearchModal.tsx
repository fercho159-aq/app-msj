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

interface ResultData {
    rfc: string;
    razonSocial: string;
    valido: boolean;
    curp: string | null;
    nombres: string | null;
    primerApellido: string | null;
    segundoApellido: string | null;
    codigoPostal: string | null;
    regimenFiscal: string | null;
    correo: string | null;
    nss: string | null;
    estado69o69B: boolean | null;
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
            setResult({
                rfc: r.rfc?.rfc || term,
                razonSocial: r.rfc?.razonSocial || 'No disponible',
                valido: r.rfc?.valido ?? false,
                curp: r.rfc?.curp || r.curp?.curp || null,
                nombres: r.curp?.nombres || null,
                primerApellido: r.curp?.primerApellido || null,
                segundoApellido: r.curp?.segundoApellido || null,
                codigoPostal: r.codigoPostal?.codigoPostal || null,
                regimenFiscal: r.regimenFiscal?.regimenesFiscales || null,
                correo: r.correo?.correo || null,
                nss: r.nss?.nss || null,
                estado69o69B: r.estado69o69B?.conProblema ?? null,
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
        if (!value) return null;
        return (
            <View style={[styles.field, { backgroundColor: fieldBg }]}>
                <View style={styles.fieldIcon}>
                    <Ionicons name={icon} size={16} color={colors.primary} />
                </View>
                <View style={styles.fieldContent}>
                    <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>{label}</Text>
                    <Text style={[styles.fieldValue, { color: colors.textPrimary }]} selectable>{value}</Text>
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
                                {/* Status badge */}
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
                                        size={18}
                                        color={result.valido ? '#10B981' : '#EF4444'}
                                    />
                                    <Text style={[styles.statusText, { color: result.valido ? '#10B981' : '#EF4444' }]}>
                                        RFC {result.valido ? 'Valido' : 'No valido'}
                                    </Text>
                                </View>

                                {/* Main info card */}
                                <View style={[styles.resultCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                                    <View style={styles.resultHeader}>
                                        <LinearGradient
                                            colors={['#5C76B2', '#97B1DE'] as [string, string]}
                                            style={styles.resultAvatar}
                                        >
                                            <Text style={styles.resultAvatarText}>
                                                {result.razonSocial.charAt(0).toUpperCase()}
                                            </Text>
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

                                {/* Detail fields */}
                                <View style={styles.fieldsGrid}>
                                    {result.nombres && renderField(
                                        'Nombre completo',
                                        [result.nombres, result.primerApellido, result.segundoApellido].filter(Boolean).join(' '),
                                        'person-outline'
                                    )}
                                    {renderField('CURP', result.curp, 'card-outline')}
                                    {renderField('Regimen Fiscal', result.regimenFiscal, 'briefcase-outline')}
                                    {renderField('Codigo Postal', result.codigoPostal, 'location-outline')}
                                    {renderField('Correo electronico', result.correo, 'mail-outline')}
                                    {renderField('NSS (Numero de Seguro Social)', result.nss, 'shield-outline')}
                                    {result.estado69o69B !== null && (
                                        <View style={[styles.field, {
                                            backgroundColor: result.estado69o69B
                                                ? (isDark ? 'rgba(239,68,68,0.1)' : 'rgba(239,68,68,0.06)')
                                                : (isDark ? 'rgba(16,185,129,0.1)' : 'rgba(16,185,129,0.06)'),
                                        }]}>
                                            <View style={[styles.fieldIcon, {
                                                backgroundColor: result.estado69o69B
                                                    ? 'rgba(239,68,68,0.15)'
                                                    : 'rgba(16,185,129,0.15)',
                                            }]}>
                                                <Ionicons
                                                    name={result.estado69o69B ? 'warning' : 'checkmark-circle'}
                                                    size={16}
                                                    color={result.estado69o69B ? '#EF4444' : '#10B981'}
                                                />
                                            </View>
                                            <View style={styles.fieldContent}>
                                                <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>LISTA 69 / 69-B (SAT)</Text>
                                                <Text style={[styles.fieldValue, {
                                                    color: result.estado69o69B ? '#EF4444' : '#10B981',
                                                    fontWeight: '700',
                                                }]}>
                                                    {result.estado69o69B ? 'Con problema fiscal' : 'Sin problemas fiscales'}
                                                </Text>
                                            </View>
                                        </View>
                                    )}
                                </View>
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
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    statusText: {
        fontSize: 13,
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
