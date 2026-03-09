import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    Animated,
    Platform,
    KeyboardAvoidingView,
    useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../context/ThemeContext';
import { api } from '../../api/client';
import type { AiChatMessage } from '../../types';

export const AiChatPanel: React.FC = () => {
    const { colors, isDark } = useTheme();
    const { width: screenWidth } = useWindowDimensions();
    const isMobile = screenWidth < 768;
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<AiChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const slideAnim = useRef(new Animated.Value(0)).current;
    const scrollRef = useRef<ScrollView>(null);
    const pulseAnim = useRef(new Animated.Value(1)).current;

    // Pulse animation for the FAB
    useEffect(() => {
        if (!isOpen && messages.length === 0) {
            const pulse = Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, { toValue: 1.08, duration: 1200, useNativeDriver: true }),
                    Animated.timing(pulseAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
                ])
            );
            pulse.start();
            return () => pulse.stop();
        }
    }, [isOpen, messages.length]);

    const togglePanel = () => {
        const toValue = isOpen ? 0 : 1;
        Animated.spring(slideAnim, {
            toValue,
            useNativeDriver: false,
            tension: 65,
            friction: 11,
        }).start();
        setIsOpen(!isOpen);
    };

    const sendMessage = async () => {
        const text = input.trim();
        if (!text || isLoading) return;

        const newMessages: AiChatMessage[] = [...messages, { role: 'user', content: text }];
        setMessages(newMessages);
        setInput('');
        setIsLoading(true);

        setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);

        try {
            const result = await api.sendAiChat(newMessages);
            if (result.data?.reply) {
                setMessages([...newMessages, { role: 'assistant', content: result.data.reply }]);
            } else {
                setMessages([
                    ...newMessages,
                    { role: 'assistant', content: result.error || 'Error al obtener respuesta.' },
                ]);
            }
        } catch (error) {
            setMessages([
                ...newMessages,
                { role: 'assistant', content: 'Error de conexion. Intenta de nuevo.' },
            ]);
        } finally {
            setIsLoading(false);
            setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
        }
    };

    const clearChat = () => {
        setMessages([]);
    };

    const panelHeight = slideAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, isMobile ? 420 : 520],
    });

    const panelOpacity = slideAnim.interpolate({
        inputRange: [0, 0.3, 1],
        outputRange: [0, 0.5, 1],
    });

    const suggestions = [
        'Cuantos usuarios hay registrados?',
        'Quien ha compartido mas documentos?',
        'Cuantos reportes estan pendientes?',
        'Dame un resumen de actividad',
    ];

    return (
        <View style={[styles.wrapper, isMobile && styles.wrapperMobile]} pointerEvents="box-none">
            {/* Chat Panel */}
            <Animated.View
                style={[
                    styles.panel,
                    {
                        height: panelHeight,
                        opacity: panelOpacity,
                        backgroundColor: isDark ? '#111113' : '#FFFFFF',
                        borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
                    },
                    isMobile && styles.panelMobile,
                ]}
            >
                {/* Panel Header */}
                <LinearGradient
                    colors={isDark ? ['#1a1a2e', '#16213e'] as [string, string] : ['#5C76B2', '#7A93C8'] as [string, string]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.panelHeader}
                >
                    <View style={styles.panelHeaderLeft}>
                        <View style={styles.aiBadge}>
                            <Ionicons name="sparkles" size={14} color="#FCD34D" />
                        </View>
                        <View>
                            <Text style={styles.panelTitle}>Asistente IA</Text>
                            <Text style={styles.panelSubtitle}>Analisis de plataforma</Text>
                        </View>
                    </View>
                    <View style={styles.panelHeaderRight}>
                        {messages.length > 0 && (
                            <TouchableOpacity onPress={clearChat} style={styles.clearBtn}>
                                <Ionicons name="trash-outline" size={16} color="rgba(255,255,255,0.7)" />
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity onPress={togglePanel} style={styles.closeBtn}>
                            <Ionicons name="chevron-down" size={18} color="rgba(255,255,255,0.9)" />
                        </TouchableOpacity>
                    </View>
                </LinearGradient>

                {/* Messages Area */}
                <ScrollView
                    ref={scrollRef}
                    style={styles.messagesArea}
                    contentContainerStyle={styles.messagesContent}
                    showsVerticalScrollIndicator={false}
                >
                    {messages.length === 0 ? (
                        <View style={styles.emptyState}>
                            <View style={[styles.emptyIcon, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(92,118,178,0.08)' }]}>
                                <Ionicons name="chatbubbles-outline" size={28} color={isDark ? '#97B1DE' : '#5C76B2'} />
                            </View>
                            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                                Pregunta sobre tu plataforma
                            </Text>
                            <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
                                Puedo analizar usuarios, mensajes, documentos y mas.
                            </Text>
                            <View style={styles.suggestions}>
                                {suggestions.map((s, i) => (
                                    <TouchableOpacity
                                        key={i}
                                        style={[
                                            styles.suggestionChip,
                                            {
                                                backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(92,118,178,0.06)',
                                                borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(92,118,178,0.15)',
                                            },
                                        ]}
                                        onPress={() => {
                                            setInput(s);
                                        }}
                                    >
                                        <Ionicons name="arrow-forward-circle-outline" size={14} color={isDark ? '#97B1DE' : '#5C76B2'} />
                                        <Text style={[styles.suggestionText, { color: isDark ? '#97B1DE' : '#5C76B2' }]}>{s}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    ) : (
                        messages.map((msg, index) => (
                            <View
                                key={index}
                                style={[
                                    styles.messageBubble,
                                    msg.role === 'user' ? styles.userBubble : styles.assistantBubble,
                                    msg.role === 'user'
                                        ? { backgroundColor: '#5C76B2' }
                                        : { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)' },
                                ]}
                            >
                                {msg.role === 'assistant' && (
                                    <View style={styles.assistantLabel}>
                                        <Ionicons name="sparkles" size={10} color={isDark ? '#FCD34D' : '#F59E0B'} />
                                        <Text style={[styles.assistantLabelText, { color: colors.textMuted }]}>IA</Text>
                                    </View>
                                )}
                                <Text
                                    style={[
                                        styles.messageText,
                                        msg.role === 'user'
                                            ? { color: '#FFFFFF' }
                                            : { color: colors.textPrimary },
                                    ]}
                                    selectable
                                >
                                    {msg.content}
                                </Text>
                            </View>
                        ))
                    )}

                    {isLoading && (
                        <View style={[styles.messageBubble, styles.assistantBubble, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)' }]}>
                            <View style={styles.typingIndicator}>
                                <View style={[styles.typingDot, { backgroundColor: colors.textMuted }]} />
                                <View style={[styles.typingDot, styles.typingDot2, { backgroundColor: colors.textMuted }]} />
                                <View style={[styles.typingDot, styles.typingDot3, { backgroundColor: colors.textMuted }]} />
                            </View>
                        </View>
                    )}
                </ScrollView>

                {/* Input Area */}
                <View style={[styles.inputArea, { borderTopColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]}>
                    <TextInput
                        style={[
                            styles.input,
                            {
                                color: colors.textPrimary,
                                backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                                borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                            },
                        ]}
                        placeholder="Escribe tu pregunta..."
                        placeholderTextColor={colors.textMuted}
                        value={input}
                        onChangeText={setInput}
                        onSubmitEditing={sendMessage}
                        editable={!isLoading}
                        multiline
                    />
                    <TouchableOpacity
                        onPress={sendMessage}
                        disabled={!input.trim() || isLoading}
                        style={[
                            styles.sendBtn,
                            (!input.trim() || isLoading) && { opacity: 0.4 },
                        ]}
                    >
                        <LinearGradient
                            colors={['#5C76B2', '#7A93C8'] as [string, string]}
                            style={styles.sendBtnGradient}
                        >
                            {isLoading ? (
                                <ActivityIndicator size="small" color="#FFFFFF" />
                            ) : (
                                <Ionicons name="send" size={16} color="#FFFFFF" />
                            )}
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            </Animated.View>

            {/* Floating Action Button */}
            <Animated.View style={{ transform: [{ scale: isOpen ? 1 : pulseAnim }] }}>
                <TouchableOpacity onPress={togglePanel} activeOpacity={0.85}>
                    <LinearGradient
                        colors={isOpen ? ['#64748B', '#94A3B8'] as [string, string] : ['#5C76B2', '#97B1DE'] as [string, string]}
                        style={styles.fab}
                    >
                        <Ionicons
                            name={isOpen ? 'close' : 'sparkles'}
                            size={24}
                            color="#FFFFFF"
                        />
                    </LinearGradient>
                </TouchableOpacity>
            </Animated.View>
        </View>
    );
};

const styles = StyleSheet.create({
    wrapper: {
        position: 'absolute',
        bottom: 24,
        right: 24,
        alignItems: 'flex-end',
        zIndex: 1000,
    },
    wrapperMobile: {
        bottom: 16,
        right: 12,
        left: 12,
    },
    fab: {
        width: 56,
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
        ...(Platform.OS === 'web' ? {
            // @ts-ignore
            boxShadow: '0 4px 20px rgba(92,118,178,0.35)',
            cursor: 'pointer',
        } : {
            elevation: 8,
        }),
    },
    panel: {
        width: 400,
        borderRadius: 16,
        borderWidth: 1,
        marginBottom: 12,
        overflow: 'hidden',
        ...(Platform.OS === 'web' ? {
            // @ts-ignore
            boxShadow: '0 12px 48px rgba(0,0,0,0.2)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
        } : {
            elevation: 12,
        }),
    },
    panelMobile: {
        width: '100%',
    },
    panelHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 14,
    },
    panelHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    aiBadge: {
        width: 32,
        height: 32,
        borderRadius: 10,
        backgroundColor: 'rgba(255,255,255,0.15)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    panelTitle: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '700',
    },
    panelSubtitle: {
        color: 'rgba(255,255,255,0.65)',
        fontSize: 11,
        fontWeight: '500',
    },
    panelHeaderRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    clearBtn: {
        width: 30,
        height: 30,
        borderRadius: 8,
        backgroundColor: 'rgba(255,255,255,0.1)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    closeBtn: {
        width: 30,
        height: 30,
        borderRadius: 8,
        backgroundColor: 'rgba(255,255,255,0.1)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    messagesArea: {
        flex: 1,
    },
    messagesContent: {
        padding: 14,
        paddingBottom: 8,
    },
    emptyState: {
        alignItems: 'center',
        paddingTop: 20,
        paddingHorizontal: 16,
    },
    emptyIcon: {
        width: 52,
        height: 52,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    emptyTitle: {
        fontSize: 15,
        fontWeight: '700',
        marginBottom: 4,
    },
    emptySubtitle: {
        fontSize: 12,
        textAlign: 'center',
        marginBottom: 16,
        fontWeight: '500',
    },
    suggestions: {
        width: '100%',
        gap: 8,
    },
    suggestionChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderRadius: 10,
        borderWidth: 1,
        ...(Platform.OS === 'web' ? {
            // @ts-ignore
            cursor: 'pointer',
            transition: 'background-color 0.15s ease',
        } : {}),
    },
    suggestionText: {
        fontSize: 12,
        fontWeight: '600',
        flex: 1,
    },
    messageBubble: {
        maxWidth: '85%',
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 14,
        marginBottom: 8,
    },
    userBubble: {
        alignSelf: 'flex-end',
        borderBottomRightRadius: 4,
    },
    assistantBubble: {
        alignSelf: 'flex-start',
        borderBottomLeftRadius: 4,
    },
    assistantLabel: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginBottom: 4,
    },
    assistantLabelText: {
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    messageText: {
        fontSize: 13,
        lineHeight: 19,
        fontWeight: '500',
    },
    typingIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingVertical: 4,
        paddingHorizontal: 4,
    },
    typingDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        opacity: 0.4,
    },
    typingDot2: {
        opacity: 0.6,
    },
    typingDot3: {
        opacity: 0.8,
    },
    inputArea: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: 8,
        padding: 12,
        borderTopWidth: 1,
    },
    input: {
        flex: 1,
        fontSize: 13,
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 12,
        borderWidth: 1,
        maxHeight: 80,
        fontWeight: '500',
    },
    sendBtn: {
        borderRadius: 12,
        overflow: 'hidden',
    },
    sendBtnGradient: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 12,
    },
});
