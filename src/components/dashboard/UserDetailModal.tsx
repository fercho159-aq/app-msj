import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    Image,
    Platform,
    Pressable,
    Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../context/ThemeContext';
import { api } from '../../api/client';
import type { User } from '../../api/client';
import type { UserMediaDetail } from '../../types';

interface UserDetailModalProps {
    visible: boolean;
    userId: string | null;
    onClose: () => void;
}

type MediaTab = 'all' | 'image' | 'video' | 'file';

const getInitials = (name: string | null, rfc: string) => {
    if (name) return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    return rfc.slice(0, 2).toUpperCase();
};

const formatDate = (dateStr: string) => {
    try {
        const d = new Date(dateStr);
        return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
        return dateStr;
    }
};

const getFileIcon = (type: string): keyof typeof Ionicons.glyphMap => {
    switch (type) {
        case 'image': return 'image';
        case 'video': return 'videocam';
        case 'file': return 'document';
        default: return 'attach';
    }
};

const getFileColor = (type: string): string => {
    switch (type) {
        case 'image': return '#5C76B2';
        case 'video': return '#8B5CF6';
        case 'file': return '#F59E0B';
        default: return '#64748B';
    }
};

export const UserDetailModal: React.FC<UserDetailModalProps> = ({ visible, userId, onClose }) => {
    const { colors, isDark } = useTheme();
    const [user, setUser] = useState<User | null>(null);
    const [media, setMedia] = useState<UserMediaDetail[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<MediaTab>('all');
    const [selectedImage, setSelectedImage] = useState<string | null>(null);

    useEffect(() => {
        if (visible && userId) {
            setLoading(true);
            setActiveTab('all');
            setSelectedImage(null);
            Promise.all([
                api.getUser(userId),
                api.getDashboardUserMedia(userId),
            ]).then(([userResult, mediaResult]) => {
                if (userResult.data?.user) setUser(userResult.data.user);
                if (mediaResult.data?.media) setMedia(mediaResult.data.media);
            }).catch(err => {
                console.error('Error loading user detail:', err);
            }).finally(() => {
                setLoading(false);
            });
        } else {
            setUser(null);
            setMedia([]);
        }
    }, [visible, userId]);

    const filteredMedia = activeTab === 'all' ? media : media.filter(m => m.message_type === activeTab);

    const mediaCounts = {
        all: media.length,
        image: media.filter(m => m.message_type === 'image').length,
        video: media.filter(m => m.message_type === 'video').length,
        file: media.filter(m => m.message_type === 'file').length,
    };

    const tabs: { key: MediaTab; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
        { key: 'all', label: `Todo (${mediaCounts.all})`, icon: 'grid-outline' },
        { key: 'image', label: `Imagenes (${mediaCounts.image})`, icon: 'image-outline' },
        { key: 'video', label: `Videos (${mediaCounts.video})`, icon: 'videocam-outline' },
        { key: 'file', label: `Archivos (${mediaCounts.file})`, icon: 'document-outline' },
    ];

    const panelBg = isDark ? '#141414' : '#ffffff';
    const overlayBg = 'rgba(0,0,0,0.5)';

    const handleOpenUrl = (url: string) => {
        if (Platform.OS === 'web') {
            window.open(url, '_blank');
        } else {
            Linking.openURL(url);
        }
    };

    // User info rows
    const infoRows: { label: string; value: string | null | undefined; icon: keyof typeof Ionicons.glyphMap }[] = user ? [
        { label: 'RFC', value: user.rfc, icon: 'card-outline' },
        { label: 'Rol', value: user.role || 'usuario', icon: 'shield-outline' },
        { label: 'Telefono', value: user.phone, icon: 'call-outline' },
        { label: 'Razon Social', value: user.razon_social, icon: 'business-outline' },
        { label: 'Tipo Persona', value: user.tipo_persona, icon: 'person-outline' },
        { label: 'CURP', value: user.curp, icon: 'finger-print-outline' },
        { label: 'Regimen Fiscal', value: user.regimen_fiscal, icon: 'receipt-outline' },
        { label: 'Codigo Postal', value: user.codigo_postal, icon: 'location-outline' },
        { label: 'Estado', value: user.estado, icon: 'map-outline' },
        { label: 'Domicilio', value: user.domicilio, icon: 'home-outline' },
    ] : [];

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <View style={[styles.overlay, { backgroundColor: overlayBg }]}>
                <Pressable style={styles.overlayPress} onPress={onClose} />

                {/* Panel */}
                <View style={[styles.panel, { backgroundColor: panelBg }]}>
                    {/* Close button */}
                    <TouchableOpacity style={[styles.closeBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]} onPress={onClose}>
                        <Ionicons name="close" size={20} color={colors.textSecondary} />
                    </TouchableOpacity>

                    {loading ? (
                        <View style={styles.loaderContainer}>
                            <ActivityIndicator size="large" color={colors.primary} />
                            <Text style={[styles.loaderText, { color: colors.textMuted }]}>Cargando informacion...</Text>
                        </View>
                    ) : (
                        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                            {/* ═══ USER HEADER ═══ */}
                            <View style={styles.userHeader}>
                                {user?.avatar_url ? (
                                    <Image source={{ uri: user.avatar_url }} style={styles.avatar} />
                                ) : (
                                    <LinearGradient
                                        colors={['#5C76B2', '#97B1DE'] as [string, string]}
                                        style={styles.avatar}
                                    >
                                        <Text style={styles.avatarText}>
                                            {getInitials(user?.name || null, user?.rfc || '??')}
                                        </Text>
                                    </LinearGradient>
                                )}
                                <View style={styles.userNameGroup}>
                                    <Text style={[styles.userName, { color: colors.textPrimary }]}>
                                        {user?.name || 'Sin nombre'}
                                    </Text>
                                    <Text style={[styles.userRfc, { color: colors.textMuted }]}>{user?.rfc}</Text>
                                    <View style={[styles.roleBadge, { backgroundColor: `${colors.primary}15` }]}>
                                        <Text style={[styles.roleText, { color: colors.primary }]}>
                                            {(user?.role || 'usuario').toUpperCase()}
                                        </Text>
                                    </View>
                                </View>
                            </View>

                            {/* ═══ USER INFO ═══ */}
                            <View style={styles.section}>
                                <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>INFORMACION DEL USUARIO</Text>
                                <View style={[styles.infoCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]}>
                                    {infoRows.map((row, i) => {
                                        if (!row.value) return null;
                                        return (
                                            <View
                                                key={row.label}
                                                style={[
                                                    styles.infoRow,
                                                    i < infoRows.filter(r => r.value).length - 1 && {
                                                        borderBottomWidth: StyleSheet.hairlineWidth,
                                                        borderBottomColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
                                                    },
                                                ]}
                                            >
                                                <View style={styles.infoLeft}>
                                                    <Ionicons name={row.icon} size={16} color={colors.textMuted} />
                                                    <Text style={[styles.infoLabel, { color: colors.textMuted }]}>{row.label}</Text>
                                                </View>
                                                <Text style={[styles.infoValue, { color: colors.textPrimary }]} numberOfLines={2}>
                                                    {row.value}
                                                </Text>
                                            </View>
                                        );
                                    })}
                                    {infoRows.every(r => !r.value || r.label === 'RFC' || r.label === 'Rol') && (
                                        <View style={styles.infoRow}>
                                            <Text style={[styles.infoEmpty, { color: colors.textMuted }]}>
                                                Solo se tiene RFC y rol registrados
                                            </Text>
                                        </View>
                                    )}
                                </View>
                            </View>

                            {/* ═══ MEDIA STATS ═══ */}
                            <View style={styles.mediaStats}>
                                <View style={[styles.mediaStat, { backgroundColor: '#5C76B215' }]}>
                                    <Ionicons name="image" size={18} color="#5C76B2" />
                                    <Text style={[styles.mediaStatValue, { color: colors.textPrimary }]}>{mediaCounts.image}</Text>
                                    <Text style={[styles.mediaStatLabel, { color: colors.textMuted }]}>Imagenes</Text>
                                </View>
                                <View style={[styles.mediaStat, { backgroundColor: '#8B5CF615' }]}>
                                    <Ionicons name="videocam" size={18} color="#8B5CF6" />
                                    <Text style={[styles.mediaStatValue, { color: colors.textPrimary }]}>{mediaCounts.video}</Text>
                                    <Text style={[styles.mediaStatLabel, { color: colors.textMuted }]}>Videos</Text>
                                </View>
                                <View style={[styles.mediaStat, { backgroundColor: '#F59E0B15' }]}>
                                    <Ionicons name="document" size={18} color="#F59E0B" />
                                    <Text style={[styles.mediaStatValue, { color: colors.textPrimary }]}>{mediaCounts.file}</Text>
                                    <Text style={[styles.mediaStatLabel, { color: colors.textMuted }]}>Archivos</Text>
                                </View>
                            </View>

                            {/* ═══ MEDIA TABS ═══ */}
                            <View style={styles.section}>
                                <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>ARCHIVOS COMPARTIDOS</Text>
                                <View style={styles.tabRow}>
                                    {tabs.map(tab => {
                                        const isActive = activeTab === tab.key;
                                        return (
                                            <TouchableOpacity
                                                key={tab.key}
                                                style={[
                                                    styles.tab,
                                                    {
                                                        backgroundColor: isActive ? colors.primary : (isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)'),
                                                    },
                                                ]}
                                                onPress={() => setActiveTab(tab.key)}
                                                activeOpacity={0.7}
                                            >
                                                <Ionicons name={tab.icon} size={14} color={isActive ? '#fff' : colors.textMuted} />
                                                <Text style={[styles.tabLabel, { color: isActive ? '#fff' : colors.textMuted }]}>
                                                    {tab.label}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            </View>

                            {/* ═══ MEDIA GRID / LIST ═══ */}
                            {filteredMedia.length === 0 ? (
                                <View style={styles.emptyMedia}>
                                    <Ionicons name="folder-open-outline" size={40} color={colors.textMuted} />
                                    <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                                        No hay archivos en esta categoria
                                    </Text>
                                </View>
                            ) : (
                                <>
                                    {/* Image grid for images */}
                                    {(activeTab === 'all' || activeTab === 'image') && mediaCounts.image > 0 && (
                                        <View style={styles.mediaSection}>
                                            {activeTab === 'all' && (
                                                <Text style={[styles.mediaSectionTitle, { color: colors.textSecondary }]}>
                                                    Imagenes
                                                </Text>
                                            )}
                                            <View style={styles.imageGrid}>
                                                {filteredMedia
                                                    .filter(m => m.message_type === 'image')
                                                    .map(item => (
                                                        <TouchableOpacity
                                                            key={item.id}
                                                            style={[styles.imageThumb, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }]}
                                                            onPress={() => setSelectedImage(item.media_url)}
                                                            activeOpacity={0.8}
                                                        >
                                                            <Image source={{ uri: item.media_url }} style={styles.thumbImage} />
                                                            <Text style={[styles.thumbDate, { color: colors.textMuted }]} numberOfLines={1}>
                                                                {formatDate(item.created_at)}
                                                            </Text>
                                                        </TouchableOpacity>
                                                    ))}
                                            </View>
                                        </View>
                                    )}

                                    {/* Video list */}
                                    {(activeTab === 'all' || activeTab === 'video') && mediaCounts.video > 0 && (
                                        <View style={styles.mediaSection}>
                                            {activeTab === 'all' && (
                                                <Text style={[styles.mediaSectionTitle, { color: colors.textSecondary }]}>
                                                    Videos
                                                </Text>
                                            )}
                                            {filteredMedia
                                                .filter(m => m.message_type === 'video')
                                                .map(item => (
                                                    <TouchableOpacity
                                                        key={item.id}
                                                        style={[styles.fileRow, { borderBottomColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)' }]}
                                                        onPress={() => handleOpenUrl(item.media_url)}
                                                        activeOpacity={0.7}
                                                    >
                                                        <View style={[styles.fileIcon, { backgroundColor: '#8B5CF615' }]}>
                                                            <Ionicons name="videocam" size={18} color="#8B5CF6" />
                                                        </View>
                                                        <View style={styles.fileInfo}>
                                                            <Text style={[styles.fileName, { color: colors.textPrimary }]} numberOfLines={1}>
                                                                {item.text || item.media_url.split('/').pop() || 'Video'}
                                                            </Text>
                                                            <Text style={[styles.fileDate, { color: colors.textMuted }]}>
                                                                {formatDate(item.created_at)}
                                                            </Text>
                                                        </View>
                                                        <Ionicons name="open-outline" size={16} color={colors.textMuted} />
                                                    </TouchableOpacity>
                                                ))}
                                        </View>
                                    )}

                                    {/* File list */}
                                    {(activeTab === 'all' || activeTab === 'file') && mediaCounts.file > 0 && (
                                        <View style={styles.mediaSection}>
                                            {activeTab === 'all' && (
                                                <Text style={[styles.mediaSectionTitle, { color: colors.textSecondary }]}>
                                                    Archivos
                                                </Text>
                                            )}
                                            {filteredMedia
                                                .filter(m => m.message_type === 'file')
                                                .map(item => (
                                                    <TouchableOpacity
                                                        key={item.id}
                                                        style={[styles.fileRow, { borderBottomColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)' }]}
                                                        onPress={() => handleOpenUrl(item.media_url)}
                                                        activeOpacity={0.7}
                                                    >
                                                        <View style={[styles.fileIcon, { backgroundColor: '#F59E0B15' }]}>
                                                            <Ionicons name="document" size={18} color="#F59E0B" />
                                                        </View>
                                                        <View style={styles.fileInfo}>
                                                            <Text style={[styles.fileName, { color: colors.textPrimary }]} numberOfLines={1}>
                                                                {item.text || item.media_url.split('/').pop() || 'Archivo'}
                                                            </Text>
                                                            <Text style={[styles.fileDate, { color: colors.textMuted }]}>
                                                                {formatDate(item.created_at)}
                                                            </Text>
                                                        </View>
                                                        <Ionicons name="download-outline" size={16} color={colors.textMuted} />
                                                    </TouchableOpacity>
                                                ))}
                                        </View>
                                    )}
                                </>
                            )}

                            <View style={{ height: 40 }} />
                        </ScrollView>
                    )}
                </View>

                {/* ═══ IMAGE LIGHTBOX ═══ */}
                {selectedImage && (
                    <Modal visible transparent animationType="fade" onRequestClose={() => setSelectedImage(null)}>
                        <View style={styles.lightbox}>
                            <TouchableOpacity
                                style={styles.lightboxClose}
                                onPress={() => setSelectedImage(null)}
                            >
                                <Ionicons name="close" size={28} color="#fff" />
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.lightboxDownload}
                                onPress={() => handleOpenUrl(selectedImage)}
                            >
                                <Ionicons name="open-outline" size={22} color="#fff" />
                            </TouchableOpacity>
                            <Image
                                source={{ uri: selectedImage }}
                                style={styles.lightboxImage}
                                resizeMode="contain"
                            />
                        </View>
                    </Modal>
                )}
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'flex-end',
    },
    overlayPress: {
        flex: 1,
    },
    panel: {
        width: Platform.OS === 'web' ? 520 : '90%',
        maxWidth: 560,
        height: '100%',
        ...(Platform.OS === 'web' ? {
            // @ts-ignore
            boxShadow: '-8px 0 40px rgba(0,0,0,0.2)',
        } : {
            shadowColor: '#000',
            shadowOffset: { width: -4, height: 0 },
            shadowOpacity: 0.2,
            shadowRadius: 20,
            elevation: 20,
        }),
    },
    closeBtn: {
        position: 'absolute',
        top: 16,
        right: 16,
        zIndex: 10,
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    loaderContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 14,
    },
    loaderText: {
        fontSize: 13,
        fontWeight: '500',
    },
    scrollContent: {
        padding: 24,
        paddingTop: 20,
    },

    // User header
    userHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        paddingBottom: 24,
        paddingRight: 40,
    },
    avatar: {
        width: 64,
        height: 64,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: {
        color: '#fff',
        fontSize: 22,
        fontWeight: '800',
    },
    userNameGroup: {
        flex: 1,
        gap: 4,
    },
    userName: {
        fontSize: 20,
        fontWeight: '800',
        letterSpacing: -0.3,
    },
    userRfc: {
        fontSize: 13,
        fontWeight: '600',
        letterSpacing: 0.5,
    },
    roleBadge: {
        alignSelf: 'flex-start',
        paddingHorizontal: 10,
        paddingVertical: 3,
        borderRadius: 6,
        marginTop: 4,
    },
    roleText: {
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 0.8,
    },

    // Sections
    section: {
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 1,
        marginBottom: 10,
    },

    // Info card
    infoCard: {
        borderRadius: 12,
        borderWidth: 1,
        overflow: 'hidden',
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 11,
    },
    infoLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        flex: 1,
    },
    infoLabel: {
        fontSize: 12,
        fontWeight: '600',
    },
    infoValue: {
        fontSize: 13,
        fontWeight: '600',
        flex: 1,
        textAlign: 'right',
    },
    infoEmpty: {
        fontSize: 13,
        fontStyle: 'italic',
    },

    // Media stats
    mediaStats: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 24,
    },
    mediaStat: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 14,
        borderRadius: 12,
        gap: 6,
    },
    mediaStatValue: {
        fontSize: 20,
        fontWeight: '800',
        letterSpacing: -0.5,
    },
    mediaStatLabel: {
        fontSize: 11,
        fontWeight: '600',
    },

    // Tabs
    tabRow: {
        flexDirection: 'row',
        gap: 6,
        flexWrap: 'wrap',
    },
    tab: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
    },
    tabLabel: {
        fontSize: 12,
        fontWeight: '600',
    },

    // Media sections
    mediaSection: {
        marginBottom: 20,
    },
    mediaSectionTitle: {
        fontSize: 13,
        fontWeight: '700',
        marginBottom: 10,
    },

    // Image grid
    imageGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    imageThumb: {
        width: 108,
        borderRadius: 10,
        overflow: 'hidden',
    },
    thumbImage: {
        width: 108,
        height: 108,
        borderRadius: 10,
    },
    thumbDate: {
        fontSize: 9,
        textAlign: 'center',
        paddingVertical: 4,
        fontWeight: '500',
    },

    // File rows
    fileRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    fileIcon: {
        width: 40,
        height: 40,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    fileInfo: {
        flex: 1,
        gap: 2,
    },
    fileName: {
        fontSize: 13,
        fontWeight: '600',
    },
    fileDate: {
        fontSize: 11,
        fontWeight: '500',
    },

    // Empty state
    emptyMedia: {
        alignItems: 'center',
        paddingVertical: 40,
        gap: 10,
    },
    emptyText: {
        fontSize: 13,
        fontWeight: '500',
    },

    // Lightbox
    lightbox: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.92)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    lightboxClose: {
        position: 'absolute',
        top: 20,
        right: 20,
        zIndex: 10,
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255,255,255,0.15)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    lightboxDownload: {
        position: 'absolute',
        top: 20,
        right: 76,
        zIndex: 10,
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255,255,255,0.15)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    lightboxImage: {
        width: '85%',
        height: '80%',
    },
});
