import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { api } from '../../api/client';
import { CloudFilesModal } from './CloudFilesModal';
import type { PhaseDocument, CloudFile } from '../../types';

interface PhaseDocumentsProps {
    phaseId: string;
    clientId: string;
    documents: PhaseDocument[];
    onRefresh: () => void;
}

const FILE_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
    image: 'image-outline',
    video: 'videocam-outline',
    pdf: 'document-text-outline',
    default: 'document-outline',
};

function getFileIcon(fileType: string | null): keyof typeof Ionicons.glyphMap {
    if (!fileType) return FILE_ICONS.default;
    if (fileType.includes('image')) return FILE_ICONS.image;
    if (fileType.includes('video')) return FILE_ICONS.video;
    if (fileType.includes('pdf')) return FILE_ICONS.pdf;
    return FILE_ICONS.default;
}

export const PhaseDocuments: React.FC<PhaseDocumentsProps> = ({
    phaseId, clientId, documents, onRefresh,
}) => {
    const { colors, isDark } = useTheme();
    const [showCloudModal, setShowCloudModal] = useState(false);
    const [isRemoving, setIsRemoving] = useState<string | null>(null);

    const handleRemove = async (docId: string) => {
        setIsRemoving(docId);
        try {
            await api.removePhaseDocument(phaseId, docId);
            onRefresh();
        } catch (error) {
            console.error('Error removing document:', error);
        } finally {
            setIsRemoving(null);
        }
    };

    const handleLinkCloudFile = async (file: CloudFile) => {
        try {
            await api.linkPhaseDocument(phaseId, {
                messageId: file.id,
                fileUrl: file.media_url,
                fileName: file.file_name || `archivo_${file.id}`,
                fileType: file.message_type,
            });
            setShowCloudModal(false);
            onRefresh();
        } catch (error) {
            console.error('Error linking cloud file:', error);
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={[styles.title, { color: colors.textPrimary }]}>
                    Documentos ({documents.length})
                </Text>
                <TouchableOpacity
                    style={[styles.linkBtn, { borderColor: colors.primary }]}
                    onPress={() => setShowCloudModal(true)}
                >
                    <Ionicons name="cloud-outline" size={14} color={colors.primary} />
                    <Text style={[styles.linkBtnText, { color: colors.primary }]}>Vincular</Text>
                </TouchableOpacity>
            </View>

            {documents.length === 0 ? (
                <View style={styles.empty}>
                    <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                        Sin documentos
                    </Text>
                </View>
            ) : (
                documents.map(doc => (
                    <View
                        key={doc.id}
                        style={[styles.docRow, {
                            backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                            borderColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
                        }]}
                    >
                        <Ionicons name={getFileIcon(doc.file_type)} size={18} color={colors.textMuted} />
                        <View style={styles.docInfo}>
                            <Text style={[styles.docName, { color: colors.textPrimary }]} numberOfLines={1}>
                                {doc.file_name}
                            </Text>
                            <Text style={[styles.docMeta, { color: colors.textMuted }]}>
                                {doc.source === 'message' ? 'Desde mensajes' : 'Subido'} - {doc.uploader_name || 'Desconocido'}
                            </Text>
                        </View>
                        <TouchableOpacity
                            onPress={() => handleRemove(doc.id)}
                            disabled={isRemoving === doc.id}
                        >
                            {isRemoving === doc.id ? (
                                <ActivityIndicator size="small" color={colors.textMuted} />
                            ) : (
                                <Ionicons name="trash-outline" size={16} color="#EF4444" />
                            )}
                        </TouchableOpacity>
                    </View>
                ))
            )}

            <CloudFilesModal
                visible={showCloudModal}
                clientId={clientId}
                onClose={() => setShowCloudModal(false)}
                onSelect={handleLinkCloudFile}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: 16,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    title: {
        fontSize: 13,
        fontWeight: '700',
    },
    linkBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingVertical: 5,
        paddingHorizontal: 10,
        borderRadius: 6,
        borderWidth: 1,
    },
    linkBtnText: {
        fontSize: 11,
        fontWeight: '600',
    },
    empty: {
        paddingVertical: 20,
        alignItems: 'center',
    },
    emptyText: {
        fontSize: 12,
        fontWeight: '500',
    },
    docRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        padding: 10,
        borderRadius: 8,
        borderWidth: 1,
        marginBottom: 6,
    },
    docInfo: {
        flex: 1,
    },
    docName: {
        fontSize: 12,
        fontWeight: '600',
    },
    docMeta: {
        fontSize: 10,
        fontWeight: '500',
        marginTop: 2,
    },
});
