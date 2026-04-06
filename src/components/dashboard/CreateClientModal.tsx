import React, { useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, Modal,
    StyleSheet, ActivityIndicator, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { api } from '../../api/client';
import type { CheckIdResponse } from '../../api/client';

const TIPO_PERSONA_OPTIONS = ['Fisica', 'Moral'];

interface CreateClientModalProps {
    visible: boolean;
    onClose: () => void;
    onCreated: () => void;
}

export const CreateClientModal: React.FC<CreateClientModalProps> = ({
    visible, onClose, onCreated,
}) => {
    const { colors, isDark } = useTheme();
    const [rfc, setRfc] = useState('');
    const [name, setName] = useState('');
    const [razonSocial, setRazonSocial] = useState('');
    const [phone, setPhone] = useState('');
    const [tipoPersona, setTipoPersona] = useState('');
    const [regimenFiscal, setRegimenFiscal] = useState('');
    const [codigoPostal, setCodigoPostal] = useState('');
    const [curp, setCurp] = useState('');
    const [estado, setEstado] = useState('');
    const [domicilio, setDomicilio] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
    const [searchStatus, setSearchStatus] = useState<'idle' | 'found' | 'not_found' | 'error'>('idle');

    const resetForm = () => {
        setRfc('');
        setName('');
        setRazonSocial('');
        setPhone('');
        setTipoPersona('');
        setRegimenFiscal('');
        setCodigoPostal('');
        setCurp('');
        setEstado('');
        setDomicilio('');
        setSearchStatus('idle');
    };

    const handleRfcChange = (text: string) => {
        setRfc(text.toUpperCase());
        if (searchStatus !== 'idle') setSearchStatus('idle');
    };

    const handleSearchRfc = async () => {
        const rfcTrimmed = rfc.trim().toUpperCase();
        if (rfcTrimmed.length < 12) return;

        setIsSearching(true);
        setSearchStatus('idle');
        try {
            const response = await api.searchRFC(rfcTrimmed);

            if (response.error || !response.data) {
                setSearchStatus('error');
                return;
            }

            const data = response.data as CheckIdResponse;

            if (!data.exitoso) {
                setSearchStatus('not_found');
                return;
            }

            const r = data.resultado;
            const rfcData = r?.rfc;
            const curpData = r?.curp;
            const cpData = r?.codigoPostal;
            const regimenData = r?.regimenFiscal;
            const domicilioData = r?.rfc ? (r as any).domicilio : null;

            // Razon social
            let razon = rfcData?.razonSocial || '';
            if (!razon && curpData) {
                razon = [curpData.nombres, curpData.primerApellido, curpData.segundoApellido]
                    .filter(Boolean).join(' ');
            }
            if (razon) setRazonSocial(razon);

            // Tipo persona
            const tipo = rfcTrimmed.length === 12 ? 'Moral' : 'Fisica';
            setTipoPersona(tipo);

            // CURP
            const curpVal = rfcData?.curp || curpData?.curp || '';
            if (curpVal) setCurp(curpVal);

            // Regimen fiscal
            if (regimenData?.regimenesFiscales) {
                setRegimenFiscal(regimenData.regimenesFiscales);
            }

            // Codigo postal
            if (cpData?.codigoPostal) {
                setCodigoPostal(cpData.codigoPostal);
            }

            // Estado
            if (data.entidadFederativa) {
                setEstado(data.entidadFederativa);
            }

            // Domicilio
            if (domicilioData) {
                const parts = [
                    domicilioData.calle,
                    domicilioData.numeroExterior ? `#${domicilioData.numeroExterior}` : null,
                    domicilioData.colonia,
                    domicilioData.municipio,
                ].filter(Boolean);
                if (parts.length > 0) setDomicilio(parts.join(', '));
            }

            setSearchStatus('found');
        } catch (error) {
            console.error('Error searching RFC:', error);
            setSearchStatus('error');
        } finally {
            setIsSearching(false);
        }
    };

    const handleCreate = async () => {
        if (!rfc.trim()) return;
        setIsCreating(true);
        try {
            const result = await api.createClient({
                rfc: rfc.trim().toUpperCase(),
                name: name.trim() || undefined,
                razon_social: razonSocial.trim() || undefined,
                phone: phone.trim() || undefined,
                tipo_persona: tipoPersona || undefined,
                regimen_fiscal: regimenFiscal || undefined,
                codigo_postal: codigoPostal.trim() || undefined,
                estado: estado.trim() || undefined,
                domicilio: domicilio.trim() || undefined,
                curp: curp.trim() || undefined,
            });
            if (result.data) {
                resetForm();
                onCreated();
            }
        } catch (error) {
            console.error('Error creating client:', error);
        } finally {
            setIsCreating(false);
        }
    };

    const modalBg = isDark ? '#1a1a1a' : '#ffffff';
    const inputBg = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)';
    const inputBorder = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
    const canSearch = rfc.trim().length >= 12 && !isSearching;

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <View style={styles.overlay}>
                <View style={[styles.modal, { backgroundColor: modalBg }]}>
                    <View style={styles.modalHeader}>
                        <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                            Nuevo Cliente
                        </Text>
                        <TouchableOpacity onPress={onClose}>
                            <Ionicons name="close" size={22} color={colors.textMuted} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                        {/* RFC + Search Button */}
                        <Text style={[styles.label, { color: colors.textMuted }]}>RFC *</Text>
                        <View style={styles.rfcRow}>
                            <TextInput
                                style={[styles.input, styles.rfcInput, { color: colors.textPrimary, backgroundColor: inputBg, borderColor: inputBorder }]}
                                value={rfc}
                                onChangeText={handleRfcChange}
                                placeholder="Ej: XAXX010101000"
                                placeholderTextColor={colors.textMuted}
                                autoCapitalize="characters"
                                maxLength={13}
                            />
                            <TouchableOpacity
                                style={[
                                    styles.searchButton,
                                    { backgroundColor: canSearch ? '#10B981' : isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' },
                                ]}
                                onPress={handleSearchRfc}
                                disabled={!canSearch}
                            >
                                {isSearching ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <Ionicons name="search" size={18} color={canSearch ? '#fff' : colors.textMuted} />
                                )}
                            </TouchableOpacity>
                        </View>

                        {/* Search Status */}
                        {searchStatus === 'found' && (
                            <View style={[styles.statusBanner, { backgroundColor: 'rgba(16,185,129,0.1)', borderColor: 'rgba(16,185,129,0.3)' }]}>
                                <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                                <Text style={[styles.statusText, { color: '#10B981' }]}>
                                    Datos fiscales encontrados y auto-llenados
                                </Text>
                            </View>
                        )}
                        {searchStatus === 'not_found' && (
                            <View style={[styles.statusBanner, { backgroundColor: 'rgba(245,158,11,0.1)', borderColor: 'rgba(245,158,11,0.3)' }]}>
                                <Ionicons name="alert-circle" size={16} color="#F59E0B" />
                                <Text style={[styles.statusText, { color: '#F59E0B' }]}>
                                    RFC no encontrado. Llena los datos manualmente.
                                </Text>
                            </View>
                        )}
                        {searchStatus === 'error' && (
                            <View style={[styles.statusBanner, { backgroundColor: 'rgba(239,68,68,0.1)', borderColor: 'rgba(239,68,68,0.3)' }]}>
                                <Ionicons name="close-circle" size={16} color="#EF4444" />
                                <Text style={[styles.statusText, { color: '#EF4444' }]}>
                                    Error al consultar. Llena los datos manualmente.
                                </Text>
                            </View>
                        )}

                        <Text style={[styles.label, { color: colors.textMuted }]}>Nombre</Text>
                        <TextInput
                            style={[styles.input, { color: colors.textPrimary, backgroundColor: inputBg, borderColor: inputBorder }]}
                            value={name}
                            onChangeText={setName}
                            placeholder="Nombre del cliente"
                            placeholderTextColor={colors.textMuted}
                        />

                        <Text style={[styles.label, { color: colors.textMuted }]}>Razon Social</Text>
                        <TextInput
                            style={[styles.input, { color: colors.textPrimary, backgroundColor: inputBg, borderColor: inputBorder }]}
                            value={razonSocial}
                            onChangeText={setRazonSocial}
                            placeholder="Razon social"
                            placeholderTextColor={colors.textMuted}
                        />

                        <Text style={[styles.label, { color: colors.textMuted }]}>Telefono</Text>
                        <TextInput
                            style={[styles.input, { color: colors.textPrimary, backgroundColor: inputBg, borderColor: inputBorder }]}
                            value={phone}
                            onChangeText={setPhone}
                            placeholder="Ej: 5512345678"
                            placeholderTextColor={colors.textMuted}
                            keyboardType="phone-pad"
                        />

                        <Text style={[styles.label, { color: colors.textMuted }]}>Tipo de persona</Text>
                        <View style={styles.chipGrid}>
                            {TIPO_PERSONA_OPTIONS.map(type => (
                                <TouchableOpacity
                                    key={type}
                                    style={[
                                        styles.chip,
                                        {
                                            backgroundColor: tipoPersona === type ? `${colors.primary}15` : inputBg,
                                            borderColor: tipoPersona === type ? colors.primary : inputBorder,
                                        },
                                    ]}
                                    onPress={() => setTipoPersona(tipoPersona === type ? '' : type)}
                                >
                                    <Text style={[
                                        styles.chipText,
                                        { color: tipoPersona === type ? colors.primary : colors.textSecondary },
                                    ]}>
                                        {type}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {curp ? (
                            <>
                                <Text style={[styles.label, { color: colors.textMuted }]}>CURP</Text>
                                <TextInput
                                    style={[styles.input, { color: colors.textPrimary, backgroundColor: inputBg, borderColor: inputBorder }]}
                                    value={curp}
                                    onChangeText={setCurp}
                                    placeholder="CURP"
                                    placeholderTextColor={colors.textMuted}
                                />
                            </>
                        ) : null}

                        <Text style={[styles.label, { color: colors.textMuted }]}>Regimen Fiscal</Text>
                        <TextInput
                            style={[styles.input, { color: colors.textPrimary, backgroundColor: inputBg, borderColor: inputBorder }]}
                            value={regimenFiscal}
                            onChangeText={setRegimenFiscal}
                            placeholder="Regimen fiscal"
                            placeholderTextColor={colors.textMuted}
                        />

                        <Text style={[styles.label, { color: colors.textMuted }]}>Codigo Postal</Text>
                        <TextInput
                            style={[styles.input, { color: colors.textPrimary, backgroundColor: inputBg, borderColor: inputBorder }]}
                            value={codigoPostal}
                            onChangeText={setCodigoPostal}
                            placeholder="Ej: 06600"
                            placeholderTextColor={colors.textMuted}
                            keyboardType="numeric"
                            maxLength={5}
                        />

                        {estado ? (
                            <>
                                <Text style={[styles.label, { color: colors.textMuted }]}>Estado</Text>
                                <TextInput
                                    style={[styles.input, { color: colors.textPrimary, backgroundColor: inputBg, borderColor: inputBorder }]}
                                    value={estado}
                                    onChangeText={setEstado}
                                    placeholder="Estado"
                                    placeholderTextColor={colors.textMuted}
                                />
                            </>
                        ) : null}

                        {domicilio ? (
                            <>
                                <Text style={[styles.label, { color: colors.textMuted }]}>Domicilio</Text>
                                <TextInput
                                    style={[styles.input, { color: colors.textPrimary, backgroundColor: inputBg, borderColor: inputBorder }]}
                                    value={domicilio}
                                    onChangeText={setDomicilio}
                                    placeholder="Domicilio"
                                    placeholderTextColor={colors.textMuted}
                                />
                            </>
                        ) : null}

                        <View style={{ height: 10 }} />
                    </ScrollView>

                    <View style={styles.modalFooter}>
                        <TouchableOpacity onPress={onClose} style={styles.cancelButton}>
                            <Text style={[styles.cancelText, { color: colors.textMuted }]}>Cancelar</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={handleCreate}
                            disabled={!rfc.trim() || isCreating}
                            style={[
                                styles.createButton,
                                { backgroundColor: colors.primary },
                                !rfc.trim() && { opacity: 0.5 },
                            ]}
                        >
                            {isCreating ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <Text style={styles.createText}>Crear Cliente</Text>
                            )}
                        </TouchableOpacity>
                    </View>
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
    },
    modal: {
        width: 480,
        maxHeight: '85%',
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 24,
        elevation: 10,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        paddingBottom: 16,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '700',
    },
    modalBody: {
        paddingHorizontal: 20,
    },
    label: {
        fontSize: 11,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 6,
        marginTop: 14,
    },
    input: {
        fontSize: 13,
        fontWeight: '500',
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 10,
        borderWidth: 1,
    },
    rfcRow: {
        flexDirection: 'row',
        gap: 8,
    },
    rfcInput: {
        flex: 1,
    },
    searchButton: {
        width: 42,
        height: 42,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    statusBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 10,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        borderWidth: 1,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '600',
        flex: 1,
    },
    chipGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    chip: {
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 20,
        borderWidth: 1,
    },
    chipText: {
        fontSize: 12,
        fontWeight: '600',
    },
    modalFooter: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 10,
        padding: 20,
        paddingTop: 16,
    },
    cancelButton: {
        paddingVertical: 10,
        paddingHorizontal: 16,
    },
    cancelText: {
        fontSize: 13,
        fontWeight: '600',
    },
    createButton: {
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 10,
    },
    createText: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '700',
    },
});
