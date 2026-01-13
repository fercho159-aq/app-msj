import React, { useState } from 'react';
import {
    View,
    Modal,
    StyleSheet,
    TouchableOpacity,
    Image,
    Dimensions,
    ActivityIndicator,
    Text,
    StatusBar,
    Platform,
    ScrollView,
    Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import * as WebBrowser from 'expo-web-browser';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as MediaLibrary from 'expo-media-library';
import { getAbsoluteMediaUrl } from '../utils/urlHelper';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface MediaPreviewProps {
    visible: boolean;
    mediaUrl: string | null;
    mediaType: 'image' | 'file' | 'video' | 'audio' | 'text';
    fileName?: string;
    onClose: () => void;
}

export const MediaPreview: React.FC<MediaPreviewProps> = ({
    visible,
    mediaUrl: propMediaUrl,
    mediaType,
    fileName,
    onClose,
}) => {
    const [isLoading, setIsLoading] = useState(true);
    const [imageError, setImageError] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [downloadProgress, setDownloadProgress] = useState(0);

    const mediaUrl = getAbsoluteMediaUrl(propMediaUrl);

    if (!mediaUrl) return null;

    const getFileExtension = (url: string) => {
        const parts = url.split('.');
        return parts[parts.length - 1].toLowerCase().split('?')[0];
    };

    const getFileName = () => {
        if (fileName) return fileName;
        const urlFileName = mediaUrl.split('/').pop() || 'archivo';
        return urlFileName.split('?')[0];
    };

    const isImage = () => {
        if (mediaType === 'image') return true;
        const ext = getFileExtension(mediaUrl);
        return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(ext);
    };

    const isPDF = () => {
        const ext = getFileExtension(mediaUrl);
        return ext === 'pdf';
    };

    const handleOpenExternal = async () => {
        try {
            await WebBrowser.openBrowserAsync(mediaUrl);
        } catch (error) {
            console.error('Error opening browser:', error);
        }
    };

    const handleDownload = async () => {
        try {
            setIsDownloading(true);
            setDownloadProgress(0);

            const downloadFileName = getFileName();
            const fileUri = FileSystem.documentDirectory + downloadFileName;

            // Descargar usando la API legacy
            const downloadResumable = FileSystem.createDownloadResumable(
                mediaUrl,
                fileUri,
                {},
                (downloadProgress) => {
                    const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
                    setDownloadProgress(progress);
                }
            );

            const result = await downloadResumable.downloadAsync();

            if (!result?.uri) {
                throw new Error('No se pudo descargar el archivo');
            }

            // Si es imagen, guardar en la galería
            if (isImage()) {
                const { status } = await MediaLibrary.requestPermissionsAsync();
                if (status === 'granted') {
                    await MediaLibrary.saveToLibraryAsync(result.uri);
                    Alert.alert(
                        '✅ Imagen guardada',
                        'La imagen se ha guardado en tu galería.',
                        [{ text: 'OK' }]
                    );
                } else {
                    await shareFile(result.uri);
                }
            } else {
                await shareFile(result.uri);
            }

        } catch (error: any) {
            console.error('Error downloading:', error);
            Alert.alert('Error', 'No se pudo descargar el archivo: ' + error.message);
        } finally {
            setIsDownloading(false);
            setDownloadProgress(0);
        }
    };

    const shareFile = async (fileUri: string) => {
        const isSharingAvailable = await Sharing.isAvailableAsync();
        if (isSharingAvailable) {
            await Sharing.shareAsync(fileUri, {
                mimeType: getMimeType(getFileExtension(mediaUrl)),
                dialogTitle: 'Guardar archivo',
            });
        } else {
            Alert.alert('Info', 'El archivo se descargó pero no se puede compartir en este dispositivo.');
        }
    };

    const getMimeType = (ext: string): string => {
        const mimeTypes: { [key: string]: string } = {
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'png': 'image/png',
            'gif': 'image/gif',
            'webp': 'image/webp',
            'pdf': 'application/pdf',
            'doc': 'application/msword',
            'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'xls': 'application/vnd.ms-excel',
            'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'ppt': 'application/vnd.ms-powerpoint',
            'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'txt': 'text/plain',
            'html': 'text/html',
        };
        return mimeTypes[ext] || 'application/octet-stream';
    };

    const renderContent = () => {
        // Imagen
        if (isImage()) {
            return (
                <ScrollView
                    style={styles.imageContainer}
                    contentContainerStyle={styles.imageScrollContent}
                    maximumZoomScale={5}
                    minimumZoomScale={1}
                    showsHorizontalScrollIndicator={false}
                    showsVerticalScrollIndicator={false}
                    centerContent
                >
                    {isLoading && (
                        <View style={styles.loadingOverlay}>
                            <ActivityIndicator size="large" color="#fff" />
                        </View>
                    )}
                    {imageError ? (
                        <View style={styles.errorContainer}>
                            <Ionicons name="image-outline" size={60} color="#666" />
                            <Text style={styles.errorText}>No se pudo cargar la imagen</Text>
                            <TouchableOpacity style={styles.retryButton} onPress={() => setImageError(false)}>
                                <Text style={styles.retryText}>Reintentar</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <Image
                            source={{ uri: mediaUrl }}
                            style={styles.fullImage}
                            resizeMode="contain"
                            onLoadStart={() => setIsLoading(true)}
                            onLoadEnd={() => setIsLoading(false)}
                            onError={() => {
                                setIsLoading(false);
                                setImageError(true);
                            }}
                        />
                    )}
                </ScrollView>
            );
        }

        // PDF - usar Google Docs Viewer
        if (isPDF()) {
            const pdfViewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(mediaUrl)}&embedded=true`;
            return (
                <View style={styles.webviewContainer}>
                    <WebView
                        source={{ uri: pdfViewerUrl }}
                        style={styles.webview}
                        onLoadStart={() => setIsLoading(true)}
                        onLoadEnd={() => setIsLoading(false)}
                        javaScriptEnabled
                        domStorageEnabled
                        startInLoadingState
                        renderLoading={() => (
                            <View style={styles.webviewLoading}>
                                <ActivityIndicator size="large" color="#4A90D9" />
                                <Text style={styles.loadingText}>Cargando documento...</Text>
                            </View>
                        )}
                    />
                </View>
            );
        }

        // Otros documentos
        return (
            <View style={styles.documentContainer}>
                <View style={styles.documentIcon}>
                    <Ionicons
                        name={getDocumentIcon(getFileExtension(mediaUrl))}
                        size={80}
                        color="#4A90D9"
                    />
                </View>
                <Text style={styles.documentName} numberOfLines={2}>
                    {getFileName()}
                </Text>
                <Text style={styles.documentType}>
                    {getFileExtension(mediaUrl).toUpperCase()}
                </Text>

                <View style={styles.buttonContainer}>
                    <TouchableOpacity
                        style={[styles.downloadButton, isDownloading && styles.buttonDisabled]}
                        onPress={handleDownload}
                        disabled={isDownloading}
                    >
                        {isDownloading ? (
                            <>
                                <ActivityIndicator size="small" color="#fff" />
                                <Text style={styles.downloadButtonText}>
                                    {Math.round(downloadProgress * 100)}%
                                </Text>
                            </>
                        ) : (
                            <>
                                <Ionicons name="download-outline" size={20} color="#fff" />
                                <Text style={styles.downloadButtonText}>Descargar</Text>
                            </>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.openButton} onPress={handleOpenExternal}>
                        <Ionicons name="open-outline" size={20} color="#4A90D9" />
                        <Text style={styles.openButtonText}>Abrir en navegador</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    const getDocumentIcon = (ext: string): any => {
        switch (ext) {
            case 'pdf': return 'document-text';
            case 'doc':
            case 'docx': return 'document';
            case 'xls':
            case 'xlsx': return 'grid';
            case 'ppt':
            case 'pptx': return 'easel';
            case 'txt': return 'document-text-outline';
            case 'html': return 'globe';
            default: return 'document-attach';
        }
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
            statusBarTranslucent
        >
            <StatusBar barStyle="light-content" backgroundColor="rgba(0,0,0,0.95)" />
            <View style={styles.container}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                        <Ionicons name="close" size={28} color="#fff" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle} numberOfLines={1}>
                        {getFileName()}
                    </Text>
                    <TouchableOpacity
                        style={[styles.actionButton, isDownloading && styles.buttonDisabled]}
                        onPress={handleDownload}
                        disabled={isDownloading}
                    >
                        {isDownloading ? (
                            <ActivityIndicator size="small" color="#fff" />
                        ) : (
                            <Ionicons name="download-outline" size={24} color="#fff" />
                        )}
                    </TouchableOpacity>
                </View>

                {/* Content */}
                {renderContent()}

                {/* Download Overlay */}
                {isDownloading && (
                    <View style={styles.downloadOverlay}>
                        <View style={styles.downloadProgressContainer}>
                            <ActivityIndicator size="large" color="#4A90D9" />
                            <Text style={styles.downloadProgressText}>
                                Descargando... {Math.round(downloadProgress * 100)}%
                            </Text>
                            <View style={styles.progressBarBackground}>
                                <View style={[styles.progressBar, { width: `${downloadProgress * 100}%` }]} />
                            </View>
                        </View>
                    </View>
                )}
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.95)',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: Platform.OS === 'ios' ? 50 : 40,
        paddingBottom: 16,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
    },
    closeButton: {
        width: 44,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        flex: 1,
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
        textAlign: 'center',
        marginHorizontal: 12,
    },
    actionButton: {
        width: 44,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonDisabled: {
        opacity: 0.6,
    },
    imageContainer: {
        flex: 1,
    },
    imageScrollContent: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    fullImage: {
        width: SCREEN_WIDTH,
        height: SCREEN_HEIGHT - 150,
    },
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    errorContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
    },
    errorText: {
        color: '#999',
        fontSize: 16,
        marginTop: 16,
        textAlign: 'center',
    },
    retryButton: {
        marginTop: 20,
        paddingHorizontal: 24,
        paddingVertical: 12,
        backgroundColor: '#4A90D9',
        borderRadius: 8,
    },
    retryText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
    webviewContainer: {
        flex: 1,
        backgroundColor: '#fff',
        marginTop: 1,
    },
    webview: {
        flex: 1,
    },
    webviewLoading: {
        ...StyleSheet.absoluteFillObject,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fff',
    },
    loadingText: {
        color: '#666',
        marginTop: 12,
        fontSize: 14,
    },
    documentContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
    },
    documentIcon: {
        width: 140,
        height: 140,
        borderRadius: 70,
        backgroundColor: 'rgba(74, 144, 217, 0.15)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
    },
    documentName: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '600',
        textAlign: 'center',
        marginBottom: 8,
    },
    documentType: {
        color: '#999',
        fontSize: 14,
        marginBottom: 32,
    },
    buttonContainer: {
        gap: 12,
        width: '100%',
        maxWidth: 280,
    },
    downloadButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#4A90D9',
        paddingHorizontal: 24,
        paddingVertical: 14,
        borderRadius: 12,
        gap: 8,
    },
    downloadButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    openButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderColor: '#4A90D9',
        paddingHorizontal: 24,
        paddingVertical: 14,
        borderRadius: 12,
        gap: 8,
    },
    openButtonText: {
        color: '#4A90D9',
        fontSize: 16,
        fontWeight: '600',
    },
    downloadOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    downloadProgressContainer: {
        backgroundColor: '#1a1a1a',
        borderRadius: 16,
        padding: 32,
        alignItems: 'center',
        width: 280,
    },
    downloadProgressText: {
        color: '#fff',
        fontSize: 16,
        marginTop: 16,
        marginBottom: 12,
    },
    progressBarBackground: {
        width: '100%',
        height: 6,
        backgroundColor: '#333',
        borderRadius: 3,
        overflow: 'hidden',
    },
    progressBar: {
        height: '100%',
        backgroundColor: '#4A90D9',
        borderRadius: 3,
    },
});

export default MediaPreview;
