import React, { useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    StatusBar,
    Image,
    ActivityIndicator,
    Alert,
    TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export const LoginScreen: React.FC = () => {
    const { login } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const [selectedRole, setSelectedRole] = useState<string | null>(null);
    const [advisorName, setAdvisorName] = useState('');
    const [advisorPhone, setAdvisorPhone] = useState('');
    const [advisorPassword, setAdvisorPassword] = useState('');
    const [clientRfc, setClientRfc] = useState('');
    const [viewMode, setViewMode] = useState<'ROLE_SELECTION' | 'CONSULTANT_LOGIN' | 'ADVISOR_LOGIN'>('ROLE_SELECTION');
    const [isRegistering, setIsRegistering] = useState(false); // Default to Login (simpler form)
    const [consultantName, setConsultantName] = useState('');
    const [consultantPassword, setConsultantPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const performLogin = async (rfc: string) => {
        try {
            const result = await login(rfc);
            if (!result.success) {
                Alert.alert('Error', result.error || 'No se pudo iniciar sesión');
                setIsLoading(false);
                setSelectedRole(null);
            }
        } catch (error) {
            console.error(error);
            setIsLoading(false);
            setSelectedRole(null);
            Alert.alert('Error', 'Ocurrió un error inesperado');
        }
    };

    const performAdvisorLogin = async () => {
        if (isRegistering) {
            // Register Validation
            if (!advisorName || !advisorPhone || !advisorPassword || !clientRfc) {
                Alert.alert('Error', 'Todos los campos son obligatorios para registrarse');
                return;
            }
        } else {
            // Login Validation
            if (!advisorName || !advisorPassword) {
                Alert.alert('Error', 'Nombre y contraseña son requeridos');
                return;
            }
        }
        return executeAdvisorAuth();
    };

    const executeAdvisorAuth = async () => {
        setIsLoading(true);
        try {
            // Updated to use Context Login with extra data
            // Use the REAL RFC (clientRfc) provided by the user as the main identifier
            const rfcToUse = clientRfc.trim() || `ADV${advisorPhone.replace(/\D/g, '').substring(0, 10)}`;

            const result = await login(rfcToUse, {
                role: 'advisor',
                name: advisorName,
                phone: advisorPhone.trim(),
                password: advisorPassword,
                clientRfc: clientRfc.trim(), // Send it in body too just in case
            });

            if (!result.success) {
                Alert.alert('Error', result.error || 'No se pudo iniciar sesión');
                setIsLoading(false);
            }
            // Success is handled by context state update (redirect usually follows)

        } catch (error) {
            console.error(error);
            setIsLoading(false);
            Alert.alert('Error', 'Error de conexión');
        }
    };

    const handleRoleLogin = async (role: string, rfc: string) => {
        if (isLoading) return;

        if (role === 'consultant') {
            setViewMode('CONSULTANT_LOGIN');
            setConsultantName('');
            setConsultantPassword('');
            return;
        }

        if (role === 'advisor') {
            setViewMode('ADVISOR_LOGIN');
            setAdvisorName('');
            setAdvisorPhone('');
            setAdvisorPassword('');
            setClientRfc('');
            return;
        }

        setIsLoading(true);
        setSelectedRole(role);
        performLogin(rfc);
    };

    // ... (rest of code) ...

    if (viewMode === 'ADVISOR_LOGIN') {
        return (
            <View style={styles.container}>
                <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
                <View style={styles.content}>
                    <View style={styles.logoContainer}>
                        <Image
                            source={require('../../assets/logo.png')}
                            style={styles.logo}
                            resizeMode="contain"
                        />
                    </View>

                    <Text style={styles.welcomeText}>{isRegistering ? 'Registro Asesor' : 'Bienvenido'}</Text>

                    <View style={styles.formSection}>
                        <Text style={styles.label}>Nombre</Text>
                        <TextInput
                            style={styles.input}
                            value={advisorName}
                            onChangeText={setAdvisorName}
                            placeholder={isRegistering ? "Juan Carlos Avila" : "Ingrese su nombre"}
                            placeholderTextColor="#A0AEC0"
                        />

                        {isRegistering && (
                            <>
                                <Text style={styles.label}>Telefono</Text>
                                <TextInput
                                    style={styles.input}
                                    value={advisorPhone}
                                    onChangeText={setAdvisorPhone}
                                    placeholder="55 5393 2100"
                                    placeholderTextColor="#A0AEC0"
                                    keyboardType="phone-pad"
                                />
                            </>
                        )}

                        <Text style={styles.label}>Contraseña CAT</Text>
                        <View style={styles.passwordContainer}>
                            <TextInput
                                style={styles.passwordInput}
                                value={advisorPassword}
                                onChangeText={setAdvisorPassword}
                                secureTextEntry={!showPassword}
                                placeholder="@JAE17"
                                placeholderTextColor="#A0AEC0"
                            />
                            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                                <Ionicons name={showPassword ? "eye-off-outline" : "lock-closed"} size={20} color="#697CA3" />
                            </TouchableOpacity>
                        </View>

                        {isRegistering && (
                            <>
                                <Text style={styles.label}>Ingrese RFC Cliente</Text>
                                <View style={styles.passwordContainer}>
                                    <TextInput
                                        style={styles.passwordInput}
                                        value={clientRfc}
                                        onChangeText={setClientRfc}
                                        placeholder="YAA731015LE9"
                                        placeholderTextColor="#A0AEC0"
                                        autoCapitalize="characters"
                                    />
                                </View>
                            </>
                        )}

                        <TouchableOpacity
                            style={styles.loginButton}
                            onPress={performAdvisorLogin}
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <ActivityIndicator color="#FFFFFF" />
                            ) : (
                                <Text style={styles.loginButtonText}>
                                    {isRegistering ? 'REGISTRARSE' : 'INICIAR SESIÓN'}
                                </Text>
                            )}
                        </TouchableOpacity>

                        {/* Toggle Login/Register */}
                        <TouchableOpacity
                            style={{ marginTop: 20, alignItems: 'center' }}
                            onPress={() => setIsRegistering(!isRegistering)}
                        >
                            <Text style={{ color: '#5474BC', fontWeight: 'bold' }}>
                                {isRegistering ? '¿Ya tienes cuenta? Inicia Sesión' : '¿No tienes cuenta? Regístrate'}
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={{ marginTop: 20, alignItems: 'center' }}
                            onPress={() => setViewMode('ROLE_SELECTION')}
                        >
                            <Text style={{ color: '#697CA3' }}>Volver</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        );
    }


    const handleConsultantSubmit = () => {
        if (!consultantName || !consultantPassword) {
            Alert.alert('Error', 'Por favor ingresa nombre y contraseña');
            return;
        }
        setIsLoading(true);
        performLogin('ADMIN000CONS');
    };

    const RoleButton = ({ title, icon, rfc, roleId }: { title: string, icon: any, rfc: string, roleId: string }) => (
        <TouchableOpacity
            style={styles.roleButton}
            onPress={() => handleRoleLogin(roleId, rfc)}
            disabled={isLoading}
            activeOpacity={0.7}
        >
            <View style={styles.iconContainer}>
                <Ionicons name={icon} size={20} color="#697CA3" />
            </View>
            <Text style={styles.roleButtonText}>{title}</Text>
            {isLoading && selectedRole === roleId && (
                <View style={styles.loaderContainer}>
                    <ActivityIndicator size="small" color="#697CA3" />
                </View>
            )}
        </TouchableOpacity>
    );

    if (viewMode === 'CONSULTANT_LOGIN') {
        return (
            <View style={styles.container}>
                <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
                <View style={styles.content}>
                    <View style={styles.logoContainer}>
                        <Image
                            source={require('../../assets/logo.png')}
                            style={styles.logo}
                            resizeMode="contain"
                        />
                    </View>

                    {/* Title */}
                    <Text style={styles.welcomeText}>Bienvenido</Text>

                    {/* Form Section */}
                    <View style={styles.formSection}>
                        <Text style={styles.label}>Nombre</Text>
                        <TextInput
                            style={styles.input}
                            value={consultantName}
                            onChangeText={setConsultantName}
                            placeholder="Ingrese nombre"
                            placeholderTextColor="#A0AEC0"
                        />

                        <Text style={styles.label}>Contraseña</Text>
                        <View style={styles.passwordContainer}>
                            <TextInput
                                style={styles.passwordInput}
                                value={consultantPassword}
                                onChangeText={setConsultantPassword}
                                secureTextEntry={!showPassword}
                                placeholder="Ingrese contraseña"
                                placeholderTextColor="#A0AEC0"
                            />
                            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                                <Ionicons name={showPassword ? "eye-off-outline" : "lock-closed"} size={20} color="#697CA3" />
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity
                            style={styles.loginButton}
                            onPress={handleConsultantSubmit}
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <ActivityIndicator color="#FFFFFF" />
                            ) : (
                                <Text style={styles.loginButtonText}>INICIAR SESIÓN</Text>
                            )}
                        </TouchableOpacity>

                        {/* Optional Back Button */}
                        <TouchableOpacity
                            style={{ marginTop: 20, alignItems: 'center' }}
                            onPress={() => setViewMode('ROLE_SELECTION')}
                        >
                            <Text style={{ color: '#697CA3' }}>Volver</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

            <View style={styles.content}>
                {/* Logo Section */}
                <View style={styles.logoContainer}>
                    <Image
                        source={require('../../assets/logo.png')}
                        style={styles.logo}
                        resizeMode="contain"
                    />
                </View>

                {/* Title */}
                <Text style={styles.welcomeText}>Bienvenido</Text>

                {/* Buttons Section */}
                <View style={styles.buttonsContainer}>
                    <RoleButton
                        title="USUARIO"
                        icon="person"
                        rfc="GARM850101ABC"
                        roleId="user"
                    />
                    <RoleButton
                        title="ASESOR"
                        icon="qr-code-outline"
                        rfc="LOPC900215DEF"
                        roleId="advisor"
                    />
                    <RoleButton
                        title="CONSULTOR"
                        icon="lock-closed"
                        rfc="ADMIN000CONS"
                        roleId="consultant"
                    />
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FCFCFC', // Very light off-white/cream
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: 40,
        paddingBottom: 40,
    },
    logoContainer: {
        alignItems: 'center',
        marginBottom: 20,
    },
    logo: {
        width: 120,
        height: 120,
        // tintColor removed to show original logo colors
    },
    welcomeText: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#1A2138', // Dark blue-ish text
        textAlign: 'center',
        marginBottom: 30,
        letterSpacing: 0.5,
    },
    buttonsContainer: {
        gap: 20,
        width: '100%',
    },
    roleButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        height: 60,
        borderRadius: 16,
        paddingHorizontal: 20,
        // Soft Shadow
        shadowColor: '#697CA3',
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 3,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    iconContainer: {
        width: 30,
        alignItems: 'center',
    },
    roleButtonText: {
        flex: 1,
        textAlign: 'center',
        fontSize: 14,
        fontWeight: '600',
        color: '#697CA3', // Blue-ish grey
        letterSpacing: 0.5,
        marginRight: 30, // Balance the icon width to center text visually
    },
    loaderContainer: {
        position: 'absolute',
        right: 20,
    },
    // Consultant Form Styles
    formSection: {
        width: '100%',
        marginTop: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#5C6B89',
        marginBottom: 8,
        marginTop: 16,
    },
    input: {
        width: '100%',
        height: 50,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 12,
        paddingHorizontal: 16,
        fontSize: 16,
        color: '#1A2138',
        backgroundColor: '#FFFFFF',
    },
    passwordContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        width: '100%',
        height: 50,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 12,
        paddingHorizontal: 16,
        backgroundColor: '#FFFFFF',
    },
    passwordInput: {
        flex: 1,
        fontSize: 16,
        color: '#1A2138',
    },
    loginButton: {
        width: '100%',
        height: 56,
        backgroundColor: '#5474BC', // Matching the blue in screenshot
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 40,
        shadowColor: '#5474BC',
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    loginButtonText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#FFFFFF',
        letterSpacing: 0.5,
    },
});

export default LoginScreen;
