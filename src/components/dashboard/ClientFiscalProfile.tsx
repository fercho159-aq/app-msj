import React, { useState, useEffect } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, ScrollView,
    ActivityIndicator, StyleSheet, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../context/ThemeContext';
import { api } from '../../api/client';
import { DeadlineTrafficLight, getDeadlineSeverity } from './DeadlineTrafficLight';
import type { ClientFiscalProfile as ClientFiscalProfileType } from '../../types';

interface ClientFiscalProfileProps {
    clientId: string;
}

export const ClientFiscalProfile: React.FC<ClientFiscalProfileProps> = ({ clientId }) => {
    const { colors, isDark } = useTheme();
    const [profile, setProfile] = useState<ClientFiscalProfileType | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [editCapital, setEditCapital] = useState('');
    const [editEfirma, setEditEfirma] = useState('');
    const [editCsd, setEditCsd] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const loadProfile = async () => {
        setIsLoading(true);
        try {
            const result = await api.getClientFiscalProfile(clientId);
            if (result.data) {
                setProfile(result.data.profile);
                setEditCapital(result.data.profile.capital || '');
                setEditEfirma(result.data.profile.efirma_expiry || '');
                setEditCsd(result.data.profile.csd_expiry || '');
            }
        } catch (error) {
            console.error('Error loading fiscal profile:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { loadProfile(); }, [clientId]);

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
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
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

            {/* Fiscal Data */}
            <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Datos Fiscales</Text>
                <InfoRow label="RFC" value={profile.rfc} icon="document-text-outline" />
                <InfoRow label="CURP" value={profile.curp} icon="card-outline" />
                <InfoRow label="Razon Social" value={profile.razon_social} icon="business-outline" />
                <InfoRow label="Regimen Fiscal" value={profile.regimen_fiscal} icon="receipt-outline" />
                <InfoRow label="Codigo Postal" value={profile.codigo_postal} icon="location-outline" />
                <InfoRow label="Estado" value={profile.estado} icon="map-outline" />
                <InfoRow label="Domicilio" value={profile.domicilio} icon="home-outline" />
                <InfoRow label="Telefono" value={profile.phone} icon="call-outline" />
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
});
