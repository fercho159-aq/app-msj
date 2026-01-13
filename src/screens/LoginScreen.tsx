import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    StatusBar,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
    Alert,
    Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export const LoginScreen: React.FC = () => {
    const [rfc, setRfc] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { login } = useAuth();
    const { colors, gradients, isDark } = useTheme();

    const formatRFC = (text: string) => {
        // Solo permitir letras y números, máximo 13 caracteres
        return text.toUpperCase().replace(/[^A-ZÑ&0-9]/g, '').slice(0, 13);
    };

    const handleLogin = async () => {
        if (rfc.length < 12) {
            Alert.alert('Error', 'El RFC debe tener al menos 12 caracteres');
            return;
        }

        setIsLoading(true);
        const result = await login(rfc);
        setIsLoading(false);

        if (!result.success) {
            Alert.alert('Error', result.error || 'No se pudo iniciar sesión');
        }
    };

    const isValidRFC = rfc.length >= 12;

    return (
        <View style={styles.container}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

            <LinearGradient
                colors={gradients.primary as [string, string, ...string[]]}
                style={styles.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.content}
                >
                    {/* Logo */}
                    <View style={styles.logoContainer}>
                        <Image
                            source={require('../../assets/logo.png')}
                            style={styles.logoImage}
                            resizeMode="contain"
                        />
                    </View>

                    {/* Login Form */}
                    <View style={[styles.formContainer, { backgroundColor: colors.background }]}>
                        <Text style={[styles.welcomeText, { color: colors.textPrimary }]}>Bienvenido</Text>
                        <Text style={[styles.instructionText, { color: colors.textSecondary }]}>
                            Ingresa tu RFC para comenzar
                        </Text>

                        <View style={styles.inputContainer}>
                            <View style={[styles.inputWrapper, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                                <Ionicons name="card-outline" size={22} color={colors.textMuted} />
                                <TextInput
                                    style={[styles.input, { color: colors.textPrimary }]}
                                    placeholder="RFC (Ej: GARM850101ABC)"
                                    placeholderTextColor={colors.textMuted}
                                    value={rfc}
                                    onChangeText={(text) => setRfc(formatRFC(text))}
                                    autoCapitalize="characters"
                                    autoCorrect={false}
                                    maxLength={13}
                                />
                                {rfc.length > 0 && (
                                    <TouchableOpacity onPress={() => setRfc('')}>
                                        <Ionicons name="close-circle" size={20} color={colors.textMuted} />
                                    </TouchableOpacity>
                                )}
                            </View>

                            <Text style={[styles.helperText, { color: colors.textMuted }]}>
                                {rfc.length}/13 caracteres
                            </Text>
                        </View>

                        <TouchableOpacity
                            style={[styles.loginButton, !isValidRFC && styles.loginButtonDisabled]}
                            onPress={handleLogin}
                            disabled={!isValidRFC || isLoading}
                        >
                            <LinearGradient
                                colors={isValidRFC ? gradients.primary as [string, string, ...string[]] : ['#666', '#444']}
                                style={styles.loginButtonGradient}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                            >
                                {isLoading ? (
                                    <ActivityIndicator color="#ffffff" />
                                ) : (
                                    <>
                                        <Text style={styles.loginButtonText}>Iniciar Sesión</Text>
                                        <Ionicons name="arrow-forward" size={20} color="#ffffff" />
                                    </>
                                )}
                            </LinearGradient>
                        </TouchableOpacity>

                        {/* Demo users */}
                        <View style={[styles.demoSection, { borderTopColor: colors.divider }]}>
                            <Text style={[styles.demoTitle, { color: colors.textMuted }]}>RFC de prueba:</Text>
                            <View style={styles.demoRFCContainer}>
                                {['ADMIN000CONS', 'GARM850101ABC', 'LOPC900215DEF', 'MARA880320GHI'].map((demoRfc) => (
                                    <TouchableOpacity
                                        key={demoRfc}
                                        style={[
                                            styles.demoRFCButton,
                                            { backgroundColor: colors.surface, borderColor: colors.border },
                                            demoRfc === 'ADMIN000CONS' && { backgroundColor: `${colors.primary}20`, borderColor: colors.primary }
                                        ]}
                                        onPress={() => setRfc(demoRfc)}
                                    >
                                        <Text style={[
                                            styles.demoRFCText,
                                            { color: colors.primary },
                                            demoRfc === 'ADMIN000CONS' && { fontWeight: '700', color: colors.primaryDark }
                                        ]}>
                                            {demoRfc === 'ADMIN000CONS' ? 'Consultor' : demoRfc}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    </View>

                    {/* DEBUG INFO */}
                    <Text style={{ textAlign: 'center', color: 'rgba(255,255,255,0.5)', marginTop: 20, fontSize: 10 }}>
                        API: {process.env.EXPO_PUBLIC_API_URL || 'https://appsoluciones.duckdns.org/api'}
                    </Text>
                </KeyboardAvoidingView>
            </LinearGradient>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    gradient: {
        flex: 1,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: 24,
    },
    logoContainer: {
        alignItems: 'center',
        marginBottom: 48,
    },
    logoCircle: {
        width: 120,
        height: 120,
        borderRadius: 60,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 10,
    },
    logoImage: {
        width: 220,
        height: 220,
        borderRadius: 32,
    },
    appName: {
        fontSize: 36,
        fontWeight: 'bold',
        color: '#ffffff',
        marginBottom: 8,
    },
    tagline: {
        fontSize: 16,
        color: 'rgba(255, 255, 255, 0.8)',
    },
    formContainer: {
        borderRadius: 24,
        padding: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 20,
        elevation: 10,
    },
    welcomeText: {
        fontSize: 28,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 8,
    },
    instructionText: {
        fontSize: 15,
        textAlign: 'center',
        marginBottom: 24,
    },
    inputContainer: {
        marginBottom: 20,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 16,
        paddingHorizontal: 16,
        height: 56,
        borderWidth: 1,
        gap: 12,
    },
    input: {
        flex: 1,
        fontSize: 16,
        letterSpacing: 1,
    },
    helperText: {
        fontSize: 12,
        marginTop: 8,
        marginLeft: 4,
    },
    loginButton: {
        marginBottom: 20,
    },
    loginButtonDisabled: {
        opacity: 0.7,
    },
    loginButtonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 56,
        borderRadius: 16,
        gap: 8,
    },
    loginButtonText: {
        fontSize: 17,
        fontWeight: '600',
        color: '#ffffff',
    },
    demoSection: {
        borderTopWidth: 1,
        paddingTop: 16,
    },
    demoTitle: {
        fontSize: 13,
        textAlign: 'center',
        marginBottom: 12,
    },
    demoRFCContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 8,
    },
    demoRFCButton: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        borderWidth: 1,
    },
    demoRFCText: {
        fontSize: 11,
        fontWeight: '500',
    },
});

export default LoginScreen;
