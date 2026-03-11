import React, { useState, useRef, useEffect } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, ScrollView,
    ActivityIndicator, StyleSheet, Modal, Platform, useWindowDimensions, Linking,
    Animated, KeyboardAvoidingView,
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
    validoHasta: string | null;
    rfcRepresentante: string | null;
    curpRepresentante: string | null;
    emailContacto: string | null;
    curp: string | null;
    nombres: string | null;
    primerApellido: string | null;
    segundoApellido: string | null;
    sexo: string | null;
    entidadNacimiento: string | null;
    fechaNacimiento: string | null;
    codigoPostal: string | null;
    regimenFiscal: string | null;
    entidadFederativa: string | null;
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
    const [celular, setCelular] = useState('');
    const [comentarios, setComentarios] = useState('Proceso de revision profunda');

    const slideAnim = useRef(new Animated.Value(0)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const inputRef = useRef<TextInput>(null);

    useEffect(() => {
        if (visible) {
            Animated.parallel([
                Animated.spring(slideAnim, {
                    toValue: 1,
                    useNativeDriver: true,
                    damping: 20,
                    stiffness: 200,
                }),
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 200,
                    useNativeDriver: true,
                }),
            ]).start(() => {
                setTimeout(() => inputRef.current?.focus(), 100);
            });
        } else {
            slideAnim.setValue(0);
            fadeAnim.setValue(0);
        }
    }, [visible]);

    const handleAnimatedClose = () => {
        Animated.parallel([
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            }),
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 150,
                useNativeDriver: true,
            }),
        ]).start(() => handleClose());
    };

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
        setCelular('');
        setComentarios('Proceso de revision profunda');
        onClose();
    };

    const handleShareWhatsApp = () => {
        if (!result) return;
        const nombre = [result.nombres, result.primerApellido, result.segundoApellido].filter(Boolean).join(' ');

        let msg = '*DATOS FISCALES*\n';
        if (result.regimenFiscal) msg += `*Regimen Fiscal:* ${result.regimenFiscal}\n`;
        if (result.validoHasta) msg += `*FIEL valida hasta:* ${result.validoHasta}\n`;
        if (result.codigoPostal) msg += `*Codigo Postal:* ${result.codigoPostal}\n`;
        if (result.entidadFederativa) msg += `*Entidad:* ${result.entidadFederativa}\n`;

        msg += '\n*REPRESENTANTE LEGAL*\n';
        if (nombre) msg += `*Nombre completo:* ${nombre}\n`;
        if (result.rfcRepresentante || result.rfc) msg += `*RFC:* ${result.rfcRepresentante || result.rfc}\n`;
        if (result.curpRepresentante || result.curp) msg += `*CURP:* ${result.curpRepresentante || result.curp}\n`;
        if (result.nss) msg += `*NSS:* ${result.nss}\n`;
        if (result.fechaNacimiento) msg += `*Fecha de nacimiento:* ${result.fechaNacimiento}\n`;
        if (result.emailContacto) msg += `*Email de contacto:* ${result.emailContacto}\n`;

        if (result.estado69) {
            const e = result.estado69;
            msg += '\n*SITUACION FISCAL*\n';
            if (e.problemas.length > 0) {
                e.problemas.forEach((p) => {
                    msg += `*Art. 69 - ${p.descripcion}:* Publicado: ${p.fechaPublicacion?.split('T')[0] || 'N/A'}\n`;
                });
            } else {
                msg += `*Oficios Art. 69:* Sin oficios\n`;
            }
            if (e.oficiosEFOS.length > 0) {
                e.oficiosEFOS.forEach((o) => {
                    msg += `*Art. 69B - ${o.tipo}:* Oficio: ${o.oficioID}\n`;
                });
            } else {
                msg += `*Oficios Art. 69B:* Sin oficios\n`;
            }
        }

        if (comentarios) msg += `\n*Comentarios:* ${comentarios}\n`;
        msg += '\n---\n';
        msg += 'Descarga la app Yaakob:\n';
        msg += 'iOS: https://apps.apple.com/mx/app/yakoob/id6758861392\n';
        msg += 'Android: https://play.google.com/store/apps/details?id=com.yakoob.app';

        const encoded = encodeURIComponent(msg);
        const url = celular
            ? `https://wa.me/52${celular.replace(/\D/g, '')}?text=${encoded}`
            : `https://wa.me/?text=${encoded}`;
        Linking.openURL(url);
    };

    const surfaceBg = isDark ? '#1A1B1F' : '#F6F7FB';
    const cardBg = isDark ? 'rgba(255,255,255,0.04)' : '#FFFFFF';
    const cardBorder = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)';
    const fieldBg = isDark ? 'rgba(255,255,255,0.03)' : 'rgba(92,118,178,0.04)';
    const inputBg = isDark ? 'rgba(255,255,255,0.06)' : '#FFFFFF';
    const inputBorder = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(92,118,178,0.2)';

    const renderField = (label: string, value: string | null, icon: keyof typeof Ionicons.glyphMap) => {
        if (!value) return null;
        return (
            <View style={[styles.field, { backgroundColor: fieldBg }]}>
                <View style={[styles.fieldIcon, { backgroundColor: isDark ? 'rgba(92,118,178,0.15)' : 'rgba(92,118,178,0.1)' }]}>
                    <Ionicons name={icon} size={15} color={isDark ? '#97B1DE' : '#5C76B2'} />
                </View>
                <View style={styles.fieldContent}>
                    <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>{label}</Text>
                    <Text style={[styles.fieldValue, { color: colors.textPrimary }]} selectable>{value}</Text>
                </View>
            </View>
        );
    };

    const translateY = slideAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [600, 0],
    });

    return (
        <Modal visible={visible} transparent animationType="none" onRequestClose={handleAnimatedClose}>
            <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
                <TouchableOpacity style={styles.overlayTouch} activeOpacity={1} onPress={handleAnimatedClose} />

                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    style={styles.keyboardView}
                >
                    <Animated.View style={[
                        styles.modal,
                        {
                            backgroundColor: isDark ? '#111113' : '#FFFFFF',
                            transform: [{ translateY }],
                        },
                        isMobile && styles.modalMobile,
                    ]}>
                        {/* Drag handle */}
                        {isMobile && (
                            <View style={styles.dragHandleContainer}>
                                <View style={[styles.dragHandle, { backgroundColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)' }]} />
                            </View>
                        )}

                        {/* Header */}
                        <View style={[styles.header, { borderBottomColor: cardBorder }]}>
                            <View style={styles.headerLeft}>
                                <LinearGradient
                                    colors={['#4A63A0', '#6B83C0'] as [string, string]}
                                    style={styles.headerIconBg}
                                >
                                    <Ionicons name="search" size={17} color="#FFFFFF" />
                                </LinearGradient>
                                <View>
                                    <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Buscar RFC</Text>
                                    <Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>Consulta datos fiscales por RFC</Text>
                                </View>
                            </View>
                            <TouchableOpacity onPress={handleAnimatedClose} style={[styles.closeBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}>
                                <Ionicons name="close" size={18} color={colors.textMuted} />
                            </TouchableOpacity>
                        </View>

                        {/* Search Input */}
                        <View style={[styles.searchSection, { backgroundColor: surfaceBg }]}>
                            <View style={[
                                styles.inputContainer,
                                {
                                    backgroundColor: inputBg,
                                    borderColor: searchTerm.length > 0 ? '#5C76B2' : inputBorder,
                                    borderWidth: searchTerm.length > 0 ? 1.5 : 1,
                                },
                            ]}>
                                <View style={[styles.inputIconWrap, { backgroundColor: isDark ? 'rgba(92,118,178,0.12)' : 'rgba(92,118,178,0.08)' }]}>
                                    <Ionicons name="document-text-outline" size={16} color={isDark ? '#97B1DE' : '#5C76B2'} />
                                </View>
                                <TextInput
                                    ref={inputRef}
                                    style={[styles.input, { color: colors.textPrimary }]}
                                    placeholder="Ej. XAXX010101000"
                                    placeholderTextColor={isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)'}
                                    value={searchTerm}
                                    onChangeText={(t) => setSearchTerm(t.toUpperCase())}
                                    onSubmitEditing={handleSearch}
                                    autoCapitalize="characters"
                                    maxLength={13}
                                    editable={!isLoading}
                                />
                                {searchTerm.length > 0 && !isLoading && (
                                    <TouchableOpacity onPress={() => setSearchTerm('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                                        <Ionicons name="close-circle" size={18} color={colors.textMuted} />
                                    </TouchableOpacity>
                                )}
                            </View>
                            <TouchableOpacity
                                onPress={handleSearch}
                                disabled={!searchTerm.trim() || isLoading}
                                activeOpacity={0.8}
                            >
                                <LinearGradient
                                    colors={(!searchTerm.trim() || isLoading) ? ['#A0ADCE', '#B4BFD8'] as [string, string] : ['#4A63A0', '#6B83C0'] as [string, string]}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
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

                        {/* Results */}
                        <ScrollView
                            style={styles.body}
                            contentContainerStyle={styles.bodyContent}
                            showsVerticalScrollIndicator={false}
                            keyboardShouldPersistTaps="handled"
                        >
                            {error && (
                                <View style={[styles.errorBox, { backgroundColor: isDark ? 'rgba(239,68,68,0.1)' : 'rgba(239,68,68,0.05)' }]}>
                                    <View style={[styles.errorIconWrap, { backgroundColor: isDark ? 'rgba(239,68,68,0.15)' : 'rgba(239,68,68,0.1)' }]}>
                                        <Ionicons name="alert-circle" size={18} color="#EF4444" />
                                    </View>
                                    <Text style={[styles.errorText, { color: isDark ? '#FCA5A5' : '#DC2626' }]}>{error}</Text>
                                </View>
                            )}

                            {!result && !error && !isLoading && (
                                <View style={styles.emptyState}>
                                    <View style={[styles.emptyIconOuter, { backgroundColor: isDark ? 'rgba(92,118,178,0.06)' : 'rgba(92,118,178,0.05)' }]}>
                                        <LinearGradient
                                            colors={isDark ? ['rgba(92,118,178,0.15)', 'rgba(92,118,178,0.08)'] as [string, string] : ['rgba(92,118,178,0.12)', 'rgba(92,118,178,0.05)'] as [string, string]}
                                            style={styles.emptyIconInner}
                                        >
                                            <Ionicons name="document-text-outline" size={28} color={isDark ? '#97B1DE' : '#5C76B2'} />
                                        </LinearGradient>
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
                                    {/* Status badges */}
                                    <View style={styles.badgesRow}>
                                        <View style={[
                                            styles.statusBadge,
                                            {
                                                backgroundColor: result.valido
                                                    ? (isDark ? 'rgba(16,185,129,0.12)' : 'rgba(16,185,129,0.08)')
                                                    : (isDark ? 'rgba(239,68,68,0.12)' : 'rgba(239,68,68,0.08)'),
                                                borderColor: result.valido
                                                    ? (isDark ? 'rgba(16,185,129,0.2)' : 'rgba(16,185,129,0.15)')
                                                    : (isDark ? 'rgba(239,68,68,0.2)' : 'rgba(239,68,68,0.15)'),
                                            },
                                        ]}>
                                            <Ionicons
                                                name={result.valido ? 'checkmark-circle' : 'close-circle'}
                                                size={15}
                                                color={result.valido ? '#10B981' : '#EF4444'}
                                            />
                                            <Text style={[styles.statusText, { color: result.valido ? '#10B981' : '#EF4444' }]}>
                                                RFC {result.valido ? 'Valido' : 'No valido'}
                                            </Text>
                                        </View>
                                        <View style={[styles.statusBadge, {
                                            backgroundColor: isDark ? 'rgba(139,92,246,0.12)' : 'rgba(139,92,246,0.08)',
                                            borderColor: isDark ? 'rgba(139,92,246,0.2)' : 'rgba(139,92,246,0.15)',
                                        }]}>
                                            <Ionicons
                                                name={result.tipoPersona === 'moral' ? 'business' : 'person'}
                                                size={15}
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
                                                    ? ['#7C3AED', '#A78BFA'] as [string, string]
                                                    : ['#4A63A0', '#7A93C8'] as [string, string]}
                                                style={styles.resultAvatar}
                                            >
                                                <Ionicons
                                                    name={result.tipoPersona === 'moral' ? 'business' : 'person'}
                                                    size={20}
                                                    color="#FFFFFF"
                                                />
                                            </LinearGradient>
                                            <View style={styles.resultHeaderInfo}>
                                                <Text style={[styles.resultName, { color: colors.textPrimary }]} numberOfLines={2}>
                                                    {result.razonSocial}
                                                </Text>
                                                <View style={styles.rfcRow}>
                                                    <Text style={[styles.resultRfc, { color: isDark ? '#97B1DE' : '#4A63A0' }]} selectable>
                                                        {result.rfc}
                                                    </Text>
                                                </View>
                                            </View>
                                        </View>
                                    </View>

                                    {/* ✓ DATOS FISCALES */}
                                    <View style={styles.sectionHeaderRow}>
                                        <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                                        <Text style={[styles.sectionTitle, { color: colors.textMuted, marginTop: 0, marginBottom: 0 }]}>DATOS FISCALES</Text>
                                    </View>
                                    <View style={styles.fieldsGrid}>
                                        {renderField('Regimen Fiscal', result.regimenFiscal, 'briefcase-outline')}
                                        {renderField('FIEL valida hasta', result.validoHasta, 'calendar-outline')}
                                        {renderField('Codigo Postal', result.codigoPostal, 'location-outline')}
                                        {renderField('Entidad', result.entidadFederativa, 'map-outline')}
                                    </View>

                                    {/* ✓ REPRESENTANTE LEGAL */}
                                    {(() => {
                                        const nombre = [result.nombres, result.primerApellido, result.segundoApellido].filter(Boolean).join(' ') || null;
                                        const curpVal = result.curpRepresentante || result.curp;
                                        const rfcVal = result.rfcRepresentante || result.rfc;
                                        return (
                                            <>
                                                <View style={styles.sectionHeaderRow}>
                                                    <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                                                    <Text style={[styles.sectionTitle, { color: colors.textMuted, marginTop: 0, marginBottom: 0 }]}>REPRESENTANTE LEGAL</Text>
                                                </View>
                                                <View style={styles.fieldsGrid}>
                                                    {renderField('Nombre completo', nombre, 'person-outline')}
                                                    {renderField('RFC', rfcVal, 'document-text-outline')}
                                                    {renderField('CURP', curpVal, 'card-outline')}
                                                    {renderField('NSS', result.nss, 'shield-outline')}
                                                    {renderField('Fecha de nacimiento', result.fechaNacimiento, 'calendar-outline')}
                                                    {renderField('Email de contacto', result.emailContacto, 'mail-outline')}
                                                </View>
                                            </>
                                        );
                                    })()}

                                    {/* ✓ SITUACION FISCAL */}
                                    <View style={styles.sectionHeaderRow}>
                                        <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                                        <Text style={[styles.sectionTitle, { color: colors.textMuted, marginTop: 0, marginBottom: 0 }]}>SITUACION FISCAL</Text>
                                    </View>
                                    <View style={styles.fieldsGrid}>
                                        {result.estado69 && (() => {
                                            const e = result.estado69!;
                                            return (
                                                <>
                                                    {/* Oficios Art. 69 */}
                                                    {e.problemas.length > 0 ? e.problemas.map((p, i) => (
                                                        <View key={i} style={[styles.field, { backgroundColor: isDark ? 'rgba(239,68,68,0.06)' : 'rgba(239,68,68,0.03)' }]}>
                                                            <View style={[styles.fieldIcon, { backgroundColor: 'rgba(239,68,68,0.12)' }]}>
                                                                <Ionicons name="alert-circle" size={15} color="#EF4444" />
                                                            </View>
                                                            <View style={styles.fieldContent}>
                                                                <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>OFICIO ART. 69 - {p.descripcion}</Text>
                                                                <Text style={[styles.fieldValue, { color: '#EF4444' }]}>
                                                                    Publicado: {p.fechaPublicacion?.split('T')[0] || 'N/A'}
                                                                </Text>
                                                            </View>
                                                        </View>
                                                    )) : (
                                                        <View style={[styles.field, { backgroundColor: isDark ? 'rgba(16,185,129,0.06)' : 'rgba(16,185,129,0.03)' }]}>
                                                            <View style={[styles.fieldIcon, { backgroundColor: 'rgba(16,185,129,0.12)' }]}>
                                                                <Ionicons name="checkmark-circle" size={15} color="#10B981" />
                                                            </View>
                                                            <View style={styles.fieldContent}>
                                                                <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>OFICIOS ART. 69</Text>
                                                                <Text style={[styles.fieldValue, { color: '#10B981' }]}>Sin oficios</Text>
                                                            </View>
                                                        </View>
                                                    )}

                                                    {/* Oficios Art. 69B */}
                                                    {e.oficiosEFOS.length > 0 ? e.oficiosEFOS.map((o, i) => (
                                                        <View key={`efos-${i}`} style={[styles.field, { backgroundColor: isDark ? 'rgba(239,68,68,0.06)' : 'rgba(239,68,68,0.03)' }]}>
                                                            <View style={[styles.fieldIcon, { backgroundColor: 'rgba(239,68,68,0.12)' }]}>
                                                                <Ionicons name="document-text" size={15} color="#EF4444" />
                                                            </View>
                                                            <View style={styles.fieldContent}>
                                                                <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>OFICIO ART. 69B - {o.tipo}</Text>
                                                                <Text style={[styles.fieldValue, { color: '#EF4444' }]}>
                                                                    Oficio: {o.oficioID}
                                                                </Text>
                                                            </View>
                                                        </View>
                                                    )) : (
                                                        <View style={[styles.field, { backgroundColor: isDark ? 'rgba(16,185,129,0.06)' : 'rgba(16,185,129,0.03)' }]}>
                                                            <View style={[styles.fieldIcon, { backgroundColor: 'rgba(16,185,129,0.12)' }]}>
                                                                <Ionicons name="checkmark-circle" size={15} color="#10B981" />
                                                            </View>
                                                            <View style={styles.fieldContent}>
                                                                <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>OFICIOS ART. 69B</Text>
                                                                <Text style={[styles.fieldValue, { color: '#10B981' }]}>Sin oficios</Text>
                                                            </View>
                                                        </View>
                                                    )}
                                                </>
                                            );
                                        })()}

                                        {!result.estado69 && (
                                            <>
                                                <View style={[styles.field, { backgroundColor: fieldBg }]}>
                                                    <View style={[styles.fieldIcon, { backgroundColor: isDark ? 'rgba(92,118,178,0.15)' : 'rgba(92,118,178,0.1)' }]}>
                                                        <Ionicons name="help-circle-outline" size={15} color={isDark ? '#97B1DE' : '#5C76B2'} />
                                                    </View>
                                                    <View style={styles.fieldContent}>
                                                        <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>OFICIOS ART. 69</Text>
                                                        <Text style={[styles.fieldValue, { color: colors.textPrimary }]}>Sin informacion</Text>
                                                    </View>
                                                </View>
                                                <View style={[styles.field, { backgroundColor: fieldBg }]}>
                                                    <View style={[styles.fieldIcon, { backgroundColor: isDark ? 'rgba(92,118,178,0.15)' : 'rgba(92,118,178,0.1)' }]}>
                                                        <Ionicons name="help-circle-outline" size={15} color={isDark ? '#97B1DE' : '#5C76B2'} />
                                                    </View>
                                                    <View style={styles.fieldContent}>
                                                        <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>OFICIOS ART. 69B</Text>
                                                        <Text style={[styles.fieldValue, { color: colors.textPrimary }]}>Sin informacion</Text>
                                                    </View>
                                                </View>
                                            </>
                                        )}

                                        {/* Comentarios - editable */}
                                        <View style={[styles.formField, {
                                            backgroundColor: fieldBg,
                                            borderColor: cardBorder,
                                        }]}>
                                            <View style={styles.formFieldLabelRow}>
                                                <Ionicons name="chatbubble-outline" size={13} color={colors.textMuted} />
                                                <Text style={[styles.formFieldLabel, { color: colors.textMuted, marginBottom: 0 }]}>Comentarios</Text>
                                            </View>
                                            <TextInput
                                                style={[styles.formFieldInput, { color: colors.textPrimary, minHeight: 60, textAlignVertical: 'top' }]}
                                                value={comentarios}
                                                onChangeText={setComentarios}
                                                placeholder="Proceso de revision profunda"
                                                placeholderTextColor={colors.textMuted}
                                                multiline
                                            />
                                        </View>
                                    </View>

                                    {/* Celular + WhatsApp */}
                                    <View style={[styles.formField, {
                                        backgroundColor: isDark ? 'rgba(92,118,178,0.08)' : 'rgba(92,118,178,0.04)',
                                        borderColor: isDark ? '#5C76B2' : '#4A63A0',
                                        borderWidth: 1.5,
                                        marginTop: 6,
                                    }]}>
                                        <View style={styles.formFieldLabelRow}>
                                            <Ionicons name="call-outline" size={13} color={isDark ? '#97B1DE' : '#4A63A0'} />
                                            <Text style={[styles.formFieldLabel, { color: isDark ? '#97B1DE' : '#4A63A0', marginBottom: 0 }]}>Numero de Celular</Text>
                                        </View>
                                        <TextInput
                                            style={[styles.formFieldInput, { color: colors.textPrimary }]}
                                            value={celular}
                                            onChangeText={setCelular}
                                            placeholder="10 digitos"
                                            placeholderTextColor={colors.textMuted}
                                            keyboardType="phone-pad"
                                            maxLength={10}
                                        />
                                    </View>

                                    {/* WhatsApp button */}
                                    <TouchableOpacity onPress={handleShareWhatsApp} activeOpacity={0.8} style={styles.whatsappBtn}>
                                        <LinearGradient
                                            colors={['#1EBE55', '#149B47'] as [string, string]}
                                            start={{ x: 0, y: 0 }}
                                            end={{ x: 1, y: 0 }}
                                            style={styles.whatsappBtnGradient}
                                        >
                                            <Ionicons name="logo-whatsapp" size={19} color="#FFFFFF" />
                                            <Text style={styles.whatsappBtnText}>Compartir por WhatsApp</Text>
                                        </LinearGradient>
                                    </TouchableOpacity>

                                    {/* App download links */}
                                    <View style={styles.downloadLinksContainer}>
                                        <Text style={[styles.downloadTitle, { color: colors.textMuted }]}>Descarga la app Yaakob</Text>
                                        <View style={styles.downloadLinksRow}>
                                            <TouchableOpacity
                                                onPress={() => Linking.openURL('https://apps.apple.com/mx/app/yakoob/id6758861392')}
                                                style={[styles.downloadLink, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)', borderColor: cardBorder }]}
                                            >
                                                <Ionicons name="logo-apple" size={18} color={colors.textPrimary} />
                                                <Text style={[styles.downloadLinkText, { color: colors.textPrimary }]}>App Store</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                onPress={() => Linking.openURL('https://play.google.com/store/apps/details?id=com.yakoob.app')}
                                                style={[styles.downloadLink, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)', borderColor: cardBorder }]}
                                            >
                                                <Ionicons name="logo-google-playstore" size={18} color={colors.textPrimary} />
                                                <Text style={[styles.downloadLinkText, { color: colors.textPrimary }]}>Play Store</Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                </View>
                            )}
                        </ScrollView>
                    </Animated.View>
                </KeyboardAvoidingView>
            </Animated.View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.45)',
        justifyContent: 'flex-end',
    },
    overlayTouch: {
        flex: 1,
    },
    keyboardView: {
        justifyContent: 'flex-end',
    },
    modal: {
        width: '100%',
        height: '92%',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        overflow: 'hidden',
        ...(Platform.OS === 'web' ? {
            // @ts-ignore
            boxShadow: '0 -8px 40px rgba(0,0,0,0.2)',
        } : {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -4 },
            shadowOpacity: 0.15,
            shadowRadius: 20,
            elevation: 12,
        }),
    },
    modalMobile: {
        height: '94%',
    },
    dragHandleContainer: {
        alignItems: 'center',
        paddingTop: 10,
        paddingBottom: 2,
    },
    dragHandle: {
        width: 36,
        height: 4,
        borderRadius: 2,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 14,
        paddingBottom: 14,
        borderBottomWidth: 1,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
    },
    headerIconBg: {
        width: 36,
        height: 36,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 17,
        fontWeight: '700',
        letterSpacing: -0.3,
    },
    headerSubtitle: {
        fontSize: 12,
        fontWeight: '500',
        marginTop: 1,
    },
    closeBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    searchSection: {
        paddingHorizontal: 20,
        paddingVertical: 16,
        gap: 12,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        height: 48,
        borderRadius: 14,
        gap: 10,
    },
    inputIconWrap: {
        width: 30,
        height: 30,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    input: {
        flex: 1,
        fontSize: 15,
        fontWeight: '600',
        letterSpacing: 0.8,
        padding: 0,
    },
    searchBtnGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 7,
        height: 46,
        borderRadius: 13,
        paddingHorizontal: 20,
    },
    searchBtnText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '700',
    },
    body: {
        flex: 1,
    },
    bodyContent: {
        padding: 20,
        paddingTop: 10,
        paddingBottom: 40,
    },
    errorBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: 14,
        borderRadius: 14,
    },
    errorIconWrap: {
        width: 32,
        height: 32,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    errorText: {
        flex: 1,
        fontSize: 13,
        fontWeight: '500',
        lineHeight: 18,
    },
    emptyState: {
        alignItems: 'center',
        paddingTop: 36,
        paddingHorizontal: 24,
    },
    emptyIconOuter: {
        width: 80,
        height: 80,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
    },
    emptyIconInner: {
        width: 56,
        height: 56,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyTitle: {
        fontSize: 17,
        fontWeight: '700',
        marginBottom: 8,
        letterSpacing: -0.2,
    },
    emptySubtitle: {
        fontSize: 14,
        textAlign: 'center',
        fontWeight: '400',
        lineHeight: 20,
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
        paddingVertical: 7,
        borderRadius: 20,
        borderWidth: 1,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '700',
    },
    resultCard: {
        borderRadius: 16,
        borderWidth: 1,
        padding: 18,
    },
    resultHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
    },
    resultAvatar: {
        width: 46,
        height: 46,
        borderRadius: 13,
        alignItems: 'center',
        justifyContent: 'center',
    },
    resultHeaderInfo: {
        flex: 1,
    },
    resultName: {
        fontSize: 16,
        fontWeight: '700',
        lineHeight: 21,
        letterSpacing: -0.2,
    },
    rfcRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 3,
    },
    resultRfc: {
        fontSize: 13,
        fontWeight: '600',
        letterSpacing: 0.5,
    },
    sectionTitle: {
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 1.2,
        marginTop: 6,
        marginBottom: -4,
    },
    fieldsGrid: {
        gap: 6,
    },
    field: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: 13,
        borderRadius: 13,
    },
    fieldIcon: {
        width: 30,
        height: 30,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
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
    sectionHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 6,
    },
    downloadLinksContainer: {
        alignItems: 'center',
        marginTop: 8,
        gap: 10,
    },
    downloadTitle: {
        fontSize: 12,
        fontWeight: '600',
    },
    downloadLinksRow: {
        flexDirection: 'row',
        gap: 10,
    },
    downloadLink: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 12,
        borderWidth: 1,
    },
    downloadLinkText: {
        fontSize: 13,
        fontWeight: '600',
    },
    formField: {
        borderRadius: 13,
        borderWidth: 1,
        padding: 12,
    },
    formFieldLabel: {
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 0.5,
        textTransform: 'uppercase',
        marginBottom: 6,
    },
    formFieldLabelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 6,
    },
    formFieldInput: {
        fontSize: 14,
        fontWeight: '600',
        padding: 0,
    },
    whatsappBtn: {
        marginTop: 8,
        borderRadius: 14,
        overflow: 'hidden',
    },
    whatsappBtnGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        height: 50,
        borderRadius: 14,
    },
    whatsappBtnText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '700',
    },
});
