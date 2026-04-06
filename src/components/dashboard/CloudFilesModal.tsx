import React, { useState, useEffect } from 'react';
import {
    View, Text, TouchableOpacity, Modal, FlatList,
    StyleSheet, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { api } from '../../api/client';
import type { CloudFile } from '../../types';

interface CloudFilesModalProps {
    visible: boolean;
    clientId: string;
    onClose: () => void;
    onSelect: (file: CloudFile) => void;
}

const TYPE_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
    image: 'image-outline',
    video: 'videocam-outline',
    file: 'document-outline',
};

export const CloudFilesModal: React.FC<CloudFilesModalProps> = ({
    visible, clientId, onClose, onSelect,
}) => {
    const { colors, isDark } = useTheme();
    const [files, setFiles] = useState<CloudFile[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (visible) {
            setIsLoading(true);
            api.getClientCloudFiles(clientId).then(r => {
                if (r.data) setFiles(r.data.files);
                setIsLoading(false);
            }).catch(() => setIsLoading(false));
        }
    }, [visible, clientId]);

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <View style={styles.overlay}>
                <View style={[styles.modal, { backgroundColor: isDark ? '#1a1a1a' : '#ffffff' }]}>
                    <View style={styles.modalHeader}>
                        <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                            Archivos del Cliente
                        </Text>
                        <TouchableOpacity onPress={onClose}>
                            <Ionicons name="close" size={22} color={colors.textMuted} />
                        </TouchableOpacity>
                    </View>

                    <Text style={[styles.subtitle, { color: colors.textMuted }]}>
                        Selecciona un archivo de los mensajes del cliente para vincularlo a esta fase.
                    </Text>

                    {isLoading ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="small" color={colors.primary} />
                        </View>
                    ) : files.length === 0 ? (
                        <View style={styles.emptyContainer}>
                            <Ionicons name="cloud-offline-outline" size={36} color={colors.textMuted} />
                            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                                Sin archivos en mensajes
                            </Text>
                        </View>
                    ) : (
                        <FlatList
                            data={files}
                            keyExtractor={item => item.id}
                            style={styles.list}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={[styles.fileRow, {
                                        borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
                                    }]}
                                    onPress={() => onSelect(item)}
                                    activeOpacity={0.7}
                                >
                                    <Ionicons
                                        name={TYPE_ICONS[item.message_type] || 'document-outline'}
                                        size={20}
                                        color={colors.primary}
                                    />
                                    <View style={styles.fileInfo}>
                                        <Text style={[styles.fileName, { color: colors.textPrimary }]} numberOfLines={1}>
                                            {item.file_name || item.text || `Archivo ${item.message_type}`}
                                        </Text>
                                        <Text style={[styles.fileMeta, { color: colors.textMuted }]}>
                                            {item.message_type} - {new Date(item.created_at).toLocaleDateString('es-MX')}
                                        </Text>
                                    </View>
                                    <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
                                </TouchableOpacity>
                            )}
                        />
                    )}
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
        width: '90%',
        maxWidth: 440,
        maxHeight: '70%',
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
        paddingBottom: 8,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '700',
    },
    subtitle: {
        fontSize: 12,
        fontWeight: '500',
        paddingHorizontal: 20,
        paddingBottom: 12,
    },
    list: {
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    loadingContainer: {
        paddingVertical: 60,
        alignItems: 'center',
    },
    emptyContainer: {
        paddingVertical: 60,
        alignItems: 'center',
        gap: 10,
    },
    emptyText: {
        fontSize: 13,
        fontWeight: '500',
    },
    fileRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 10,
        borderBottomWidth: 1,
    },
    fileInfo: {
        flex: 1,
    },
    fileName: {
        fontSize: 13,
        fontWeight: '600',
    },
    fileMeta: {
        fontSize: 11,
        fontWeight: '500',
        marginTop: 2,
    },
});
