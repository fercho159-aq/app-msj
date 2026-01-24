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
    ScrollView,
    Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';

type ViewMode = 'ROLE_SELECTION' | 'USER_RFC' | 'USER_TERMS' | 'USER_REGISTER' | 'USER_LOGIN' | 'CONSULTANT_LOGIN' | 'ADVISOR_LOGIN';

interface FiscalData {
    rfc: string;
    razonSocial: string;
    tipoPersona: 'fisica' | 'moral';
}

export const LoginScreen: React.FC = () => {
    const { login } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const [selectedRole] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<ViewMode>('ROLE_SELECTION');

    // User registration states
    const [userRfc, setUserRfc] = useState('');
    const [userPhone, setUserPhone] = useState('');
    const [userPassword, setUserPassword] = useState('');
    const [userConfirmPassword, setUserConfirmPassword] = useState('');
    const [fiscalData, setFiscalData] = useState<FiscalData | null>(null);
    const [termsAccepted, setTermsAccepted] = useState(false);
    const [showTermsModal, setShowTermsModal] = useState(false);

    // Advisor states
    const [advisorName, setAdvisorName] = useState('');
    const [advisorPhone, setAdvisorPhone] = useState('');
    const [advisorPassword, setAdvisorPassword] = useState('');
    const [clientRfc, setClientRfc] = useState('');
    const [isRegistering, setIsRegistering] = useState(false);

    // Consultant states
    const [consultantName, setConsultantName] = useState('');
    const [consultantPassword, setConsultantPassword] = useState('');

    const [showPassword, setShowPassword] = useState(false);

    // Reset user states
    const resetUserStates = () => {
        setUserRfc('');
        setUserPhone('');
        setUserPassword('');
        setUserConfirmPassword('');
        setFiscalData(null);
        setTermsAccepted(false);
    };

    // Validate RFC format
    const validateRFC = (rfc: string): { valid: boolean; tipo?: 'fisica' | 'moral'; error?: string } => {
        const normalized = rfc.toUpperCase().trim();
        const rfcFisicaRegex = /^[A-ZÑ&]{4}\d{6}[A-Z0-9]{3}$/;
        const rfcMoralRegex = /^[A-ZÑ&]{3}\d{6}[A-Z0-9]{3}$/;

        if (rfcFisicaRegex.test(normalized)) {
            return { valid: true, tipo: 'fisica' };
        }
        if (rfcMoralRegex.test(normalized)) {
            return { valid: true, tipo: 'moral' };
        }
        return { valid: false, error: 'RFC inválido. Debe tener 12 o 13 caracteres.' };
    };

    // Handle RFC submission for users
    const handleUserRfcSubmit = async () => {
        const validation = validateRFC(userRfc);
        if (!validation.valid) {
            Alert.alert('Error', validation.error || 'RFC inválido');
            return;
        }

        setIsLoading(true);

        try {
            // First check if user already exists by trying to verify credentials
            const normalizedRfc = userRfc.toUpperCase().trim();

            // Try to fetch fiscal data from Syntage API
            const response = await fetch(`${api['baseUrl']}/users/fiscal-data`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ rfc: normalizedRfc })
            });

            const result = await response.json();

            if (result.success && result.data) {
                setFiscalData({
                    rfc: normalizedRfc,
                    razonSocial: result.data.razonSocial || '',
                    tipoPersona: result.data.tipoPersona || validation.tipo || 'fisica'
                });
            } else {
                // Use basic data based on RFC format
                setFiscalData({
                    rfc: normalizedRfc,
                    razonSocial: '',
                    tipoPersona: validation.tipo || 'fisica'
                });
            }

            // Move to terms acceptance screen
            setViewMode('USER_TERMS');

        } catch (error) {
            console.error('Error fetching fiscal data:', error);
            // Continue with basic data
            setFiscalData({
                rfc: userRfc.toUpperCase().trim(),
                razonSocial: '',
                tipoPersona: validation.tipo || 'fisica'
            });
            setViewMode('USER_TERMS');
        } finally {
            setIsLoading(false);
        }
    };

    // Handle terms acceptance
    const handleTermsAccept = () => {
        if (!termsAccepted) {
            Alert.alert('Error', 'Debe aceptar los términos y condiciones para continuar');
            return;
        }
        setViewMode('USER_REGISTER');
    };

    // Handle user registration
    const handleUserRegister = async () => {
        if (!userPhone || userPhone.length < 10) {
            Alert.alert('Error', 'Ingrese un número de teléfono válido');
            return;
        }
        if (!userPassword || userPassword.length < 6) {
            Alert.alert('Error', 'La contraseña debe tener al menos 6 caracteres');
            return;
        }
        if (userPassword !== userConfirmPassword) {
            Alert.alert('Error', 'Las contraseñas no coinciden');
            return;
        }

        setIsLoading(true);

        try {
            const result = await login(fiscalData?.rfc || userRfc, {
                password: userPassword,
                phone: userPhone,
                razonSocial: fiscalData?.razonSocial || '',
                tipoPersona: fiscalData?.tipoPersona || 'fisica',
                termsAccepted: true,
                isRegistration: true,
                role: 'user'
            });

            if (!result.success) {
                Alert.alert('Error', result.error || 'No se pudo completar el registro');
            }
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Error al registrar');
        } finally {
            setIsLoading(false);
        }
    };

    const performAdvisorLogin = async () => {
        if (isRegistering) {
            if (!advisorName || !advisorPhone || !advisorPassword || !clientRfc) {
                Alert.alert('Error', 'Todos los campos son obligatorios para registrarse');
                return;
            }
        } else {
            if (!advisorName || !advisorPassword) {
                Alert.alert('Error', 'Nombre y contraseña son requeridos');
                return;
            }
        }

        setIsLoading(true);
        try {
            const rfcToUse = clientRfc.trim() || `ADV${advisorPhone.replace(/\D/g, '').substring(0, 10)}`;

            const result = await login(rfcToUse, {
                role: 'advisor',
                name: advisorName,
                phone: advisorPhone.trim(),
                password: advisorPassword,
                clientRfc: clientRfc.trim(),
            });

            if (!result.success) {
                Alert.alert('Error', result.error || 'No se pudo iniciar sesión');
            }
        } catch (error) {
            Alert.alert('Error', 'Error de conexión');
        } finally {
            setIsLoading(false);
        }
    };

    const handleConsultantSubmit = () => {
        if (!consultantName || !consultantPassword) {
            Alert.alert('Error', 'Por favor ingresa nombre y contraseña');
            return;
        }
        setIsLoading(true);
        login('ADMIN000CONS').finally(() => setIsLoading(false));
    };

    const handleRoleLogin = async (role: string, _rfc: string) => {
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

        if (role === 'user') {
            resetUserStates();
            setViewMode('USER_RFC');
            return;
        }
    };

    const goBack = () => {
        switch (viewMode) {
            case 'USER_RFC':
            case 'CONSULTANT_LOGIN':
            case 'ADVISOR_LOGIN':
                setViewMode('ROLE_SELECTION');
                break;
            case 'USER_TERMS':
                setViewMode('USER_RFC');
                break;
            case 'USER_REGISTER':
            case 'USER_LOGIN':
                setViewMode('USER_TERMS');
                break;
            default:
                setViewMode('ROLE_SELECTION');
        }
    };

    // Terms and Privacy Modal
    const TermsModal = () => (
        <Modal
            visible={showTermsModal}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={() => setShowTermsModal(false)}
        >
            <View style={styles.modalContainer}>
                <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Términos y Condiciones</Text>
                    <TouchableOpacity onPress={() => setShowTermsModal(false)}>
                        <Ionicons name="close" size={24} color="#1A2138" />
                    </TouchableOpacity>
                </View>
                <ScrollView style={styles.modalContent}>
                    <Text style={styles.termsText}>
                        {`TÉRMINOS Y CONDICIONES DE USO

1. ACEPTACIÓN DE LOS TÉRMINOS
Al acceder y utilizar esta aplicación, usted acepta estar sujeto a estos Términos y Condiciones de Uso.

2. PRIVACIDAD Y PROTECCIÓN DE DATOS
Nos comprometemos a proteger su información personal de acuerdo con las leyes aplicables de protección de datos en México.

3. USO DE LA INFORMACIÓN FISCAL
La información fiscal proporcionada (RFC, razón social) será utilizada únicamente para fines de identificación y comunicación dentro de la plataforma.

4. RESPONSABILIDADES DEL USUARIO
- Proporcionar información veraz y actualizada
- Mantener la confidencialidad de sus credenciales
- Usar la aplicación de manera responsable

5. COMUNICACIONES
Al registrarse, acepta recibir comunicaciones relacionadas con el servicio a través de la aplicación y el número de teléfono proporcionado.

6. MODIFICACIONES
Nos reservamos el derecho de modificar estos términos en cualquier momento. Las modificaciones serán notificadas a través de la aplicación.

7. CONTACTO
Para cualquier duda o aclaración, puede contactarnos a través de los canales oficiales de la aplicación.

Última actualización: Enero 2026`}
                    </Text>
                </ScrollView>
                <TouchableOpacity
                    style={styles.modalButton}
                    onPress={() => setShowTermsModal(false)}
                >
                    <Text style={styles.modalButtonText}>Cerrar</Text>
                </TouchableOpacity>
            </View>
        </Modal>
    );

    // USER RFC Screen
    if (viewMode === 'USER_RFC') {
        return (
            <View style={styles.container}>
                <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
                <ScrollView contentContainerStyle={styles.scrollContent}>
                    <View style={styles.logoContainer}>
                        <Image
                            source={require('../../assets/logo.png')}
                            style={styles.logo}
                            resizeMode="contain"
                        />
                    </View>

                    <Text style={styles.welcomeText}>Registro de Usuario</Text>
                    <Text style={styles.subtitleText}>Ingrese su RFC para comenzar</Text>

                    <View style={styles.formSection}>
                        <Text style={styles.label}>RFC</Text>
                        <TextInput
                            style={styles.input}
                            value={userRfc}
                            onChangeText={(text) => setUserRfc(text.toUpperCase())}
                            placeholder="Ej: GARM850101ABC"
                            placeholderTextColor="#A0AEC0"
                            autoCapitalize="characters"
                            maxLength={13}
                        />
                        <Text style={styles.helperText}>
                            Persona Física: 13 caracteres | Persona Moral: 12 caracteres
                        </Text>

                        <TouchableOpacity
                            style={[styles.loginButton, !userRfc && styles.disabledButton]}
                            onPress={handleUserRfcSubmit}
                            disabled={isLoading || !userRfc}
                        >
                            {isLoading ? (
                                <ActivityIndicator color="#FFFFFF" />
                            ) : (
                                <Text style={styles.loginButtonText}>CONTINUAR</Text>
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.backButton}
                            onPress={goBack}
                        >
                            <Text style={styles.backButtonText}>Volver</Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </View>
        );
    }

    // USER TERMS Screen
    if (viewMode === 'USER_TERMS') {
        return (
            <View style={styles.container}>
                <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
                <TermsModal />
                <ScrollView contentContainerStyle={styles.scrollContent}>
                    <View style={styles.logoContainer}>
                        <Image
                            source={require('../../assets/logo.png')}
                            style={styles.logo}
                            resizeMode="contain"
                        />
                    </View>

                    <Text style={styles.welcomeText}>Datos Fiscales</Text>

                    <View style={styles.formSection}>
                        <View style={styles.infoCard}>
                            <Text style={styles.infoLabel}>RFC:</Text>
                            <Text style={styles.infoValue}>{fiscalData?.rfc}</Text>
                        </View>

                        <View style={styles.infoCard}>
                            <Text style={styles.infoLabel}>Tipo de Persona:</Text>
                            <Text style={styles.infoValue}>
                                {fiscalData?.tipoPersona === 'fisica' ? 'Persona Física' : 'Persona Moral'}
                            </Text>
                        </View>

                        {fiscalData?.razonSocial ? (
                            <View style={styles.infoCard}>
                                <Text style={styles.infoLabel}>Razón Social:</Text>
                                <Text style={styles.infoValue}>{fiscalData.razonSocial}</Text>
                            </View>
                        ) : null}

                        <View style={styles.termsContainer}>
                            <TouchableOpacity
                                style={styles.checkbox}
                                onPress={() => setTermsAccepted(!termsAccepted)}
                            >
                                <Ionicons
                                    name={termsAccepted ? "checkbox" : "square-outline"}
                                    size={24}
                                    color={termsAccepted ? "#5474BC" : "#697CA3"}
                                />
                            </TouchableOpacity>
                            <Text style={styles.termsLabel}>
                                Acepto los{' '}
                                <Text
                                    style={styles.termsLink}
                                    onPress={() => setShowTermsModal(true)}
                                >
                                    Términos y Condiciones
                                </Text>
                                {' '}y la{' '}
                                <Text
                                    style={styles.termsLink}
                                    onPress={() => setShowTermsModal(true)}
                                >
                                    Política de Privacidad
                                </Text>
                            </Text>
                        </View>

                        <TouchableOpacity
                            style={[styles.loginButton, !termsAccepted && styles.disabledButton]}
                            onPress={handleTermsAccept}
                            disabled={!termsAccepted}
                        >
                            <Text style={styles.loginButtonText}>ACEPTAR Y CONTINUAR</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.backButton}
                            onPress={goBack}
                        >
                            <Text style={styles.backButtonText}>Volver</Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </View>
        );
    }

    // USER REGISTER Screen
    if (viewMode === 'USER_REGISTER') {
        return (
            <View style={styles.container}>
                <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
                <ScrollView contentContainerStyle={styles.scrollContent}>
                    <View style={styles.logoContainer}>
                        <Image
                            source={require('../../assets/logo.png')}
                            style={styles.logo}
                            resizeMode="contain"
                        />
                    </View>

                    <Text style={styles.welcomeText}>Completa tu Registro</Text>

                    <View style={styles.formSection}>
                        <Text style={styles.label}>Número de Teléfono</Text>
                        <TextInput
                            style={styles.input}
                            value={userPhone}
                            onChangeText={setUserPhone}
                            placeholder="10 dígitos"
                            placeholderTextColor="#A0AEC0"
                            keyboardType="phone-pad"
                            maxLength={10}
                        />

                        <Text style={styles.label}>Contraseña</Text>
                        <View style={styles.passwordContainer}>
                            <TextInput
                                style={styles.passwordInput}
                                value={userPassword}
                                onChangeText={setUserPassword}
                                secureTextEntry={!showPassword}
                                placeholder="Mínimo 6 caracteres"
                                placeholderTextColor="#A0AEC0"
                            />
                            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                                <Ionicons
                                    name={showPassword ? "eye-off-outline" : "eye-outline"}
                                    size={20}
                                    color="#697CA3"
                                />
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.label}>Confirmar Contraseña</Text>
                        <View style={styles.passwordContainer}>
                            <TextInput
                                style={styles.passwordInput}
                                value={userConfirmPassword}
                                onChangeText={setUserConfirmPassword}
                                secureTextEntry={!showPassword}
                                placeholder="Repita su contraseña"
                                placeholderTextColor="#A0AEC0"
                            />
                        </View>

                        <TouchableOpacity
                            style={[styles.loginButton, isLoading && styles.disabledButton]}
                            onPress={handleUserRegister}
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <ActivityIndicator color="#FFFFFF" />
                            ) : (
                                <Text style={styles.loginButtonText}>REGISTRARME</Text>
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.backButton}
                            onPress={goBack}
                        >
                            <Text style={styles.backButtonText}>Volver</Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </View>
        );
    }

    // ADVISOR LOGIN Screen
    if (viewMode === 'ADVISOR_LOGIN') {
        return (
            <View style={styles.container}>
                <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
                <ScrollView contentContainerStyle={styles.scrollContent}>
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
                                <Text style={styles.label}>Teléfono</Text>
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

                        <TouchableOpacity
                            style={{ marginTop: 20, alignItems: 'center' }}
                            onPress={() => setIsRegistering(!isRegistering)}
                        >
                            <Text style={{ color: '#5474BC', fontWeight: 'bold' }}>
                                {isRegistering ? '¿Ya tienes cuenta? Inicia Sesión' : '¿No tienes cuenta? Regístrate'}
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.backButton}
                            onPress={goBack}
                        >
                            <Text style={styles.backButtonText}>Volver</Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </View>
        );
    }

    // CONSULTANT LOGIN Screen
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

                    <Text style={styles.welcomeText}>Bienvenido</Text>

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

                        <TouchableOpacity
                            style={styles.backButton}
                            onPress={goBack}
                        >
                            <Text style={styles.backButtonText}>Volver</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        );
    }

    // ROLE SELECTION Screen (default)
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

                <Text style={styles.welcomeText}>Bienvenido</Text>

                <View style={styles.buttonsContainer}>
                    <RoleButton
                        title="USUARIO"
                        icon="person"
                        rfc=""
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
        backgroundColor: '#FCFCFC',
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: 40,
        paddingBottom: 40,
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        paddingHorizontal: 40,
        paddingVertical: 40,
    },
    logoContainer: {
        alignItems: 'center',
        marginBottom: 20,
    },
    logo: {
        width: 120,
        height: 120,
    },
    welcomeText: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#1A2138',
        textAlign: 'center',
        marginBottom: 10,
        letterSpacing: 0.5,
    },
    subtitleText: {
        fontSize: 16,
        color: '#697CA3',
        textAlign: 'center',
        marginBottom: 30,
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
        shadowColor: '#697CA3',
        shadowOffset: { width: 0, height: 4 },
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
        color: '#697CA3',
        letterSpacing: 0.5,
        marginRight: 30,
    },
    loaderContainer: {
        position: 'absolute',
        right: 20,
    },
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
    helperText: {
        fontSize: 12,
        color: '#A0AEC0',
        marginTop: 4,
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
        backgroundColor: '#5474BC',
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 40,
        shadowColor: '#5474BC',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    disabledButton: {
        backgroundColor: '#A0AEC0',
        shadowOpacity: 0.1,
    },
    loginButtonText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#FFFFFF',
        letterSpacing: 0.5,
    },
    backButton: {
        marginTop: 20,
        alignItems: 'center',
    },
    backButtonText: {
        color: '#697CA3',
        fontSize: 16,
    },
    infoCard: {
        backgroundColor: '#F8FAFC',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    infoLabel: {
        fontSize: 12,
        color: '#697CA3',
        marginBottom: 4,
    },
    infoValue: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1A2138',
    },
    termsContainer: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginTop: 24,
        marginBottom: 8,
    },
    checkbox: {
        marginRight: 12,
        marginTop: 2,
    },
    termsLabel: {
        flex: 1,
        fontSize: 14,
        color: '#5C6B89',
        lineHeight: 20,
    },
    termsLink: {
        color: '#5474BC',
        fontWeight: '600',
        textDecorationLine: 'underline',
    },
    modalContainer: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        padding: 20,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
        paddingTop: 10,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1A2138',
    },
    modalContent: {
        flex: 1,
    },
    termsText: {
        fontSize: 14,
        color: '#5C6B89',
        lineHeight: 22,
    },
    modalButton: {
        backgroundColor: '#5474BC',
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
        marginTop: 20,
    },
    modalButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
});

export default LoginScreen;
