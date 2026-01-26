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
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../context/AuthContext';
import { api, FiscalDataOCR } from '../api/client';
import { GradientButton } from '../components';

type ViewMode = 'ROLE_SELECTION' | 'USER_DOCUMENT_UPLOAD' | 'USER_TERMS' | 'USER_REGISTER' | 'USER_LOGIN' | 'CONSULTANT_LOGIN' | 'ADVISOR_LOGIN';

interface ExtendedFiscalData {
    rfc: string;
    curp: string | null;
    razonSocial: string;
    tipoPersona: 'fisica' | 'moral';
    regimenFiscal: string | null;
    codigoPostal: string | null;
    estado: string | null;
    domicilioCompleto: string | null;
    confianza: number;
}

export const LoginScreen: React.FC = () => {
    const { login } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const [selectedRole] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<ViewMode>('ROLE_SELECTION');

    // User registration states
    const [userPhone, setUserPhone] = useState('');
    const [userPassword, setUserPassword] = useState('');
    const [userConfirmPassword, setUserConfirmPassword] = useState('');
    const [fiscalData, setFiscalData] = useState<ExtendedFiscalData | null>(null);
    const [termsAccepted, setTermsAccepted] = useState(false);
    const [showTermsModal, setShowTermsModal] = useState(false);

    // OCR states
    const [documentImage, setDocumentImage] = useState<string | null>(null);
    const [isProcessingOCR, setIsProcessingOCR] = useState(false);

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
        setUserPhone('');
        setUserPassword('');
        setUserConfirmPassword('');
        setFiscalData(null);
        setTermsAccepted(false);
        setDocumentImage(null);
        setIsProcessingOCR(false);
    };

    // Seleccionar imagen de la constancia fiscal
    const pickFiscalDocument = async (fromCamera: boolean) => {
        try {
            // Solicitar permisos
            if (fromCamera) {
                const { status } = await ImagePicker.requestCameraPermissionsAsync();
                if (status !== 'granted') {
                    Alert.alert('Permiso requerido', 'Necesitamos acceso a la camara para tomar la foto.');
                    return;
                }
            } else {
                const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
                if (status !== 'granted') {
                    Alert.alert('Permiso requerido', 'Necesitamos acceso a la galeria para seleccionar la imagen.');
                    return;
                }
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                quality: 0.8,
                ...(fromCamera && { launchImageLibraryAsync: undefined }),
            });

            if (fromCamera) {
                const cameraResult = await ImagePicker.launchCameraAsync({
                    mediaTypes: ImagePicker.MediaTypeOptions.Images,
                    allowsEditing: true,
                    quality: 0.8,
                });
                if (!cameraResult.canceled && cameraResult.assets[0]) {
                    setDocumentImage(cameraResult.assets[0].uri);
                    processDocument(cameraResult.assets[0].uri);
                }
            } else {
                if (!result.canceled && result.assets[0]) {
                    setDocumentImage(result.assets[0].uri);
                    processDocument(result.assets[0].uri);
                }
            }
        } catch (error) {
            console.error('Error picking image:', error);
            Alert.alert('Error', 'No se pudo seleccionar la imagen.');
        }
    };

    // Procesar documento con OCR
    const processDocument = async (imageUri: string) => {
        setIsProcessingOCR(true);

        try {
            const result = await api.uploadFiscalDocument(imageUri);

            if (result.error) {
                if (result.error.includes('calidad') || result.error.includes('clara')) {
                    Alert.alert(
                        'Imagen no clara',
                        result.error,
                        [
                            { text: 'Cancelar', style: 'cancel', onPress: () => setDocumentImage(null) },
                            { text: 'Tomar otra foto', onPress: () => pickFiscalDocument(true) },
                            { text: 'Seleccionar otra', onPress: () => pickFiscalDocument(false) },
                        ]
                    );
                } else {
                    Alert.alert('Error', result.error);
                    setDocumentImage(null);
                }
                return;
            }

            if (result.data?.success && result.data.data) {
                const ocrData = result.data.data;

                // Construir domicilio completo
                const domicilioParts = [
                    ocrData.domicilio?.calle,
                    ocrData.domicilio?.numeroExterior && `#${ocrData.domicilio.numeroExterior}`,
                    ocrData.domicilio?.numeroInterior && `Int. ${ocrData.domicilio.numeroInterior}`,
                    ocrData.domicilio?.colonia && `Col. ${ocrData.domicilio.colonia}`,
                    ocrData.domicilio?.municipio,
                ].filter(Boolean).join(', ');

                setFiscalData({
                    rfc: ocrData.rfc,
                    curp: ocrData.curp,
                    razonSocial: ocrData.nombre,
                    tipoPersona: ocrData.tipoPersona,
                    regimenFiscal: ocrData.regimenFiscal,
                    codigoPostal: ocrData.domicilio?.codigoPostal || null,
                    estado: ocrData.domicilio?.estado || null,
                    domicilioCompleto: domicilioParts || null,
                    confianza: ocrData.confianza,
                });

                setViewMode('USER_TERMS');
            } else {
                Alert.alert('Error', 'No se pudieron extraer los datos del documento.');
                setDocumentImage(null);
            }

        } catch (error: any) {
            console.error('OCR Error:', error);
            Alert.alert('Error', 'No se pudo procesar el documento. Intente de nuevo.');
            setDocumentImage(null);
        } finally {
            setIsProcessingOCR(false);
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

    const handleConsultantSubmit = async () => {
        if (!consultantName || !consultantPassword) {
            Alert.alert('Error', 'Por favor ingresa nombre y contraseña');
            return;
        }
        setIsLoading(true);
        try {
            const result = await login(consultantName, {
                password: consultantPassword,
                role: 'consultant'
            });
            if (!result.success) {
                Alert.alert('Error', result.error || 'Credenciales incorrectas');
            }
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Error al iniciar sesión');
        } finally {
            setIsLoading(false);
        }
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
            setViewMode('USER_DOCUMENT_UPLOAD');
            return;
        }
    };

    const goBack = () => {
        switch (viewMode) {
            case 'USER_DOCUMENT_UPLOAD':
            case 'CONSULTANT_LOGIN':
            case 'ADVISOR_LOGIN':
                setViewMode('ROLE_SELECTION');
                break;
            case 'USER_TERMS':
                setDocumentImage(null);
                setFiscalData(null);
                setViewMode('USER_DOCUMENT_UPLOAD');
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
                <GradientButton
                    title="Cerrar"
                    onPress={() => setShowTermsModal(false)}
                    style={{ marginTop: 20 }}
                />
            </View>
        </Modal>
    );

    // USER DOCUMENT UPLOAD Screen
    if (viewMode === 'USER_DOCUMENT_UPLOAD') {
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
                    <Text style={styles.subtitleText}>Suba su Constancia de Situacion Fiscal</Text>

                    <View style={styles.formSection}>
                        {/* Instrucciones */}
                        <View style={styles.instructionsCard}>
                            <Ionicons name="document-text-outline" size={32} color="#5474BC" />
                            <Text style={styles.instructionsTitle}>Constancia de Situacion Fiscal</Text>
                            <Text style={styles.instructionsText}>
                                Tome una foto clara de su Constancia de Situacion Fiscal del SAT.
                                Asegurese de que el documento sea legible y este bien iluminado.
                            </Text>
                        </View>

                        {/* Preview de imagen o botones */}
                        {isProcessingOCR ? (
                            <View style={styles.processingContainer}>
                                <ActivityIndicator size="large" color="#5474BC" />
                                <Text style={styles.processingText}>Procesando documento...</Text>
                                <Text style={styles.processingSubtext}>Esto puede tardar unos segundos</Text>
                            </View>
                        ) : documentImage ? (
                            <View style={styles.previewContainer}>
                                <Image
                                    source={{ uri: documentImage }}
                                    style={styles.documentPreview}
                                    resizeMode="contain"
                                />
                                <TouchableOpacity
                                    style={styles.removeImageButton}
                                    onPress={() => setDocumentImage(null)}
                                >
                                    <Ionicons name="close-circle" size={28} color="#E53E3E" />
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <View style={styles.uploadButtonsContainer}>
                                <TouchableOpacity
                                    style={styles.uploadButton}
                                    onPress={() => pickFiscalDocument(true)}
                                >
                                    <Ionicons name="camera-outline" size={32} color="#5474BC" />
                                    <Text style={styles.uploadButtonText}>Tomar Foto</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.uploadButton}
                                    onPress={() => pickFiscalDocument(false)}
                                >
                                    <Ionicons name="images-outline" size={32} color="#5474BC" />
                                    <Text style={styles.uploadButtonText}>Seleccionar de Galeria</Text>
                                </TouchableOpacity>
                            </View>
                        )}

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

    // USER TERMS Screen - Con campos editables
    if (viewMode === 'USER_TERMS') {
        return (
            <View style={styles.container}>
                <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
                <TermsModal />
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={{ flex: 1 }}
                >
                    <ScrollView contentContainerStyle={styles.scrollContent}>
                        <Text style={styles.welcomeText}>Verifique sus Datos</Text>

                        {/* Indicador de confianza OCR */}
                        {fiscalData?.confianza !== undefined && (
                            <View style={[
                                styles.confidenceBadge,
                                fiscalData.confianza >= 80 ? styles.confidenceHigh :
                                fiscalData.confianza >= 60 ? styles.confidenceMedium :
                                styles.confidenceLow
                            ]}>
                                <Ionicons
                                    name={fiscalData.confianza >= 80 ? "checkmark-circle" : "alert-circle"}
                                    size={16}
                                    color="#fff"
                                />
                                <Text style={styles.confidenceText}>
                                    {fiscalData.confianza >= 80 ? 'Alta precision' :
                                     fiscalData.confianza >= 60 ? 'Precision media - verifique' :
                                     'Baja precision - corrija si es necesario'} ({fiscalData.confianza}%)
                                </Text>
                            </View>
                        )}

                        <Text style={styles.subtitleText}>
                            Revise y corrija los datos si es necesario
                        </Text>

                        <View style={styles.formSection}>
                            {/* RFC - Editable */}
                            <Text style={styles.label}>RFC *</Text>
                            <TextInput
                                style={styles.input}
                                value={fiscalData?.rfc || ''}
                                onChangeText={(text) => setFiscalData(prev => prev ? { ...prev, rfc: text.toUpperCase() } : null)}
                                placeholder="RFC"
                                placeholderTextColor="#A0AEC0"
                                autoCapitalize="characters"
                                maxLength={13}
                            />

                            {/* Nombre / Razon Social - Editable */}
                            <Text style={styles.label}>Nombre / Razon Social *</Text>
                            <TextInput
                                style={styles.input}
                                value={fiscalData?.razonSocial || ''}
                                onChangeText={(text) => setFiscalData(prev => prev ? { ...prev, razonSocial: text } : null)}
                                placeholder="Nombre completo o razon social"
                                placeholderTextColor="#A0AEC0"
                            />

                            {/* CURP - Editable (solo personas fisicas) */}
                            {fiscalData?.tipoPersona === 'fisica' && (
                                <>
                                    <Text style={styles.label}>CURP</Text>
                                    <TextInput
                                        style={styles.input}
                                        value={fiscalData?.curp || ''}
                                        onChangeText={(text) => setFiscalData(prev => prev ? { ...prev, curp: text.toUpperCase() } : null)}
                                        placeholder="CURP (18 caracteres)"
                                        placeholderTextColor="#A0AEC0"
                                        autoCapitalize="characters"
                                        maxLength={18}
                                    />
                                </>
                            )}

                            {/* Tipo de Persona - Selector */}
                            <Text style={styles.label}>Tipo de Persona</Text>
                            <View style={styles.tipoPersonaContainer}>
                                <TouchableOpacity
                                    style={[
                                        styles.tipoPersonaButton,
                                        fiscalData?.tipoPersona === 'fisica' && styles.tipoPersonaButtonActive
                                    ]}
                                    onPress={() => setFiscalData(prev => prev ? { ...prev, tipoPersona: 'fisica' } : null)}
                                >
                                    <Text style={[
                                        styles.tipoPersonaText,
                                        fiscalData?.tipoPersona === 'fisica' && styles.tipoPersonaTextActive
                                    ]}>Persona Fisica</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[
                                        styles.tipoPersonaButton,
                                        fiscalData?.tipoPersona === 'moral' && styles.tipoPersonaButtonActive
                                    ]}
                                    onPress={() => setFiscalData(prev => prev ? { ...prev, tipoPersona: 'moral' } : null)}
                                >
                                    <Text style={[
                                        styles.tipoPersonaText,
                                        fiscalData?.tipoPersona === 'moral' && styles.tipoPersonaTextActive
                                    ]}>Persona Moral</Text>
                                </TouchableOpacity>
                            </View>

                            {/* Regimen Fiscal - Editable */}
                            <Text style={styles.label}>Regimen Fiscal</Text>
                            <TextInput
                                style={styles.input}
                                value={fiscalData?.regimenFiscal || ''}
                                onChangeText={(text) => setFiscalData(prev => prev ? { ...prev, regimenFiscal: text } : null)}
                                placeholder="Regimen fiscal"
                                placeholderTextColor="#A0AEC0"
                            />

                            {/* Codigo Postal - Editable */}
                            <Text style={styles.label}>Codigo Postal</Text>
                            <TextInput
                                style={styles.input}
                                value={fiscalData?.codigoPostal || ''}
                                onChangeText={(text) => setFiscalData(prev => prev ? { ...prev, codigoPostal: text } : null)}
                                placeholder="Codigo postal"
                                placeholderTextColor="#A0AEC0"
                                keyboardType="numeric"
                                maxLength={5}
                            />

                            {/* Estado - Editable */}
                            <Text style={styles.label}>Estado</Text>
                            <TextInput
                                style={styles.input}
                                value={fiscalData?.estado || ''}
                                onChangeText={(text) => setFiscalData(prev => prev ? { ...prev, estado: text } : null)}
                                placeholder="Entidad federativa"
                                placeholderTextColor="#A0AEC0"
                            />

                            {/* Domicilio - Editable */}
                            <Text style={styles.label}>Domicilio Fiscal</Text>
                            <TextInput
                                style={[styles.input, styles.multilineInput]}
                                value={fiscalData?.domicilioCompleto || ''}
                                onChangeText={(text) => setFiscalData(prev => prev ? { ...prev, domicilioCompleto: text } : null)}
                                placeholder="Domicilio completo"
                                placeholderTextColor="#A0AEC0"
                                multiline
                                numberOfLines={2}
                            />

                            {/* Terminos y condiciones */}
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
                                        Terminos y Condiciones
                                    </Text>
                                    {' '}y la{' '}
                                    <Text
                                        style={styles.termsLink}
                                        onPress={() => setShowTermsModal(true)}
                                    >
                                        Politica de Privacidad
                                    </Text>
                                </Text>
                            </View>

                            <GradientButton
                                title="ACEPTAR Y CONTINUAR"
                                onPress={handleTermsAccept}
                                disabled={!termsAccepted || !fiscalData?.rfc}
                                style={{ marginTop: 40 }}
                            />

                            <TouchableOpacity
                                style={styles.backButton}
                                onPress={goBack}
                            >
                                <Text style={styles.backButtonText}>Volver</Text>
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                </KeyboardAvoidingView>
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

                        <GradientButton
                            title="REGISTRARME"
                            onPress={handleUserRegister}
                            disabled={isLoading}
                            loading={isLoading}
                            style={{ marginTop: 40 }}
                        />

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

                        <GradientButton
                            title={isRegistering ? 'REGISTRARSE' : 'INICIAR SESIÓN'}
                            onPress={performAdvisorLogin}
                            disabled={isLoading}
                            loading={isLoading}
                            style={{ marginTop: 40 }}
                        />

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

                        <GradientButton
                            title="INICIAR SESIÓN"
                            onPress={handleConsultantSubmit}
                            disabled={isLoading}
                            loading={isLoading}
                            style={{ marginTop: 40 }}
                        />

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
    // Estilos para OCR Document Upload
    instructionsCard: {
        backgroundColor: '#F0F4FF',
        borderRadius: 16,
        padding: 24,
        alignItems: 'center',
        marginBottom: 24,
        borderWidth: 1,
        borderColor: '#D4E0FF',
    },
    instructionsTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1A2138',
        marginTop: 12,
        marginBottom: 8,
    },
    instructionsText: {
        fontSize: 14,
        color: '#697CA3',
        textAlign: 'center',
        lineHeight: 20,
    },
    uploadButtonsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 16,
        marginBottom: 20,
    },
    uploadButton: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 24,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: '#E2E8F0',
        borderStyle: 'dashed',
    },
    uploadButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#5474BC',
        marginTop: 8,
        textAlign: 'center',
    },
    processingContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 40,
    },
    processingText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1A2138',
        marginTop: 16,
    },
    processingSubtext: {
        fontSize: 14,
        color: '#697CA3',
        marginTop: 4,
    },
    previewContainer: {
        position: 'relative',
        marginBottom: 20,
    },
    documentPreview: {
        width: '100%',
        height: 250,
        borderRadius: 12,
        backgroundColor: '#F8FAFC',
    },
    removeImageButton: {
        position: 'absolute',
        top: -10,
        right: -10,
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
    },
    // Estilos para confianza OCR
    confidenceBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'center',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        marginBottom: 16,
        gap: 6,
    },
    confidenceHigh: {
        backgroundColor: '#38A169',
    },
    confidenceMedium: {
        backgroundColor: '#D69E2E',
    },
    confidenceLow: {
        backgroundColor: '#E53E3E',
    },
    confidenceText: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '600',
    },
    // Estilos para selector tipo persona
    tipoPersonaContainer: {
        flexDirection: 'row',
        gap: 12,
    },
    tipoPersonaButton: {
        flex: 1,
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
    },
    tipoPersonaButtonActive: {
        borderColor: '#5474BC',
        backgroundColor: '#F0F4FF',
    },
    tipoPersonaText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#697CA3',
    },
    tipoPersonaTextActive: {
        color: '#5474BC',
        fontWeight: '600',
    },
    // Input multilinea
    multilineInput: {
        height: 80,
        textAlignVertical: 'top',
        paddingTop: 12,
    },
});

export default LoginScreen;
