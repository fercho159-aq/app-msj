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
import { useStreamCall } from '../context/StreamCallContext';
import { useTheme } from '../context/ThemeContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const StreamCallModal: React.FC = () => {
    const { colors } = useTheme();
    const {
        isInCall,
        currentCall,
        isMuted,
        isSpeakerOn,
        callDuration,
        endCall,
        toggleMute,
        toggleSpeaker,
    } = useStreamCall();

    const pulseAnim = useRef(new Animated.Value(1)).current;

    // Animación de pulso durante la llamada
    useEffect(() => {
        if (isInCall) {
            const pulse = Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, {
                        toValue: 1.1,
                        duration: 1000,
                        useNativeDriver: true,
                    }),
                    Animated.timing(pulseAnim, {
                        toValue: 1,
                        duration: 1000,
                        useNativeDriver: true,
                    }),
                ])
            );
            pulse.start();
            return () => pulse.stop();
        }
    }, [isInCall]);

    const formatDuration = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const getCallerName = (): string => {
        // Obtener el nombre del otro participante de los metadatos de la llamada
        try {
            const customData = currentCall?.state?.custom as { targetName?: string; callerName?: string } | undefined;
            return customData?.targetName || customData?.callerName || 'Llamada en curso';
        } catch {
            return 'Llamada en curso';
        }
    };

    const getInitials = (name: string): string => {
        return name
            .split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    if (!isInCall) return null;

    return (
        <Modal
            visible={isInCall}
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
                    <Animated.View
                        style={[
                            styles.avatarWrapper,
                            { transform: [{ scale: pulseAnim }] },
                        ]}
                    >
                        <LinearGradient
                            colors={['#2ed573', '#17c0eb']}
                            style={styles.avatar}
                        >
                            <Text style={styles.avatarText}>
                                {getInitials(getCallerName())}
                            </Text>
                        </LinearGradient>
                    </Animated.View>
                </View>

                {/* Nombre y duración */}
                <Text style={styles.callerName}>{getCallerName()}</Text>
                <Text style={styles.callDuration}>{formatDuration(callDuration)}</Text>

                {/* Tipo de llamada */}
                <View style={styles.callTypeContainer}>
                    <Ionicons name="call" size={20} color="rgba(255,255,255,0.6)" />
                    <Text style={styles.callTypeText}>Llamada de voz</Text>
                </View>

                {/* Controles de llamada */}
                <View style={styles.controlsContainer}>
                    {/* Mute */}
                    <TouchableOpacity
                        style={[styles.controlButton, isMuted && styles.controlButtonActive]}
                        onPress={toggleMute}
                    >
                        <Ionicons
                            name={isMuted ? 'mic-off' : 'mic'}
                            size={28}
                            color="#fff"
                        />
                        <Text style={styles.controlLabel}>
                            {isMuted ? 'Activar' : 'Silenciar'}
                        </Text>
                    </TouchableOpacity>

                    {/* Speaker */}
                    <TouchableOpacity
                        style={[styles.controlButton, isSpeakerOn && styles.controlButtonActive]}
                        onPress={toggleSpeaker}
                    >
                        <Ionicons
                            name={isSpeakerOn ? 'volume-high' : 'volume-medium'}
                            size={28}
                            color="#fff"
                        />
                        <Text style={styles.controlLabel}>Altavoz</Text>
                    </TouchableOpacity>
                </View>

                {/* Botón de colgar */}
                <TouchableOpacity
                    style={styles.endCallButton}
                    onPress={endCall}
                    activeOpacity={0.7}
                >
                    <Ionicons name="call" size={32} color="#fff" style={styles.rotatedIcon} />
                </TouchableOpacity>
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
    avatarWrapper: {
        shadowColor: '#2ed573',
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
        fontSize: 28,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 8,
        textAlign: 'center',
    },
    callDuration: {
        fontSize: 24,
        color: '#2ed573',
        fontWeight: '600',
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
    controlsContainer: {
        flexDirection: 'row',
        gap: 50,
        marginBottom: 50,
    },
    controlButton: {
        alignItems: 'center',
        padding: 16,
        borderRadius: 16,
        backgroundColor: 'rgba(255,255,255,0.1)',
        minWidth: 80,
    },
    controlButtonActive: {
        backgroundColor: 'rgba(255,255,255,0.3)',
    },
    controlLabel: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.8)',
        marginTop: 8,
    },
    endCallButton: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#ff4757',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#ff4757',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.5,
        shadowRadius: 15,
        elevation: 10,
    },
    rotatedIcon: {
        transform: [{ rotate: '135deg' }],
    },
});

export default StreamCallModal;
