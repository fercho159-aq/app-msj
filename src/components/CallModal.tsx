import React, { useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    Animated,
    Dimensions,
    Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useCall } from '../context/CallContext';
import { useWebRTC } from '../context/WebRTCContext';
import { useAuth } from '../context/AuthContext';
import colors from '../theme/colors';

// Importación condicional de RTCView para React Native
let RTCView: any = null;
if (Platform.OS !== 'web') {
    try {
        const webrtc = require('react-native-webrtc');
        RTCView = webrtc.RTCView;
    } catch (e) {
        console.warn('[CallModal] react-native-webrtc no está instalado');
    }
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export const CallModal: React.FC = () => {
    const { user } = useAuth();
    const {
        callState,
        acceptCall: signalingAccept,
        rejectCall: signalingReject,
        endCall: signalingEnd
    } = useCall();
    const {
        localStream,
        remoteStream,
        isConnected,
        isMuted,
        isSpeakerOn,
        isVideoEnabled,
        toggleMute,
        toggleVideo,
        toggleSpeaker,
        switchCamera,
    } = useWebRTC();

    const pulseAnim = useRef(new Animated.Value(1)).current;
    const ringAnim = useRef(new Animated.Value(0)).current;

    // Protección para evitar errores si callState no está listo
    const isVisible = callState?.isRinging || callState?.isInCall || callState?.isConnecting || false;
    const isVideoCall = callState?.callType === 'video';

    // Debug log
    console.log('[CallModal] isVisible:', isVisible, 'callState:', JSON.stringify(callState));

    // Manejar Aceptar Llamada
    const handleAcceptCall = async () => {
        console.log('[CallModal] Botón ACEPTAR presionado');
        await signalingAccept();
    };

    // Manejar Terminar Llamada
    const handleEndCall = async () => {
        console.log('[CallModal] Botón COLGAR presionado');
        signalingEnd();
    };

    // Manejar Rechazar Llamada
    const handleRejectCall = () => {
        console.log('[CallModal] Botón RECHAZAR presionado');
        signalingReject();
    };

    // Manejar cambio de cámara
    const handleSwitchCamera = async () => {
        console.log('[CallModal] Cambiar cámara');
        await switchCamera();
    };

    // Animaciones
    useEffect(() => {
        if (callState.isRinging) {
            const pulse = Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, { toValue: 1.2, duration: 500, useNativeDriver: true }),
                    Animated.timing(pulseAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
                ])
            );
            pulse.start();
            return () => pulse.stop();
        }
    }, [callState.isRinging]);

    useEffect(() => {
        if (callState.isRinging && callState.callDirection === 'incoming') {
            const ring = Animated.loop(
                Animated.timing(ringAnim, { toValue: 1, duration: 2000, useNativeDriver: true })
            );
            ring.start();
            return () => ring.stop();
        }
    }, [callState.isRinging, callState.callDirection]);

    const formatDuration = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const getStatusText = (): string => {
        if (callState.isInCall) {
            return formatDuration(callState.callDuration);
        }
        if (callState.isConnecting && callState.callDirection === 'outgoing') {
            return 'Llamando...';
        }
        if (callState.isRinging && callState.callDirection === 'incoming') {
            return `Llamada ${callState.callType === 'video' ? 'de video' : 'de voz'} entrante`;
        }
        return 'Conectando...';
    };

    const getInitials = (name: string): string => {
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    };

    // Renderizar video remoto
    const renderRemoteVideo = () => {
        if (!isVideoCall || !remoteStream) return null;

        // Para web, usar elemento video nativo
        if (Platform.OS === 'web') {
            return (
                <video
                    ref={(video) => {
                        if (video && remoteStream) {
                            video.srcObject = remoteStream;
                        }
                    }}
                    autoPlay
                    playsInline
                    style={{
                        position: 'absolute',
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                    } as any}
                />
            );
        }

        // Para React Native, usar RTCView
        if (RTCView && remoteStream) {
            return (
                <RTCView
                    streamURL={remoteStream.toURL()}
                    style={styles.remoteVideo}
                    objectFit="cover"
                    zOrder={0}
                />
            );
        }

        return null;
    };

    // Renderizar video local (PiP)
    const renderLocalVideo = () => {
        if (!isVideoCall || !localStream || !isVideoEnabled) return null;

        // Para web
        if (Platform.OS === 'web') {
            return (
                <View style={styles.localVideoContainer}>
                    <video
                        ref={(video) => {
                            if (video && localStream) {
                                video.srcObject = localStream;
                            }
                        }}
                        autoPlay
                        playsInline
                        muted
                        style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            transform: 'scaleX(-1)',
                        } as any}
                    />
                </View>
            );
        }

        // Para React Native
        if (RTCView && localStream) {
            return (
                <View style={styles.localVideoContainer}>
                    <RTCView
                        streamURL={localStream.toURL()}
                        style={styles.localVideo}
                        objectFit="cover"
                        mirror={true}
                        zOrder={1}
                    />
                </View>
            );
        }

        return null;
    };

    if (!isVisible) return null;

    return (
        <Modal
            visible={isVisible}
            animationType="fade"
            statusBarTranslucent
            transparent={false}
        >
            <View style={styles.container}>
                {/* Video remoto de fondo */}
                {isVideoCall && callState.isInCall && renderRemoteVideo()}

                {/* Gradiente de fondo (solo si no hay video o no está en llamada) */}
                {(!isVideoCall || !callState.isInCall || !remoteStream) && (
                    <LinearGradient
                        colors={['#1a1a2e', '#16213e', '#0f3460']}
                        style={StyleSheet.absoluteFillObject}
                    />
                )}

                {/* Overlay para video */}
                {isVideoCall && callState.isInCall && remoteStream && (
                    <View style={styles.videoOverlay} />
                )}

                {/* Video local PiP */}
                {callState.isInCall && renderLocalVideo()}

                {/* Contenido principal */}
                <View style={styles.content}>
                    {/* Avatar con animación (solo si no hay video) */}
                    {(!isVideoCall || !callState.isInCall) && (
                        <View style={styles.avatarContainer}>
                            {callState.isRinging && callState.callDirection === 'incoming' && (
                                <>
                                    <Animated.View
                                        style={[
                                            styles.ring,
                                            {
                                                opacity: ringAnim.interpolate({
                                                    inputRange: [0, 1],
                                                    outputRange: [0.6, 0],
                                                }),
                                                transform: [{
                                                    scale: ringAnim.interpolate({
                                                        inputRange: [0, 1],
                                                        outputRange: [1, 2]
                                                    })
                                                }],
                                            },
                                        ]}
                                    />
                                    <Animated.View
                                        style={[
                                            styles.ring,
                                            {
                                                opacity: ringAnim.interpolate({
                                                    inputRange: [0, 0.5, 1],
                                                    outputRange: [0, 0.6, 0],
                                                }),
                                                transform: [{
                                                    scale: ringAnim.interpolate({
                                                        inputRange: [0, 0.5, 1],
                                                        outputRange: [1, 1.5, 2]
                                                    })
                                                }],
                                            },
                                        ]}
                                    />
                                </>
                            )}

                            <Animated.View
                                style={[
                                    styles.avatarWrapper,
                                    { transform: [{ scale: pulseAnim }] },
                                ]}
                            >
                                <LinearGradient
                                    colors={isVideoCall ? ['#667eea', '#764ba2'] : ['#2ed573', '#17c0eb']}
                                    style={styles.avatar}
                                >
                                    <Text style={styles.avatarText}>
                                        {getInitials(callState.remoteUser?.name || '?')}
                                    </Text>
                                </LinearGradient>
                            </Animated.View>
                        </View>
                    )}

                    {/* Nombre y estado */}
                    <Text style={[
                        styles.callerName,
                        isVideoCall && callState.isInCall && styles.callerNameVideo
                    ]}>
                        {callState.remoteUser?.name || 'Usuario'}
                    </Text>
                    <Text style={[
                        styles.callStatus,
                        isVideoCall && callState.isInCall && styles.callStatusVideo
                    ]}>
                        {getStatusText()}
                    </Text>

                    {/* Tipo de llamada */}
                    {!callState.isInCall && (
                        <View style={styles.callTypeContainer}>
                            <Ionicons
                                name={isVideoCall ? 'videocam' : 'call'}
                                size={20}
                                color="rgba(255,255,255,0.6)"
                            />
                            <Text style={styles.callTypeText}>
                                {isVideoCall ? 'Videollamada' : 'Llamada de voz'}
                            </Text>
                        </View>
                    )}

                    {/* Indicador de conexión */}
                    {callState.isInCall && (
                        <View style={styles.connectionIndicator}>
                            <View style={[
                                styles.connectionDot,
                                isConnected ? styles.connectionDotConnected : styles.connectionDotConnecting
                            ]} />
                            <Text style={styles.connectionText}>
                                {isConnected ? 'Conectado' : 'Conectando...'}
                            </Text>
                        </View>
                    )}
                </View>

                {/* Botones de acción */}
                <View style={styles.actionsContainer}>
                    {callState.isRinging && callState.callDirection === 'incoming' ? (
                        <>
                            <TouchableOpacity
                                style={[styles.actionButton, styles.rejectButton]}
                                onPress={handleRejectCall}
                                activeOpacity={0.7}
                            >
                                <Ionicons name="call" size={32} color="#fff" style={styles.rotatedIcon} />
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.actionButton, styles.acceptButton]}
                                onPress={handleAcceptCall}
                                activeOpacity={0.7}
                            >
                                <Ionicons name="call" size={32} color="#fff" />
                            </TouchableOpacity>
                        </>
                    ) : (
                        <TouchableOpacity
                            style={[styles.actionButton, styles.rejectButton]}
                            onPress={handleEndCall}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="call" size={32} color="#fff" style={styles.rotatedIcon} />
                        </TouchableOpacity>
                    )}
                </View>

                {/* Controles de llamada activa */}
                {(callState.isInCall || (callState.isConnecting && callState.callDirection === 'outgoing')) && (
                    <View style={styles.callControls}>
                        <TouchableOpacity
                            style={[styles.controlButton, isMuted && styles.controlButtonActive]}
                            onPress={toggleMute}
                        >
                            <Ionicons name={isMuted ? "mic-off" : "mic"} size={24} color="#fff" />
                            <Text style={styles.controlLabel}>{isMuted ? "Activar" : "Silenciar"}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.controlButton, isSpeakerOn && styles.controlButtonActive]}
                            onPress={toggleSpeaker}
                        >
                            <Ionicons name={isSpeakerOn ? "volume-high" : "volume-medium"} size={24} color="#fff" />
                            <Text style={styles.controlLabel}>Altavoz</Text>
                        </TouchableOpacity>

                        {isVideoCall && (
                            <>
                                <TouchableOpacity
                                    style={[styles.controlButton, !isVideoEnabled && styles.controlButtonActive]}
                                    onPress={toggleVideo}
                                >
                                    <Ionicons name={isVideoEnabled ? "videocam" : "videocam-off"} size={24} color="#fff" />
                                    <Text style={styles.controlLabel}>{isVideoEnabled ? "Video" : "Sin video"}</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.controlButton}
                                    onPress={handleSwitchCamera}
                                >
                                    <Ionicons name="camera-reverse-outline" size={24} color="#fff" />
                                    <Text style={styles.controlLabel}>Cambiar</Text>
                                </TouchableOpacity>
                            </>
                        )}
                    </View>
                )}
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    content: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: Platform.OS === 'ios' ? 50 : 30,
    },
    videoOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.3)',
    },
    remoteVideo: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: SCREEN_WIDTH,
        height: SCREEN_HEIGHT,
    },
    localVideoContainer: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 60 : 40,
        right: 20,
        width: 120,
        height: 160,
        borderRadius: 12,
        overflow: 'hidden',
        backgroundColor: '#000',
        zIndex: 10,
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    localVideo: {
        width: '100%',
        height: '100%',
    },
    avatarContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 30,
    },
    ring: {
        position: 'absolute',
        width: 140,
        height: 140,
        borderRadius: 70,
        borderWidth: 3,
        borderColor: '#667eea',
    },
    avatarWrapper: {
        shadowColor: '#667eea',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
        elevation: 20,
    },
    avatar: {
        width: 140,
        height: 140,
        borderRadius: 70,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: {
        fontSize: 48,
        fontWeight: 'bold',
        color: '#fff',
    },
    callerName: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 8,
        textAlign: 'center',
    },
    callerNameVideo: {
        textShadowColor: 'rgba(0,0,0,0.75)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 4,
    },
    callStatus: {
        fontSize: 18,
        color: 'rgba(255,255,255,0.7)',
        marginBottom: 20,
    },
    callStatusVideo: {
        textShadowColor: 'rgba(0,0,0,0.75)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    },
    callTypeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 60,
    },
    callTypeText: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.6)',
    },
    connectionIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 10,
    },
    connectionDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    connectionDotConnected: {
        backgroundColor: '#2ed573',
    },
    connectionDotConnecting: {
        backgroundColor: '#ffa502',
    },
    connectionText: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.6)',
    },
    actionsContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 60,
        marginBottom: 40,
        paddingHorizontal: 20,
    },
    actionButton: {
        width: 80,
        height: 80,
        borderRadius: 40,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 10,
    },
    acceptButton: {
        backgroundColor: '#2ed573',
    },
    rejectButton: {
        backgroundColor: '#ff4757',
    },
    rotatedIcon: {
        transform: [{ rotate: '135deg' }],
    },
    callControls: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 30,
        paddingHorizontal: 20,
        paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    },
    controlButton: {
        alignItems: 'center',
        padding: 12,
        borderRadius: 12,
        minWidth: 70,
    },
    controlButtonActive: {
        backgroundColor: 'rgba(255,255,255,0.2)',
    },
    controlLabel: {
        fontSize: 11,
        color: 'rgba(255,255,255,0.7)',
        marginTop: 6,
    },
});

export default CallModal;
