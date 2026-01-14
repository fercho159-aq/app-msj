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
import { useAgoraCall } from '../context/AgoraCallContext';
import { useAuth } from '../context/AuthContext';
import colors from '../theme/colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const CallModal: React.FC = () => {
    const { user } = useAuth();
    const { callState, acceptCall: signalingAccept, rejectCall: signalingReject, endCall: signalingEnd } = useCall();
    const { joinCall: agoraJoin, endCall: agoraEnd, toggleMute, toggleSpeaker, isMuted, isSpeakerOn, isConnected } = useAgoraCall();

    const pulseAnim = useRef(new Animated.Value(1)).current;
    const ringAnim = useRef(new Animated.Value(0)).current;

    const isVisible = callState.isRinging || callState.isInCall || callState.isConnecting;

    // Manejar Aceptar Llamada
    const handleAcceptCall = async () => {
        console.log('🟢 Botón ACEPTAR presionado');

        // Obtener el canal de Agora del estado de la llamada
        const channel = callState.agoraChannel;
        console.log('📞 Canal de Agora recibido:', channel);

        // Aceptamos la señalización
        signalingAccept();

        // Unirse al canal de media
        if (channel) {
            console.log('📞 Uniéndose al canal de Agora:', channel);
            await agoraJoin(channel);
        } else {
            console.error('❌ No se pudo determinar el nombre del canal - agoraChannel es null');
        }
    };

    // Manejar Terminar Llamada
    const handleEndCall = async () => {
        console.log('🔴 Botón COLGAR presionado');
        // Terminar media
        await agoraEnd();
        // Terminar señalización
        signalingEnd();
    };

    // Manejar Rechazar Llamada
    const handleRejectCall = () => {
        console.log('🔴 Botón RECHAZAR presionado');
        signalingReject();
    };

    // Efecto para auto-unirse si somos quien llama (outgoing) y pasa a estado isInCall
    // Ojo: CallContext startCall pone isInCall=false, isConnecting=true.
    // Cuando el otro contesta, CallContext pone isInCall=true.
    useEffect(() => {
        if (callState.isInCall && !isConnected) {
            const channel = callState.agoraChannel;
            if (channel) {
                // Si somos nosotros los que iniciamos, o si acabamos de aceptar
                // (Aunque handleAcceptCall ya llama a join, esto es backup o para el iniciador)
                // El iniciador debe unirse cuando inicia? O cuando el otro contesta?
                // Normalmente el iniciador se une al crear la llamada.
                // Reviemos lógica de CallContext. startCall no une.
                // Debemos unirnos si isConnecting también?
            }
        }
    }, [callState.isInCall, isConnected, callState.agoraChannel]);

    // Efecto para unirse al iniciar llamada (outgoing)
    useEffect(() => {
        if (callState.isConnecting && callState.callDirection === 'outgoing' && !isConnected) {
            const channel = callState.agoraChannel;
            if (channel) {
                console.log('📞 Iniciando canal Agora (outgoing):', channel);
                agoraJoin(channel);
            }
        }
    }, [callState.isConnecting, callState.callDirection, isConnected, callState.agoraChannel]);


    // Animations (igual que antes)
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

    if (!isVisible) return null;

    return (
        <Modal
            visible={isVisible}
            animationType="fade"
            statusBarTranslucent
            transparent={false}
        >
            <LinearGradient
                colors={['#1a1a2e', '#16213e', '#0f3460']}
                style={styles.container}
            >
                {/* Avatar con animación */}
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
                                        transform: [{ scale: ringAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 2] }) }],
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
                                        transform: [{ scale: ringAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 1.5, 2] }) }],
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
                            colors={callState.callType === 'video' ? ['#667eea', '#764ba2'] : ['#2ed573', '#17c0eb']}
                            style={styles.avatar}
                        >
                            <Text style={styles.avatarText}>
                                {getInitials(callState.remoteUser?.name || '?')}
                            </Text>
                        </LinearGradient>
                    </Animated.View>
                </View>

                {/* Nombre y estado */}
                <Text style={styles.callerName}>
                    {callState.remoteUser?.name || 'Usuario'}
                </Text>
                <Text style={styles.callStatus}>{getStatusText()}</Text>

                {/* Tipo de llamada */}
                <View style={styles.callTypeContainer}>
                    <Ionicons
                        name={callState.callType === 'video' ? 'videocam' : 'call'}
                        size={20}
                        color="rgba(255,255,255,0.6)"
                    />
                    <Text style={styles.callTypeText}>
                        {callState.callType === 'video' ? 'Videollamada' : 'Llamada de voz'}
                    </Text>
                </View>

                {/* Botones de acción (Aceptar/Rechazar/Colgar) */}
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

                {/* Controles de llamada activa (Mute/Speaker) */}
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

                        {callState.callType === 'video' && (
                            <TouchableOpacity style={styles.controlButton}>
                                <Ionicons name="camera-reverse-outline" size={24} color="#fff" />
                                <Text style={styles.controlLabel}>Cambiar</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                )}
            </LinearGradient>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: Platform.OS === 'ios' ? 50 : 30,
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
    callStatus: {
        fontSize: 18,
        color: 'rgba(255,255,255,0.7)',
        marginBottom: 20,
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
    actionsContainer: {
        flexDirection: 'row',
        gap: 60,
        marginBottom: 40,
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
        gap: 40,
        paddingHorizontal: 40,
    },
    controlButton: {
        alignItems: 'center',
        padding: 12,
        borderRadius: 12, // Added visual touch
    },
    controlButtonActive: {
        backgroundColor: 'rgba(255,255,255,0.2)',
    },
    controlLabel: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.7)',
        marginTop: 6,
    },
});

export default CallModal;
