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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import * as WebBrowser from 'expo-web-browser';

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
    mediaUrl,
    mediaType,
    fileName,
    onClose,
}) => {
    const [isLoading, setIsLoading] = useState(true);
    const [imageError, setImageError] = useState(false);
    const [scale, setScale] = useState(1);

    if (!mediaUrl) return null;

    const getFileExtension = (url: string) => {
        const parts = url.split('.');
        return parts[parts.length - 1].toLowerCase();
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

    const isDocument = () => {
        const ext = getFileExtension(mediaUrl);
        return ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'html'].includes(ext);
    };

    const handleOpenExternal = async () => {
        try {
            await WebBrowser.openBrowserAsync(mediaUrl);
        } catch (error) {
            console.error('Error opening browser:', error);
        }
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

        // PDF - usar Google Docs Viewer o WebView
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

        // Otros documentos - mostrar info y botón para abrir
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
                    {fileName || mediaUrl.split('/').pop()}
                </Text>
                <Text style={styles.documentType}>
                    {getFileExtension(mediaUrl).toUpperCase()}
                </Text>
                <TouchableOpacity style={styles.openButton} onPress={handleOpenExternal}>
                    <Ionicons name="open-outline" size={20} color="#fff" />
                    <Text style={styles.openButtonText}>Abrir en navegador</Text>
                </TouchableOpacity>
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
                        {fileName || (isImage() ? 'Imagen' : 'Documento')}
                    </Text>
                    <TouchableOpacity style={styles.actionButton} onPress={handleOpenExternal}>
                        <Ionicons name="open-outline" size={24} color="#fff" />
                    </TouchableOpacity>
                </View>

                {/* Content */}
                {renderContent()}
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
    openButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#4A90D9',
        paddingHorizontal: 24,
        paddingVertical: 14,
        borderRadius: 12,
        gap: 8,
    },
    openButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
});

export default MediaPreview;
