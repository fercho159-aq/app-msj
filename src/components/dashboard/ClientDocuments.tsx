import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { api } from '../../api/client';
import { CloudFilesModal } from './CloudFilesModal';
import type { ClientDocument, CloudFile } from '../../types';

interface ClientDocumentsProps {
    clientId: string;
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

export const ClientDocuments: React.FC<ClientDocumentsProps> = ({ clientId }) => {
    const { colors, isDark } = useTheme();
    const [documents, setDocuments] = useState<ClientDocument[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showCloudModal, setShowCloudModal] = useState(false);
    const [isRemoving, setIsRemoving] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    const loadDocuments = async () => {
        const result = await api.getClientDocuments(clientId);
        if (result.data) setDocuments(result.data.documents);
        setIsLoading(false);
    };

    useEffect(() => { loadDocuments(); }, [clientId]);

    const handleFileUpload = async (event: any) => {
        const file = event.target?.files?.[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', file);

            const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://appsoluciones.duckdns.org/api';
            const uploadResponse = await fetch(`${API_URL}/upload`, {
                method: 'POST',
                body: formData,
            });
            const uploadData = await uploadResponse.json();

            if (uploadData.url) {
                await api.addClientDocument(clientId, {
                    fileUrl: uploadData.url,
                    fileName: file.name,
                    fileType: file.type,
                    fileSize: file.size,
                });
                loadDocuments();
            }
        } catch (error) {
            console.error('Error uploading client document:', error);
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleRemove = async (docId: string) => {
        setIsRemoving(docId);
        try {
            await api.removeClientDocument(clientId, docId);
            loadDocuments();
        } catch (error) {
            console.error('Error removing client document:', error);
        } finally {
            setIsRemoving(null);
        }
    };

    const handleLinkCloudFile = async (file: CloudFile) => {
        try {
            await api.linkClientDocument(clientId, {
                messageId: file.id,
                fileUrl: file.media_url,
                fileName: file.file_name || `archivo_${file.id}`,
                fileType: file.message_type,
            });
            setShowCloudModal(false);
            loadDocuments();
        } catch (error) {
            console.error('Error linking cloud file:', error);
        }
    };

    const cardBg = isDark ? '#111' : '#fff';
    const cardBorder = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';

    return (
        <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
            <View style={styles.header}>
                <Text style={[styles.title, { color: colors.textPrimary }]}>
                    Documentos ({documents.length})
                </Text>
                <View style={styles.headerButtons}>
                    {Platform.OS === 'web' && (
                        <>
                            <input
                                ref={fileInputRef as any}
                                type="file"
                                onChange={handleFileUpload}
                                style={{ display: 'none' }}
                                accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.xml,.zip"
                            />
                            <TouchableOpacity
                                style={[styles.uploadBtn, { backgroundColor: colors.primary }]}
                                onPress={() => fileInputRef.current?.click()}
                                disabled={isUploading}
                            >
                                {isUploading ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <>
                                        <Ionicons name="cloud-upload-outline" size={14} color="#fff" />
                                        <Text style={styles.uploadBtnText}>Subir</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        </>
                    )}
                    <TouchableOpacity
                        style={[styles.linkBtn, { borderColor: colors.primary }]}
                        onPress={() => setShowCloudModal(true)}
                    >
                        <Ionicons name="cloud-outline" size={14} color={colors.primary} />
                        <Text style={[styles.linkBtnText, { color: colors.primary }]}>Vincular</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {isLoading ? (
                <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 20 }} />
            ) : documents.length === 0 ? (
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
                            borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
                        }]}
                    >
                        <Ionicons name={getFileIcon(doc.file_type)} size={18} color={colors.textMuted} />
                        <TouchableOpacity
                            style={styles.docInfo}
                            onPress={() => {
                                if (Platform.OS === 'web') {
                                    const a = document.createElement('a');
                                    a.href = doc.file_url;
                                    a.download = doc.file_name;
                                    a.target = '_blank';
                                    a.click();
                                }
                            }}
                            activeOpacity={0.7}
                        >
                            <Text style={[styles.docName, { color: colors.textPrimary }]} numberOfLines={1}>
                                {doc.file_name}
                            </Text>
                            <Text style={[styles.docMeta, { color: colors.textMuted }]}>
                                {doc.source === 'message' ? 'Desde mensajes' : 'Subido'} - {doc.uploader_name || 'Desconocido'}
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.downloadBtn}
                            onPress={() => {
                                if (Platform.OS === 'web') {
                                    window.open(doc.file_url, '_blank', 'noopener,noreferrer');
                                }
                            }}
                        >
                            <Ionicons name="eye-outline" size={16} color={colors.primary} />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.downloadBtn}
                            onPress={() => {
                                if (Platform.OS === 'web') {
                                    const a = document.createElement('a');
                                    a.href = doc.file_url;
                                    a.download = doc.file_name;
                                    a.target = '_blank';
                                    a.click();
                                }
                            }}
                        >
                            <Ionicons name="download-outline" size={16} color={colors.primary} />
                        </TouchableOpacity>
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
    card: {
        borderRadius: 12,
        borderWidth: 1,
        padding: 16,
        marginBottom: 16,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    title: {
        fontSize: 15,
        fontWeight: '700',
    },
    headerButtons: {
        flexDirection: 'row',
        gap: 6,
    },
    uploadBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 8,
    },
    uploadBtnText: {
        color: '#fff',
        fontSize: 11,
        fontWeight: '700',
    },
    linkBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 8,
        borderWidth: 1,
    },
    linkBtnText: {
        fontSize: 11,
        fontWeight: '700',
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
        padding: 12,
        borderRadius: 10,
        borderWidth: 1,
        marginBottom: 8,
    },
    docInfo: {
        flex: 1,
    },
    downloadBtn: {
        padding: 4,
    },
    docName: {
        fontSize: 13,
        fontWeight: '600',
    },
    docMeta: {
        fontSize: 11,
        fontWeight: '500',
        marginTop: 2,
    },
});
