import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, ScrollView,
    ActivityIndicator, StyleSheet, Platform, Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../context/ThemeContext';
import { api } from '../../api/client';
import { DeadlineTrafficLight, getDeadlineSeverity } from './DeadlineTrafficLight';
import type { ClientFiscalProfile as ClientFiscalProfileType } from '../../types';

interface ClientFiscalProfileProps {
    clientId: string;
    disableScroll?: boolean;
}

export const ClientFiscalProfile: React.FC<ClientFiscalProfileProps> = ({ clientId, disableScroll }) => {
    const { colors, isDark } = useTheme();
    const [profile, setProfile] = useState<ClientFiscalProfileType | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [isEditingFiscal, setIsEditingFiscal] = useState(false);
    const [editCapital, setEditCapital] = useState('');
    const [editEfirma, setEditEfirma] = useState('');
    const [editCsd, setEditCsd] = useState('');
    const [editCurp, setEditCurp] = useState('');
    const [editRazonSocial, setEditRazonSocial] = useState('');
    const [editRegimen, setEditRegimen] = useState('');
    const [editCp, setEditCp] = useState('');
    const [editEstado, setEditEstado] = useState('');
    const [editDomicilio, setEditDomicilio] = useState('');
    const [editPhone, setEditPhone] = useState('');
    const [editEfirmaDelivery, setEditEfirmaDelivery] = useState('');
    const [editEfirmaLink, setEditEfirmaLink] = useState('');
    const [editEfirmaFileUrl, setEditEfirmaFileUrl] = useState('');
    const [activeTab, setActiveTab] = useState<'fiscal' | 'personal'>('fiscal');
    const [isEditingEfirma, setIsEditingEfirma] = useState(false);
    const [isSavingEfirma, setIsSavingEfirma] = useState(false);
    const [isUploadingEfirma, setIsUploadingEfirma] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isSavingFiscal, setIsSavingFiscal] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const loadProfile = async () => {
        setIsLoading(true);
        try {
            const result = await api.getClientFiscalProfile(clientId);
            if (result.data) {
                setProfile(result.data.profile);
                setEditCapital(result.data.profile.capital || '');
                setEditEfirma(result.data.profile.efirma_expiry || '');
                setEditCsd(result.data.profile.csd_expiry || '');
                setEditCurp(result.data.profile.curp || '');
                setEditRazonSocial(result.data.profile.razon_social || '');
                setEditRegimen(result.data.profile.regimen_fiscal || '');
                setEditCp(result.data.profile.codigo_postal || '');
                setEditEstado(result.data.profile.estado || '');
                setEditDomicilio(result.data.profile.domicilio || '');
                setEditPhone(result.data.profile.phone || '');
                setEditEfirmaDelivery(result.data.profile.efirma_delivery_date || '');
                setEditEfirmaLink(result.data.profile.efirma_link || '');
                setEditEfirmaFileUrl(result.data.profile.efirma_file_url || '');
            }
        } catch (error) {
            console.error('Error loading fiscal profile:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { loadProfile(); }, [clientId]);

    const handleSaveEfirma = async () => {
        setIsSavingEfirma(true);
        try {
            const result = await api.updateClientFiscalFields(clientId, {
                efirma_delivery_date: editEfirmaDelivery,
                efirma_link: editEfirmaLink,
                efirma_file_url: editEfirmaFileUrl,
            });
            if (result.data) {
                setProfile(result.data.profile);
                setIsEditingEfirma(false);
            }
        } catch (error) {
            console.error('Error saving efirma data:', error);
        } finally {
            setIsSavingEfirma(false);
        }
    };

    const handleUploadEfirma = async (file: File) => {
        setIsUploadingEfirma(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            const response = await fetch(`${api['baseUrl']}/upload`, {
                method: 'POST',
                body: formData,
            });
            const data = await response.json();
            if (data.url) {
                setEditEfirmaFileUrl(data.url);
                // Save immediately
                const result = await api.updateClientFiscalFields(clientId, {
                    efirma_file_url: data.url,
                });
                if (result.data) setProfile(result.data.profile);
            }
        } catch (error) {
            console.error('Error uploading efirma file:', error);
        } finally {
            setIsUploadingEfirma(false);
        }
    };

    const handleSaveFiscal = async () => {
        setIsSavingFiscal(true);
        try {
            const result = await api.updateClientFiscalFields(clientId, {
                curp: editCurp,
                razon_social: editRazonSocial,
                regimen_fiscal: editRegimen,
                codigo_postal: editCp,
                estado: editEstado,
                domicilio: editDomicilio,
                phone: editPhone,
            });
            if (result.data) {
                setProfile(result.data.profile);
                setIsEditingFiscal(false);
            }
        } catch (error) {
            console.error('Error saving fiscal data:', error);
        } finally {
            setIsSavingFiscal(false);
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const result = await api.updateClientFiscalFields(clientId, {
                capital: editCapital ? parseFloat(editCapital) : undefined,
                efirma_expiry: editEfirma || undefined,
                csd_expiry: editCsd || undefined,
            });
            if (result.data) {
                setProfile(result.data.profile);
                setIsEditing(false);
            }
        } catch (error) {
            console.error('Error saving fiscal fields:', error);
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={colors.primary} />
            </View>
        );
    }

    if (!profile) return null;

    const cardBg = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.95)';
    const cardBorder = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
    const efirmaSev = getDeadlineSeverity(profile.efirma_expiry);
    const csdSev = getDeadlineSeverity(profile.csd_expiry);

    const EditableInfoRow = ({ label, value, onChange, icon, colors: c, isDark: dark, multiline }: {
        label: string; value: string; onChange: (v: string) => void;
        icon: keyof typeof Ionicons.glyphMap; colors: any; isDark: boolean; multiline?: boolean;
    }) => (
        <View style={styles.infoRow}>
            <View style={[styles.infoIcon, { backgroundColor: `${c.primary}10` }]}>
                <Ionicons name={icon} size={14} color={c.primary} />
            </View>
            <View style={styles.infoContent}>
                <Text style={[styles.infoLabel, { color: c.textMuted }]}>{label}</Text>
                <TextInput
                    style={[styles.fieldInput, {
                        color: c.textPrimary,
                        backgroundColor: dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)',
                        borderColor: dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                    }]}
                    value={value}
                    onChangeText={onChange}
                    placeholder={label}
                    placeholderTextColor={c.textMuted}
                    multiline={multiline}
                />
            </View>
        </View>
    );

    const InfoRow = ({ label, value, icon }: { label: string; value: string | null; icon: keyof typeof Ionicons.glyphMap }) => (
        <View style={styles.infoRow}>
            <View style={[styles.infoIcon, { backgroundColor: `${colors.primary}10` }]}>
                <Ionicons name={icon} size={14} color={colors.primary} />
            </View>
            <View style={styles.infoContent}>
                <Text style={[styles.infoLabel, { color: colors.textMuted }]}>{label}</Text>
                <Text style={[styles.infoValue, { color: colors.textPrimary }]}>{value || '-'}</Text>
            </View>
        </View>
    );

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false} scrollEnabled={!disableScroll}>
            {/* Header Card */}
            <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                <View style={styles.profileHeader}>
                    <LinearGradient
                        colors={['#5C76B2', '#97B1DE']}
                        style={styles.avatar}
                    >
                        <Text style={styles.avatarText}>
                            {(profile.name || profile.rfc || '?').charAt(0).toUpperCase()}
                        </Text>
                    </LinearGradient>
                    <View style={styles.profileInfo}>
                        <Text style={[styles.profileName, { color: colors.textPrimary }]}>
                            {profile.name || profile.razon_social || 'Sin nombre'}
                        </Text>
                        <Text style={[styles.profileRfc, { color: colors.textMuted }]}>{profile.rfc}</Text>
                        {profile.tipo_persona && (
                            <Text style={[styles.profileType, { color: colors.textSecondary }]}>
                                Persona {profile.tipo_persona}
                            </Text>
                        )}
                    </View>
                </View>
            </View>

            {/* Fiscal / Personal Data - Tabbed */}
            <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                {/* Tab Bar */}
                <View style={styles.tabBar}>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'fiscal' && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
                        onPress={() => setActiveTab('fiscal')}
                    >
                        <Text style={[styles.tabText, { color: activeTab === 'fiscal' ? colors.primary : colors.textMuted }]}>
                            Datos Fiscales
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'personal' && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
                        onPress={() => setActiveTab('personal')}
                    >
                        <Text style={[styles.tabText, { color: activeTab === 'personal' ? colors.primary : colors.textMuted }]}>
                            Personales
                        </Text>
                    </TouchableOpacity>
                    <View style={{ flex: 1 }} />
                    {!isEditingFiscal ? (
                        <TouchableOpacity onPress={() => setIsEditingFiscal(true)} style={styles.editBtn}>
                            <Ionicons name="pencil-outline" size={14} color={colors.primary} />
                            <Text style={[styles.editBtnText, { color: colors.primary }]}>Editar</Text>
                        </TouchableOpacity>
                    ) : (
                        <View style={styles.editActions}>
                            <TouchableOpacity onPress={() => setIsEditingFiscal(false)} style={styles.cancelBtn}>
                                <Text style={[styles.cancelBtnText, { color: colors.textMuted }]}>Cancelar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={handleSaveFiscal} disabled={isSavingFiscal} style={[styles.saveBtn, { backgroundColor: colors.primary }]}>
                                {isSavingFiscal ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <Text style={styles.saveBtnText}>Guardar</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    )}
                </View>

                {/* Tab Content */}
                <View style={{ marginTop: 14 }}>
                    {activeTab === 'fiscal' ? (
                        isEditingFiscal ? (
                            <>
                                <InfoRow label="RFC" value={profile.rfc} icon="document-text-outline" />
                                <EditableInfoRow label="Razon Social" value={editRazonSocial} onChange={setEditRazonSocial} icon="business-outline" colors={colors} isDark={isDark} />
                                <EditableInfoRow label="Regimen Fiscal" value={editRegimen} onChange={setEditRegimen} icon="receipt-outline" colors={colors} isDark={isDark} />
                                <EditableInfoRow label="CURP" value={editCurp} onChange={setEditCurp} icon="card-outline" colors={colors} isDark={isDark} />
                                <EditableInfoRow label="Codigo Postal" value={editCp} onChange={setEditCp} icon="location-outline" colors={colors} isDark={isDark} />
                                <EditableInfoRow label="Estado" value={editEstado} onChange={setEditEstado} icon="map-outline" colors={colors} isDark={isDark} />
                                <EditableInfoRow label="Domicilio" value={editDomicilio} onChange={setEditDomicilio} icon="home-outline" colors={colors} isDark={isDark} multiline />
                            </>
                        ) : (
                            <>
                                <InfoRow label="RFC" value={profile.rfc} icon="document-text-outline" />
                                <InfoRow label="Razon Social" value={profile.razon_social} icon="business-outline" />
                                <InfoRow label="Regimen Fiscal" value={profile.regimen_fiscal} icon="receipt-outline" />
                                <InfoRow label="CURP" value={profile.curp} icon="card-outline" />
                                <InfoRow label="Codigo Postal" value={profile.codigo_postal} icon="location-outline" />
                                <InfoRow label="Estado" value={profile.estado} icon="map-outline" />
                                <InfoRow label="Domicilio" value={profile.domicilio} icon="home-outline" />
                            </>
                        )
                    ) : (
                        isEditingFiscal ? (
                            <>
                                <InfoRow label="Nombre" value={profile.name} icon="person-outline" />
                                <EditableInfoRow label="Telefono" value={editPhone} onChange={setEditPhone} icon="call-outline" colors={colors} isDark={isDark} />
                            </>
                        ) : (
                            <>
                                <InfoRow label="Nombre" value={profile.name} icon="person-outline" />
                                <InfoRow label="Telefono" value={profile.phone} icon="call-outline" />
                            </>
                        )
                    )}
                </View>
            </View>

            {/* Editable Fiscal Fields */}
            <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                <View style={styles.sectionHeader}>
                    <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                        Informacion Complementaria
                    </Text>
                    {!isEditing ? (
                        <TouchableOpacity onPress={() => setIsEditing(true)} style={styles.editBtn}>
                            <Ionicons name="pencil-outline" size={14} color={colors.primary} />
                            <Text style={[styles.editBtnText, { color: colors.primary }]}>Editar</Text>
                        </TouchableOpacity>
                    ) : (
                        <View style={styles.editActions}>
                            <TouchableOpacity onPress={() => setIsEditing(false)} style={styles.cancelBtn}>
                                <Text style={[styles.cancelBtnText, { color: colors.textMuted }]}>Cancelar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={handleSave} disabled={isSaving} style={[styles.saveBtn, { backgroundColor: colors.primary }]}>
                                {isSaving ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <Text style={styles.saveBtnText}>Guardar</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    )}
                </View>

                {/* Capital */}
                <View style={styles.fieldRow}>
                    <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Capital Social</Text>
                    {isEditing ? (
                        <TextInput
                            style={[styles.fieldInput, {
                                color: colors.textPrimary,
                                backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)',
                                borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                            }]}
                            value={editCapital}
                            onChangeText={setEditCapital}
                            keyboardType="numeric"
                            placeholder="0.00"
                            placeholderTextColor={colors.textMuted}
                        />
                    ) : (
                        <Text style={[styles.fieldValue, { color: colors.textPrimary }]}>
                            {profile.capital ? `$${parseFloat(profile.capital).toLocaleString('es-MX', { minimumFractionDigits: 2 })}` : '-'}
                        </Text>
                    )}
                </View>

                {/* e.firma Expiry */}
                <View style={styles.fieldRow}>
                    <View style={styles.fieldLabelRow}>
                        <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Vencimiento e.firma</Text>
                        {efirmaSev && <DeadlineTrafficLight severity={efirmaSev} size={8} />}
                    </View>
                    {isEditing ? (
                        Platform.OS === 'web' ? (
                            <View style={[styles.fieldInput, {
                                backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)',
                                borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                                flexDirection: 'row', alignItems: 'center',
                            }]}>
                                <input
                                    type="date"
                                    value={editEfirma}
                                    onChange={(e: any) => setEditEfirma(e.target.value)}
                                    style={{
                                        flex: 1, background: 'transparent', border: 'none', outline: 'none',
                                        color: isDark ? '#e5e5e5' : '#1a1a1a', fontSize: 13, fontWeight: 500,
                                        fontFamily: 'inherit', colorScheme: isDark ? 'dark' : 'light',
                                    }}
                                />
                            </View>
                        ) : (
                            <TextInput
                                style={[styles.fieldInput, {
                                    color: colors.textPrimary,
                                    backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)',
                                    borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                                }]}
                                value={editEfirma}
                                onChangeText={setEditEfirma}
                                placeholder="YYYY-MM-DD"
                                placeholderTextColor={colors.textMuted}
                            />
                        )
                    ) : (
                        <Text style={[styles.fieldValue, { color: colors.textPrimary }]}>
                            {profile.efirma_expiry || '-'}
                        </Text>
                    )}
                </View>

                {/* CSD Expiry */}
                <View style={styles.fieldRow}>
                    <View style={styles.fieldLabelRow}>
                        <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Vencimiento CSD</Text>
                        {csdSev && <DeadlineTrafficLight severity={csdSev} size={8} />}
                    </View>
                    {isEditing ? (
                        Platform.OS === 'web' ? (
                            <View style={[styles.fieldInput, {
                                backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)',
                                borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                                flexDirection: 'row', alignItems: 'center',
                            }]}>
                                <input
                                    type="date"
                                    value={editCsd}
                                    onChange={(e: any) => setEditCsd(e.target.value)}
                                    style={{
                                        flex: 1, background: 'transparent', border: 'none', outline: 'none',
                                        color: isDark ? '#e5e5e5' : '#1a1a1a', fontSize: 13, fontWeight: 500,
                                        fontFamily: 'inherit', colorScheme: isDark ? 'dark' : 'light',
                                    }}
                                />
                            </View>
                        ) : (
                            <TextInput
                                style={[styles.fieldInput, {
                                    color: colors.textPrimary,
                                    backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)',
                                    borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                                }]}
                                value={editCsd}
                                onChangeText={setEditCsd}
                                placeholder="YYYY-MM-DD"
                                placeholderTextColor={colors.textMuted}
                            />
                        )
                    ) : (
                        <Text style={[styles.fieldValue, { color: colors.textPrimary }]}>
                            {profile.csd_expiry || '-'}
                        </Text>
                    )}
                </View>
            </View>

            {/* e.firma Section */}
            <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                <View style={styles.sectionHeader}>
                    <Text style={[styles.sectionTitle, { color: colors.textPrimary, marginBottom: 0 }]}>
                        e.firma
                    </Text>
                    {!isEditingEfirma ? (
                        <TouchableOpacity onPress={() => setIsEditingEfirma(true)} style={styles.editBtn}>
                            <Ionicons name="pencil-outline" size={14} color={colors.primary} />
                            <Text style={[styles.editBtnText, { color: colors.primary }]}>Editar</Text>
                        </TouchableOpacity>
                    ) : (
                        <View style={styles.editActions}>
                            <TouchableOpacity onPress={() => setIsEditingEfirma(false)} style={styles.cancelBtn}>
                                <Text style={[styles.cancelBtnText, { color: colors.textMuted }]}>Cancelar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={handleSaveEfirma} disabled={isSavingEfirma} style={[styles.saveBtn, { backgroundColor: colors.primary }]}>
                                {isSavingEfirma ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <Text style={styles.saveBtnText}>Guardar</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    )}
                </View>

                {/* Fecha de Entrega */}
                <View style={styles.fieldRow}>
                    <View style={styles.fieldLabelRow}>
                        <Ionicons name="calendar-outline" size={14} color={colors.primary} style={{ marginRight: 6 }} />
                        <Text style={[styles.fieldLabel, { color: colors.textMuted, marginBottom: 0 }]}>Fecha de Entrega</Text>
                    </View>
                    {isEditingEfirma ? (
                        Platform.OS === 'web' ? (
                            <View style={[styles.fieldInput, {
                                backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)',
                                borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                                flexDirection: 'row', alignItems: 'center',
                            }]}>
                                <input
                                    type="date"
                                    value={editEfirmaDelivery}
                                    onChange={(e: any) => setEditEfirmaDelivery(e.target.value)}
                                    style={{
                                        flex: 1, background: 'transparent', border: 'none', outline: 'none',
                                        color: isDark ? '#e5e5e5' : '#1a1a1a', fontSize: 13, fontWeight: 500,
                                        fontFamily: 'inherit', colorScheme: isDark ? 'dark' : 'light',
                                    }}
                                />
                            </View>
                        ) : (
                            <TextInput
                                style={[styles.fieldInput, {
                                    color: colors.textPrimary,
                                    backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)',
                                    borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                                }]}
                                value={editEfirmaDelivery}
                                onChangeText={setEditEfirmaDelivery}
                                placeholder="YYYY-MM-DD"
                                placeholderTextColor={colors.textMuted}
                            />
                        )
                    ) : (
                        <Text style={[styles.fieldValue, { color: colors.textPrimary }]}>
                            {profile.efirma_delivery_date || '-'}
                        </Text>
                    )}
                </View>

                {/* Link */}
                <View style={styles.fieldRow}>
                    <View style={styles.fieldLabelRow}>
                        <Ionicons name="link-outline" size={14} color={colors.primary} style={{ marginRight: 6 }} />
                        <Text style={[styles.fieldLabel, { color: colors.textMuted, marginBottom: 0 }]}>Link</Text>
                    </View>
                    {isEditingEfirma ? (
                        <TextInput
                            style={[styles.fieldInput, {
                                color: colors.textPrimary,
                                backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)',
                                borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                            }]}
                            value={editEfirmaLink}
                            onChangeText={setEditEfirmaLink}
                            placeholder="https://..."
                            placeholderTextColor={colors.textMuted}
                            autoCapitalize="none"
                        />
                    ) : profile.efirma_link ? (
                        <TouchableOpacity onPress={() => Linking.openURL(profile.efirma_link!)}>
                            <Text style={[styles.fieldValue, { color: colors.primary }]} numberOfLines={1}>
                                {profile.efirma_link}
                            </Text>
                        </TouchableOpacity>
                    ) : (
                        <Text style={[styles.fieldValue, { color: colors.textPrimary }]}>-</Text>
                    )}
                </View>

                {/* Adjuntar e.firma */}
                <View style={styles.fieldRow}>
                    <View style={styles.fieldLabelRow}>
                        <Ionicons name="attach-outline" size={14} color={colors.primary} style={{ marginRight: 6 }} />
                        <Text style={[styles.fieldLabel, { color: colors.textMuted, marginBottom: 0 }]}>Archivo e.firma</Text>
                    </View>
                    {profile.efirma_file_url ? (
                        <View style={styles.efirmaFileRow}>
                            <TouchableOpacity
                                onPress={() => Linking.openURL(profile.efirma_file_url!)}
                                style={[styles.efirmaFileBtn, { backgroundColor: `${colors.primary}15` }]}
                            >
                                <Ionicons name="document-outline" size={14} color={colors.primary} />
                                <Text style={[styles.efirmaFileBtnText, { color: colors.primary }]} numberOfLines={1}>
                                    Ver archivo
                                </Text>
                            </TouchableOpacity>
                            {isEditingEfirma && (
                                <TouchableOpacity
                                    onPress={() => {
                                        setEditEfirmaFileUrl('');
                                        api.updateClientFiscalFields(clientId, { efirma_file_url: '' }).then(r => {
                                            if (r.data) setProfile(r.data.profile);
                                        });
                                    }}
                                    style={styles.efirmaRemoveBtn}
                                >
                                    <Ionicons name="trash-outline" size={14} color="#E54D4D" />
                                </TouchableOpacity>
                            )}
                        </View>
                    ) : (
                        <Text style={[styles.fieldValue, { color: colors.textPrimary }]}>-</Text>
                    )}
                    {Platform.OS === 'web' && (
                        <>
                            <input
                                ref={fileInputRef as any}
                                type="file"
                                style={{ display: 'none' }}
                                onChange={(e: any) => {
                                    const file = e.target.files?.[0];
                                    if (file) handleUploadEfirma(file);
                                    e.target.value = '';
                                }}
                            />
                            <TouchableOpacity
                                style={[styles.uploadBtn, {
                                    backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                                    borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                                }]}
                                onPress={() => (fileInputRef.current as any)?.click()}
                                disabled={isUploadingEfirma}
                            >
                                {isUploadingEfirma ? (
                                    <ActivityIndicator size="small" color={colors.primary} />
                                ) : (
                                    <>
                                        <Ionicons name="cloud-upload-outline" size={16} color={colors.primary} />
                                        <Text style={[styles.uploadBtnText, { color: colors.primary }]}>
                                            {profile.efirma_file_url ? 'Cambiar archivo' : 'Subir archivo'}
                                        </Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        </>
                    )}
                </View>
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 60,
    },
    card: {
        borderRadius: 14,
        borderWidth: 1,
        padding: 18,
        marginBottom: 14,
    },
    profileHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
    },
    avatar: {
        width: 52,
        height: 52,
        borderRadius: 26,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: {
        color: '#fff',
        fontSize: 20,
        fontWeight: '700',
    },
    profileInfo: {
        flex: 1,
    },
    profileName: {
        fontSize: 16,
        fontWeight: '700',
    },
    profileRfc: {
        fontSize: 13,
        fontWeight: '500',
        marginTop: 2,
    },
    profileType: {
        fontSize: 11,
        fontWeight: '500',
        marginTop: 2,
        textTransform: 'capitalize',
    },
    sectionTitle: {
        fontSize: 13,
        fontWeight: '700',
        marginBottom: 14,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 14,
    },
    tabBar: {
        flexDirection: 'row',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.06)',
        paddingBottom: 0,
    },
    tab: {
        paddingVertical: 8,
        paddingHorizontal: 14,
        marginRight: 4,
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
    },
    tabText: {
        fontSize: 13,
        fontWeight: '700',
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
        marginBottom: 10,
    },
    infoIcon: {
        width: 28,
        height: 28,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 1,
    },
    infoContent: {
        flex: 1,
    },
    infoLabel: {
        fontSize: 10,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.3,
    },
    infoValue: {
        fontSize: 13,
        fontWeight: '500',
        marginTop: 2,
    },
    editBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    editBtnText: {
        fontSize: 12,
        fontWeight: '600',
    },
    editActions: {
        flexDirection: 'row',
        gap: 8,
    },
    cancelBtn: {
        paddingVertical: 6,
        paddingHorizontal: 12,
    },
    cancelBtnText: {
        fontSize: 12,
        fontWeight: '600',
    },
    saveBtn: {
        paddingVertical: 6,
        paddingHorizontal: 14,
        borderRadius: 8,
    },
    saveBtnText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '700',
    },
    fieldRow: {
        marginBottom: 14,
    },
    fieldLabelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    fieldLabel: {
        fontSize: 11,
        fontWeight: '700',
        marginBottom: 4,
    },
    fieldValue: {
        fontSize: 14,
        fontWeight: '500',
    },
    fieldInput: {
        fontSize: 13,
        fontWeight: '500',
        paddingHorizontal: 10,
        paddingVertical: 8,
        borderRadius: 8,
        borderWidth: 1,
        marginTop: 4,
    },
    efirmaFileRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 4,
    },
    efirmaFileBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
    },
    efirmaFileBtnText: {
        fontSize: 12,
        fontWeight: '600',
    },
    efirmaRemoveBtn: {
        padding: 8,
    },
    uploadBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderRadius: 8,
        borderWidth: 1,
        borderStyle: 'dashed',
        marginTop: 8,
    },
    uploadBtnText: {
        fontSize: 12,
        fontWeight: '600',
    },
});
