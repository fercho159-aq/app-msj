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
import * as DocumentPicker from 'expo-document-picker';
import { useAuth } from '../context/AuthContext';
import { api, CheckIdResponse } from '../api/client';
import { GradientButton } from '../components';

type ViewMode = 'ROLE_SELECTION' | 'USER_AUTH_CHOICE' | 'USER_TERMS' | 'USER_REGISTER' | 'USER_WELCOME' | 'USER_LOGIN' | 'CONSULTANT_LOGIN' | 'ADVISOR_LOGIN';

// Obtener estado de México a partir del código postal
const getEstadoFromCP = (cp: string | null): string | null => {
    if (!cp || cp.length < 2) return null;
    const prefix = parseInt(cp.substring(0, 2), 10);

    if (prefix >= 1 && prefix <= 16) return 'Ciudad de México';
    if (prefix === 20) return 'Aguascalientes';
    if (prefix >= 21 && prefix <= 22) return 'Baja California';
    if (prefix === 23) return 'Baja California Sur';
    if (prefix === 24) return 'Campeche';
    if (prefix >= 25 && prefix <= 27) return 'Coahuila';
    if (prefix === 28) return 'Colima';
    if (prefix >= 29 && prefix <= 30) return 'Chiapas';
    if (prefix >= 31 && prefix <= 33) return 'Chihuahua';
    if (prefix >= 34 && prefix <= 35) return 'Durango';
    if (prefix >= 36 && prefix <= 38) return 'Guanajuato';
    if (prefix >= 39 && prefix <= 41) return 'Guerrero';
    if (prefix >= 42 && prefix <= 43) return 'Hidalgo';
    if (prefix >= 44 && prefix <= 49) return 'Jalisco';
    if (prefix >= 50 && prefix <= 57) return 'Estado de México';
    if (prefix >= 58 && prefix <= 61) return 'Michoacán';
    if (prefix === 62) return 'Morelos';
    if (prefix === 63) return 'Nayarit';
    if (prefix >= 64 && prefix <= 67) return 'Nuevo León';
    if (prefix >= 68 && prefix <= 71) return 'Oaxaca';
    if (prefix >= 72 && prefix <= 75) return 'Puebla';
    if (prefix === 76) return 'Querétaro';
    if (prefix === 77) return 'Quintana Roo';
    if (prefix >= 78 && prefix <= 79) return 'San Luis Potosí';
    if (prefix >= 80 && prefix <= 82) return 'Sinaloa';
    if (prefix >= 83 && prefix <= 85) return 'Sonora';
    if (prefix === 86) return 'Tabasco';
    if (prefix >= 87 && prefix <= 89) return 'Tamaulipas';
    if (prefix === 90) return 'Tlaxcala';
    if (prefix >= 91 && prefix <= 96) return 'Veracruz';
    if (prefix === 97) return 'Yucatán';
    if (prefix >= 98 && prefix <= 99) return 'Zacatecas';

    return null;
};

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
    const [userProfilePhoto, setUserProfilePhoto] = useState<string | null>(null);

    // RFC Input states
    const [rfcInput, setRfcInput] = useState('');
    const [isConsultingRFC, setIsConsultingRFC] = useState(false);

    // Advisor states
    const [advisorName, setAdvisorName] = useState('');
    const [advisorPhone, setAdvisorPhone] = useState('');
    const [advisorPassword, setAdvisorPassword] = useState('');
    const [clientRfc, setClientRfc] = useState('');
    const [isRegistering, setIsRegistering] = useState(false);
    // Advisor - Client OCR states
    const [clientDocumentImage, setClientDocumentImage] = useState<string | null>(null);
    const [isProcessingClientOCR, setIsProcessingClientOCR] = useState(false);
    const [clientFiscalData, setClientFiscalData] = useState<ExtendedFiscalData | null>(null);

    // Consultant states
    const [consultantName, setConsultantName] = useState('');
    const [consultantPassword, setConsultantPassword] = useState('');

    // User login states (for existing users)
    const [userLoginRfc, setUserLoginRfc] = useState('');
    const [userLoginPassword, setUserLoginPassword] = useState('');
    const [isUserRegistering, setIsUserRegistering] = useState(false);

    const [showPassword, setShowPassword] = useState(false);

    // Reset user states
    const resetUserStates = () => {
        setUserPhone('');
        setUserPassword('');
        setUserConfirmPassword('');
        setFiscalData(null);
        setTermsAccepted(false);
        setRfcInput('');
        setIsConsultingRFC(false);
        setUserLoginRfc('');
        setUserLoginPassword('');
        setIsUserRegistering(false);
        setUserProfilePhoto(null);
    };

    // Seleccionar foto de perfil del usuario
    const pickUserProfilePhoto = async (fromCamera: boolean) => {
        try {
            if (fromCamera) {
                const { status } = await ImagePicker.requestCameraPermissionsAsync();
                if (status !== 'granted') {
                    Alert.alert('Permiso requerido', 'Necesitamos acceso a la cámara para tomar la foto.');
                    return;
                }
                const result = await ImagePicker.launchCameraAsync({
                    mediaTypes: ImagePicker.MediaTypeOptions.Images,
                    allowsEditing: true,
                    aspect: [1, 1],
                    quality: 0.8,
                });
                if (!result.canceled && result.assets[0]) {
                    setUserProfilePhoto(result.assets[0].uri);
                }
            } else {
                const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
                if (status !== 'granted') {
                    Alert.alert('Permiso requerido', 'Necesitamos acceso a la galería para seleccionar la imagen.');
                    return;
                }
                const result = await ImagePicker.launchImageLibraryAsync({
                    mediaTypes: ImagePicker.MediaTypeOptions.Images,
                    allowsEditing: true,
                    aspect: [1, 1],
                    quality: 0.8,
                });
                if (!result.canceled && result.assets[0]) {
                    setUserProfilePhoto(result.assets[0].uri);
                }
            }
        } catch (error) {
            console.error('Error picking profile photo:', error);
            Alert.alert('Error', 'No se pudo seleccionar la imagen.');
        }
    };

    // Mostrar opciones para foto de perfil
    const showPhotoOptions = () => {
        Alert.alert(
            'Foto de Perfil',
            'Selecciona una opción',
            [
                { text: 'Cámara', onPress: () => pickUserProfilePhoto(true) },
                { text: 'Galería', onPress: () => pickUserProfilePhoto(false) },
                { text: 'Cancelar', style: 'cancel' },
            ]
        );
    };

    // Consultar RFC usando API CheckId
    const consultarRFCCheckId = async () => {
        const termino = rfcInput.trim().toUpperCase();

        // Validar formato: RFC (12-13 chars)
        if (termino.length < 12 || termino.length > 13) {
            Alert.alert('Error', 'Ingrese un RFC válido (12-13 caracteres)');
            return;
        }

        setIsConsultingRFC(true);

        try {
            const result = await api.consultarRFC(termino);

            if (result.error) {
                Alert.alert('Error', result.error);
                return;
            }

            if (!result.data) {
                Alert.alert('Error', 'No se recibió respuesta del servidor');
                return;
            }

            const checkIdData = result.data;

            // Manejar errores de CheckId
            if (!checkIdData.exitoso) {
                const errorCode = checkIdData.codigoError || '';
                let errorMessage = 'Error al consultar datos fiscales';

                if (errorCode === 'E100' || errorCode === 'E101') {
                    errorMessage = 'Ingrese un RFC válido';
                } else if (errorCode === 'E200' || errorCode === 'E202') {
                    errorMessage = 'No se encontró información para este RFC';
                } else if (errorCode === 'E201') {
                    errorMessage = 'Error temporal, intente de nuevo';
                } else if (errorCode.startsWith('E9')) {
                    errorMessage = 'Servicio no disponible, contacte soporte';
                } else if (checkIdData.error) {
                    errorMessage = checkIdData.error;
                }

                Alert.alert('Error', errorMessage);
                return;
            }

            // Mapear respuesta de CheckId a ExtendedFiscalData
            const rfcData = checkIdData.resultado?.rfc;
            const curpData = checkIdData.resultado?.curp;
            const cpData = checkIdData.resultado?.codigoPostal;
            const regimenData = checkIdData.resultado?.regimenFiscal;

            if (!rfcData && !curpData) {
                Alert.alert('Error', 'No se encontraron datos fiscales para este RFC');
                return;
            }

            // Determinar tipo de persona por longitud de RFC
            const rfcValue = rfcData?.rfc || termino;
            const tipoPersona: 'fisica' | 'moral' = rfcValue.length === 13 ? 'fisica' : 'moral';

            // Construir nombre/razón social
            let razonSocial = rfcData?.razonSocial || '';
            if (!razonSocial && curpData) {
                razonSocial = [
                    curpData.nombres,
                    curpData.primerApellido,
                    curpData.segundoApellido
                ].filter(Boolean).join(' ');
            }

            // Obtener el código postal y derivar el estado
            const codigoPostal = cpData?.codigoPostal || null;
            const estado = getEstadoFromCP(codigoPostal);

            setFiscalData({
                rfc: rfcValue,
                curp: rfcData?.curp || curpData?.curp || null,
                razonSocial: razonSocial,
                tipoPersona: tipoPersona,
                regimenFiscal: regimenData?.regimenesFiscales || null,
                codigoPostal: codigoPostal,
                estado: estado,
                domicilioCompleto: null,
                confianza: 100, // Datos verificados del SAT
            });

            // Navegar directamente a pantalla de registro
            setViewMode('USER_REGISTER');

        } catch (error: any) {
            console.error('CheckId Error:', error);
            Alert.alert('Error', 'No se pudo consultar los datos fiscales. Intente de nuevo.');
        } finally {
            setIsConsultingRFC(false);
        }
    };

    // Seleccionar imagen de constancia del cliente (para Asesor)
    const pickClientFiscalDocument = async (fromCamera: boolean) => {
        try {
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

            if (fromCamera) {
                const cameraResult = await ImagePicker.launchCameraAsync({
                    mediaTypes: ImagePicker.MediaTypeOptions.Images,
                    allowsEditing: true,
                    quality: 0.8,
                });
                if (!cameraResult.canceled && cameraResult.assets[0]) {
                    setClientDocumentImage(cameraResult.assets[0].uri);
                    processClientDocument(cameraResult.assets[0].uri);
                }
            } else {
                const result = await ImagePicker.launchImageLibraryAsync({
                    mediaTypes: ImagePicker.MediaTypeOptions.Images,
                    allowsEditing: true,
                    quality: 0.8,
                });
                if (!result.canceled && result.assets[0]) {
                    setClientDocumentImage(result.assets[0].uri);
                    processClientDocument(result.assets[0].uri);
                }
            }
        } catch (error) {
            console.error('Error picking client image:', error);
            Alert.alert('Error', 'No se pudo seleccionar la imagen.');
        }
    };

    // Seleccionar PDF del cliente (para Asesor)
    const pickClientPDFDocument = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: 'application/pdf',
                copyToCacheDirectory: true,
            });

            if (!result.canceled && result.assets && result.assets[0]) {
                const asset = result.assets[0];
                setClientDocumentImage(asset.uri);
                processClientDocument(asset.uri, true);
            }
        } catch (error) {
            console.error('Error picking client PDF:', error);
            Alert.alert('Error', 'No se pudo seleccionar el archivo PDF.');
        }
    };

    // Procesar documento del cliente con OCR (para Asesor)
    const processClientDocument = async (imageUri: string, isPDF: boolean = false) => {
        setIsProcessingClientOCR(true);

        try {
            const result = await api.uploadFiscalDocument(imageUri, isPDF);

            if (result.error) {
                if (result.error.includes('calidad') || result.error.includes('clara')) {
                    Alert.alert(
                        'Imagen no clara',
                        result.error,
                        [
                            { text: 'Cancelar', style: 'cancel', onPress: () => setClientDocumentImage(null) },
                            { text: 'Tomar otra foto', onPress: () => pickClientFiscalDocument(true) },
                            { text: 'Seleccionar otra', onPress: () => pickClientFiscalDocument(false) },
                        ]
                    );
                } else {
                    Alert.alert('Error', result.error);
                    setClientDocumentImage(null);
                }
                return;
            }

            if (result.data?.success && result.data.data) {
                const ocrData = result.data.data;

                // Funcion para limpiar texto de etiquetas OCR residuales
                const cleanText = (text: string | null | undefined): string | null => {
                    if (!text) return null;
                    return text
                        .replace(/^Nombre\s*(?:de\s*(?:la\s*)?)?(?:Vialidad|Colonia)[:\s]*/i, '')
                        .replace(/^Calle[:\s]*/i, '')
                        .replace(/^Colonia[:\s]*/i, '')
                        .replace(/^Col\.[:\s]*/i, '')
                        .replace(/^N[uú]mero\s*(?:Exterior|Interior)[:\s]*/i, '')
                        .replace(/^No\.\s*(?:Ext|Int)[.:\s]*/i, '')
                        .replace(/^Int\.[:\s]*/i, '')
                        .replace(/^Ext\.[:\s]*/i, '')
                        .replace(/^Municipio[:\s]*/i, '')
                        .replace(/^(?:Demarcaci[oó]n\s*Territorial|Delegaci[oó]n|Alcald[ií]a)[:\s]*/i, '')
                        .replace(/\s*o\s*Demarcaci[oó]n.*$/i, '')
                        .replace(/\s+/g, ' ')
                        .trim() || null;
                };

                // Construir domicilio completo con datos limpios
                const calle = cleanText(ocrData.domicilio?.calle);
                const numExt = cleanText(ocrData.domicilio?.numeroExterior);
                const numInt = cleanText(ocrData.domicilio?.numeroInterior);
                const colonia = cleanText(ocrData.domicilio?.colonia);
                const municipio = cleanText(ocrData.domicilio?.municipio);

                const domicilioParts = [
                    calle,
                    numExt && `#${numExt}`,
                    numInt && `Int. ${numInt}`,
                    colonia && `Col. ${colonia}`,
                    municipio,
                ].filter(Boolean).join(', ');

                // Limpiar nombre de artefactos OCR
                const nombreLimpio = (ocrData.nombre || '')
                    .replace(/^\s*\([sS]\)[:\s]*/g, '')
                    .replace(/^\s*[sS]\s*\)[:\s]*/g, '')
                    .trim();

                setClientFiscalData({
                    rfc: ocrData.rfc,
                    curp: ocrData.curp,
                    razonSocial: nombreLimpio,
                    tipoPersona: ocrData.tipoPersona,
                    regimenFiscal: ocrData.regimenFiscal,
                    codigoPostal: ocrData.domicilio?.codigoPostal || null,
                    estado: ocrData.domicilio?.estado || null,
                    domicilioCompleto: domicilioParts || null,
                    confianza: ocrData.confianza,
                });

                // Actualizar el RFC del cliente con el extraido
                setClientRfc(ocrData.rfc);
            } else {
                Alert.alert('Error', 'No se pudieron extraer los datos del documento.');
                setClientDocumentImage(null);
            }

        } catch (error: any) {
            console.error('Client OCR Error:', error);
            Alert.alert('Error', 'No se pudo procesar el documento. Intente de nuevo.');
            setClientDocumentImage(null);
        } finally {
            setIsProcessingClientOCR(false);
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
        if (!fiscalData?.rfc) {
            Alert.alert('Error', 'RFC es requerido');
            return;
        }
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
            // Subir foto de perfil si el usuario seleccionó una
            let avatarUrl: string | null = null;
            if (userProfilePhoto) {
                const uploadResult = await api.uploadFile(userProfilePhoto, 'image');
                if (uploadResult.data?.url) {
                    avatarUrl = uploadResult.data.url;
                }
                // Si falla la subida de foto, continuar sin ella (es opcional)
            }

            const result = await login(fiscalData.rfc, {
                password: userPassword,
                phone: userPhone,
                razonSocial: fiscalData.razonSocial || '',
                tipoPersona: fiscalData.tipoPersona || 'fisica',
                termsAccepted: true,
                isRegistration: true,
                role: 'user',
                // Campos adicionales
                curp: fiscalData.curp || null,
                regimenFiscal: fiscalData.regimenFiscal || null,
                codigoPostal: fiscalData.codigoPostal || null,
                estado: fiscalData.estado || null,
                domicilio: fiscalData.domicilioCompleto || null,
                avatarUrl: avatarUrl,
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

    // Handle user login (existing users)
    const handleUserLogin = async () => {
        if (!userLoginRfc) {
            Alert.alert('Error', 'RFC es requerido');
            return;
        }
        if (!userLoginPassword) {
            Alert.alert('Error', 'Contraseña es requerida');
            return;
        }

        setIsLoading(true);
        try {
            const result = await login(userLoginRfc.toUpperCase(), {
                password: userLoginPassword,
                role: 'user',
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
            setClientDocumentImage(null);
            setClientFiscalData(null);
            setIsRegistering(false);
            return;
        }

        if (role === 'user') {
            resetUserStates();
            setViewMode('USER_LOGIN');
            return;
        }
    };

    const goBack = () => {
        switch (viewMode) {
            case 'USER_LOGIN':
            case 'CONSULTANT_LOGIN':
            case 'ADVISOR_LOGIN':
                setViewMode('ROLE_SELECTION');
                break;
            case 'USER_TERMS':
                setRfcInput('');
                setFiscalData(null);
                setViewMode('USER_LOGIN');
                setIsUserRegistering(true);
                break;
            case 'USER_REGISTER':
                setRfcInput('');
                setFiscalData(null);
                setViewMode('USER_LOGIN');
                setIsUserRegistering(true);
                break;
            case 'USER_WELCOME':
                setViewMode('USER_REGISTER');
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

    // USER LOGIN Screen - Login or Register with toggle
    if (viewMode === 'USER_LOGIN') {
        return (
            <View style={styles.container}>
                <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={{ flex: 1 }}
                >
                    <ScrollView contentContainerStyle={styles.scrollContent}>
                        <View style={styles.logoContainer}>
                            <Image
                                source={require('../../assets/logo.png')}
                                style={styles.logo}
                                resizeMode="contain"
                            />
                        </View>

                        <Text style={styles.welcomeText}>{isUserRegistering ? 'Registro' : 'Bienvenido'}</Text>

                        <View style={styles.formSection}>
                            {/* Login mode - RFC and Password */}
                            {!isUserRegistering && (
                                <>
                                    <Text style={styles.label}>RFC</Text>
                                    <TextInput
                                        style={styles.input}
                                        value={userLoginRfc}
                                        onChangeText={(text) => setUserLoginRfc(text.toUpperCase())}
                                        placeholder="Ingrese su RFC"
                                        placeholderTextColor="#A0AEC0"
                                        autoCapitalize="characters"
                                        maxLength={13}
                                    />

                                    <Text style={styles.label}>Contrasena</Text>
                                    <View style={styles.passwordContainer}>
                                        <TextInput
                                            style={styles.passwordInput}
                                            value={userLoginPassword}
                                            onChangeText={setUserLoginPassword}
                                            secureTextEntry={!showPassword}
                                            placeholder="Ingrese su contrasena"
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
                                </>
                            )}

                            {/* Register mode - RFC Input */}
                            {isUserRegistering && (
                                <>
                                    {/* Subtítulo */}
                                    <Text style={styles.registerSubtitle}>REGISTRE SU RFC</Text>

                                    {isConsultingRFC ? (
                                        <View style={styles.processingCard}>
                                            <View style={styles.processingSpinner}>
                                                <ActivityIndicator size="large" color="#5474BC" />
                                            </View>
                                            <Text style={styles.processingTitle}>Consultando datos</Text>
                                            <Text style={styles.processingSubtitle}>Obteniendo información del SAT...</Text>
                                        </View>
                                    ) : (
                                        <View style={styles.rfcInputWithIcon}>
                                            <Ionicons name="card-outline" size={24} color="#5474BC" style={styles.rfcInputIcon} />
                                            <TextInput
                                                style={styles.rfcInputField}
                                                value={rfcInput}
                                                onChangeText={(text) => setRfcInput(text.toUpperCase())}
                                                placeholder="RFC"
                                                placeholderTextColor="#A0AEC0"
                                                autoCapitalize="characters"
                                                maxLength={13}
                                            />
                                            {rfcInput.length > 0 && (
                                                <TouchableOpacity onPress={() => setRfcInput('')}>
                                                    <Ionicons name="close-circle" size={20} color="#A0AEC0" />
                                                </TouchableOpacity>
                                            )}
                                        </View>
                                    )}
                                </>
                            )}

                            {isUserRegistering ? (
                                <>
                                    {/* Botón outline para registro */}
                                    <TouchableOpacity
                                        style={[
                                            styles.outlineButton,
                                            (isLoading || isConsultingRFC || rfcInput.trim().length < 12) && styles.outlineButtonDisabled
                                        ]}
                                        onPress={consultarRFCCheckId}
                                        disabled={isLoading || isConsultingRFC || rfcInput.trim().length < 12}
                                    >
                                        {isConsultingRFC ? (
                                            <ActivityIndicator size="small" color="#697CA3" />
                                        ) : (
                                            <Text style={styles.outlineButtonText}>INICIAR SESIÓN</Text>
                                        )}
                                    </TouchableOpacity>

                                    {/* Términos y condiciones */}
                                    <View style={styles.termsFooter}>
                                        <View style={styles.termsCheckbox}>
                                            <View style={styles.termsCheckboxCircle} />
                                        </View>
                                        <Text style={styles.termsFooterText}>
                                            Al tocar "Aceptar y Continuar" a continuación, acepta los{' '}
                                            <Text style={styles.termsFooterLink} onPress={() => setShowTermsModal(true)}>
                                                Términos y Condiciones de Servicio
                                            </Text>
                                            , y reconoces que le leiste la{' '}
                                            <Text style={styles.termsFooterLink} onPress={() => setShowTermsModal(true)}>
                                                Política de Privacidad
                                            </Text>
                                            .
                                        </Text>
                                    </View>
                                </>
                            ) : (
                                <GradientButton
                                    title="INICIAR SESION"
                                    onPress={handleUserLogin}
                                    disabled={isLoading}
                                    loading={isLoading}
                                    style={{ marginTop: 40 }}
                                />
                            )}

                            <TouchableOpacity
                                style={{ marginTop: 20, alignItems: 'center' }}
                                onPress={() => {
                                    setIsUserRegistering(!isUserRegistering);
                                    setRfcInput('');
                                    setFiscalData(null);
                                    setUserLoginRfc('');
                                    setUserLoginPassword('');
                                }}
                            >
                                <Text style={{ color: '#5474BC', fontWeight: 'bold' }}>
                                    {isUserRegistering ? '¿Ya tienes cuenta? Inicia Sesion' : '¿No tienes cuenta? Registrate'}
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
                </KeyboardAvoidingView>
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
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={{ flex: 1 }}
                >
                    <ScrollView
                        contentContainerStyle={styles.scrollContent}
                        keyboardShouldPersistTaps="handled"
                    >
                        {/* Logo */}
                        <View style={styles.logoContainer}>
                            <Image
                                source={require('../../assets/logo.png')}
                                style={styles.logoLarge}
                                resizeMode="contain"
                            />
                        </View>

                        <View style={styles.formSection}>
                            {/* Nombre (solo lectura, viene del RFC) */}
                            <Text style={styles.labelSmall}>Nombre</Text>
                            <View style={styles.inputSimple}>
                                <Text style={styles.inputSimpleText} numberOfLines={2}>
                                    {fiscalData?.razonSocial || 'Sin nombre'}
                                </Text>
                            </View>

                            <Text style={styles.labelSmall}>Telefono</Text>
                            <TextInput
                                style={styles.inputSimple}
                                value={userPhone}
                                onChangeText={setUserPhone}
                                placeholder="55 5393 2100"
                                placeholderTextColor="#A0AEC0"
                                keyboardType="phone-pad"
                                maxLength={10}
                            />

                            <Text style={styles.labelSmall}>Contraseña</Text>
                            <View style={styles.inputWithIconRight}>
                                <TextInput
                                    style={styles.inputWithIconField}
                                    value={userPassword}
                                    onChangeText={setUserPassword}
                                    secureTextEntry={!showPassword}
                                    placeholder="Contraseña"
                                    placeholderTextColor="#A0AEC0"
                                />
                                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                                    <Ionicons
                                        name="lock-closed-outline"
                                        size={20}
                                        color="#5474BC"
                                    />
                                </TouchableOpacity>
                            </View>

                            <Text style={styles.labelSmall}>Confirmar contraseña</Text>
                            <View style={styles.inputWithIconRight}>
                                <TextInput
                                    style={styles.inputWithIconField}
                                    value={userConfirmPassword}
                                    onChangeText={setUserConfirmPassword}
                                    secureTextEntry={!showPassword}
                                    placeholder="Confirmar contraseña"
                                    placeholderTextColor="#A0AEC0"
                                />
                                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                                    <Ionicons
                                        name="lock-closed-outline"
                                        size={20}
                                        color="#5474BC"
                                    />
                                </TouchableOpacity>
                            </View>

                            <GradientButton
                                title="COMENZAR"
                                onPress={() => {
                                    // Validar campos antes de continuar
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
                                    setViewMode('USER_WELCOME');
                                }}
                                disabled={isLoading}
                                loading={isLoading}
                                style={{ marginTop: 50 }}
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

    // USER WELCOME Screen - Pantalla de bienvenida con foto de perfil
    if (viewMode === 'USER_WELCOME') {
        return (
            <View style={styles.container}>
                <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
                <ScrollView contentContainerStyle={styles.welcomeScrollContent}>
                    {/* Título */}
                    <Text style={styles.welcomeTitleBold}>BIENVENIDO</Text>

                    {/* Foto de Perfil editable */}
                    <TouchableOpacity
                        style={styles.welcomePhotoContainer}
                        onPress={showPhotoOptions}
                        activeOpacity={0.7}
                    >
                        {userProfilePhoto ? (
                            <Image
                                source={{ uri: userProfilePhoto }}
                                style={styles.welcomePhotoImage}
                            />
                        ) : (
                            <View style={styles.welcomePhotoPlaceholder}>
                                <Ionicons name="camera" size={32} color="#FFFFFF" />
                            </View>
                        )}
                        <View style={styles.welcomePhotoBadge}>
                            <Ionicons name="pencil" size={12} color="#FFFFFF" />
                        </View>
                    </TouchableOpacity>

                    {/* Razón Social */}
                    <View style={styles.welcomeInfoCard}>
                        <Text style={styles.welcomeInfoText} numberOfLines={2}>
                            {fiscalData?.razonSocial || 'Sin nombre'}
                        </Text>
                        <Ionicons name="qr-code-outline" size={20} color="#5474BC" />
                    </View>

                    {/* RFC */}
                    <View style={styles.welcomeInfoCard}>
                        <Text style={styles.welcomeInfoText}>
                            {fiscalData?.rfc || ''}
                        </Text>
                        <Ionicons name="lock-closed-outline" size={20} color="#5474BC" />
                    </View>

                    {/* Logo Yaakob BE HEART */}
                    <View style={styles.welcomeLogoContainer}>
                        <Image
                            source={require('../../assets/logo.png')}
                            style={styles.welcomeLogoSmall}
                            resizeMode="contain"
                        />
                        <Text style={styles.welcomeLogoText}>BE HEART</Text>
                    </View>

                    {/* Texto de seguridad */}
                    <View style={styles.welcomeSecurityContainer}>
                        <Ionicons name="shield-checkmark" size={20} color="#5474BC" />
                        <Text style={styles.welcomeSecurityText}>
                            Su registro a sido completado, su información se encuentra protegida por{' '}
                            <Text style={styles.welcomeSecurityLink}>algoritmos criptográficos PQC</Text>
                            , bajos los estatutos del{' '}
                            <Text style={styles.welcomeSecurityLink}>Instituto de Nacional de Normas y Tecnología</Text>.
                        </Text>
                    </View>

                    {/* Botón Siguiente */}
                    <GradientButton
                        title="SIGUIENTE"
                        onPress={handleUserRegister}
                        disabled={isLoading}
                        loading={isLoading}
                        style={{ marginTop: 30, marginHorizontal: 40 }}
                    />
                </ScrollView>
            </View>
        );
    }

    // ADVISOR LOGIN Screen
    if (viewMode === 'ADVISOR_LOGIN') {
        return (
            <View style={styles.container}>
                <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={{ flex: 1 }}
                >
                    <ScrollView
                        contentContainerStyle={styles.scrollContent}
                        keyboardShouldPersistTaps="handled"
                    >
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
                                <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color="#697CA3" />
                            </TouchableOpacity>
                        </View>

                        {isRegistering && (
                            <>
                                {/* Simple description text */}
                                <Text style={[styles.uploadDescription, { marginTop: 24 }]}>
                                    Suba la Constancia de Situacion Fiscal del cliente
                                </Text>

                                {isProcessingClientOCR ? (
                                    <View style={styles.processingCard}>
                                        <View style={styles.processingSpinner}>
                                            <ActivityIndicator size="large" color="#5474BC" />
                                        </View>
                                        <Text style={styles.processingTitle}>Procesando documento</Text>
                                        <Text style={styles.processingSubtitle}>Extrayendo datos del cliente...</Text>
                                    </View>
                                ) : clientFiscalData ? (
                                    <View style={styles.successCard}>
                                        <View style={styles.successHeader}>
                                            <View style={[styles.successIconContainer, { backgroundColor: '#38A169' }]}>
                                                <Ionicons name="checkmark-circle" size={28} color="#FFFFFF" />
                                            </View>
                                            <Text style={styles.successTitle}>Datos del Cliente</Text>
                                        </View>
                                        <View style={styles.successDataList}>
                                            <View style={styles.successDataRow}>
                                                <Text style={styles.successDataLabel}>RFC</Text>
                                                <Text style={styles.successDataValue}>{clientFiscalData.rfc}</Text>
                                            </View>
                                            <View style={styles.successDataRow}>
                                                <Text style={styles.successDataLabel}>Nombre</Text>
                                                <Text style={styles.successDataValue} numberOfLines={2}>{clientFiscalData.razonSocial}</Text>
                                            </View>
                                            {clientFiscalData.curp && (
                                                <View style={styles.successDataRow}>
                                                    <Text style={styles.successDataLabel}>CURP</Text>
                                                    <Text style={styles.successDataValue}>{clientFiscalData.curp}</Text>
                                                </View>
                                            )}
                                        </View>
                                        <TouchableOpacity
                                            style={styles.changeDocButton}
                                            onPress={() => {
                                                setClientDocumentImage(null);
                                                setClientFiscalData(null);
                                                setClientRfc('');
                                            }}
                                        >
                                            <Ionicons name="refresh" size={18} color="#5474BC" />
                                            <Text style={styles.changeDocText}>Cambiar documento</Text>
                                        </TouchableOpacity>
                                    </View>
                                ) : (
                                    <View style={styles.uploadOptionsVertical}>
                                        {/* Upload Option - Camera */}
                                        <TouchableOpacity
                                            style={styles.uploadOptionRow}
                                            onPress={() => pickClientFiscalDocument(true)}
                                            activeOpacity={0.7}
                                        >
                                            <View style={styles.uploadOptionIconBlue}>
                                                <Ionicons name="camera" size={24} color="#5474BC" />
                                            </View>
                                            <View style={styles.uploadOptionTextContainer}>
                                                <Text style={styles.uploadOptionRowTitle}>Tomar Foto</Text>
                                                <Text style={styles.uploadOptionRowDesc}>Usar la camara del dispositivo</Text>
                                            </View>
                                            <Ionicons name="chevron-forward" size={20} color="#A0AEC0" />
                                        </TouchableOpacity>

                                        {/* Upload Option - Gallery */}
                                        <TouchableOpacity
                                            style={styles.uploadOptionRow}
                                            onPress={() => pickClientFiscalDocument(false)}
                                            activeOpacity={0.7}
                                        >
                                            <View style={styles.uploadOptionIconBlue}>
                                                <Ionicons name="images" size={24} color="#5474BC" />
                                            </View>
                                            <View style={styles.uploadOptionTextContainer}>
                                                <Text style={styles.uploadOptionRowTitle}>Galeria</Text>
                                                <Text style={styles.uploadOptionRowDesc}>Seleccionar imagen existente</Text>
                                            </View>
                                            <Ionicons name="chevron-forward" size={20} color="#A0AEC0" />
                                        </TouchableOpacity>

                                        {/* Upload Option - PDF */}
                                        <TouchableOpacity
                                            style={styles.uploadOptionRow}
                                            onPress={pickClientPDFDocument}
                                            activeOpacity={0.7}
                                        >
                                            <View style={styles.uploadOptionIconBlue}>
                                                <Ionicons name="document-text" size={24} color="#5474BC" />
                                            </View>
                                            <View style={styles.uploadOptionTextContainer}>
                                                <Text style={styles.uploadOptionRowTitle}>Archivo PDF</Text>
                                                <Text style={styles.uploadOptionRowDesc}>Seleccionar documento PDF</Text>
                                            </View>
                                            <Ionicons name="chevron-forward" size={20} color="#A0AEC0" />
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </>
                        )}

                        <GradientButton
                            title={isRegistering ? 'REGISTRARSE' : 'INICIAR SESION'}
                            onPress={performAdvisorLogin}
                            disabled={isLoading || (isRegistering && !clientFiscalData)}
                            loading={isLoading}
                            style={{ marginTop: 40 }}
                        />

                        <TouchableOpacity
                            style={{ marginTop: 20, alignItems: 'center' }}
                            onPress={() => {
                                setIsRegistering(!isRegistering);
                                setClientDocumentImage(null);
                                setClientFiscalData(null);
                                setClientRfc('');
                            }}
                        >
                            <Text style={{ color: '#5474BC', fontWeight: 'bold' }}>
                                {isRegistering ? '¿Ya tienes cuenta? Inicia Sesion' : '¿No tienes cuenta? Registrate'}
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
                </KeyboardAvoidingView>
            </View>
        );
    }

    // CONSULTANT LOGIN Screen
    if (viewMode === 'CONSULTANT_LOGIN') {
        return (
            <View style={styles.container}>
                <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={{ flex: 1 }}
                >
                    <ScrollView
                        contentContainerStyle={styles.scrollContent}
                        keyboardShouldPersistTaps="handled"
                    >
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
                                    <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color="#697CA3" />
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
                    </ScrollView>
                </KeyboardAvoidingView>
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
    // Estilos para USER_AUTH_CHOICE
    authChoiceButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        paddingVertical: 20,
        paddingHorizontal: 20,
        borderRadius: 16,
        shadowColor: '#697CA3',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 3,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    authChoiceIconContainer: {
        width: 50,
        height: 50,
        borderRadius: 12,
        backgroundColor: '#F0F4FF',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    authChoiceTextContainer: {
        flex: 1,
    },
    authChoiceTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1A2138',
        marginBottom: 4,
    },
    authChoiceSubtitle: {
        fontSize: 13,
        color: '#697CA3',
    },
    // Estilos para OCR del cliente (Asesor)
    uploadButtonSmall: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        paddingVertical: 28,
        paddingHorizontal: 16,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: '#E2E8F0',
        borderStyle: 'dashed',
    },
    uploadButtonTextSmall: {
        fontSize: 13,
        fontWeight: '600',
        color: '#5474BC',
        marginTop: 10,
    },
    clientDataCard: {
        backgroundColor: '#F0FFF4',
        borderRadius: 16,
        padding: 20,
        borderWidth: 1,
        borderColor: '#9AE6B4',
        marginTop: 16,
    },
    clientDataHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        gap: 10,
    },
    clientDataTitle: {
        fontSize: 17,
        fontWeight: '600',
        color: '#276749',
    },
    clientDataRow: {
        flexDirection: 'row',
        marginBottom: 10,
        alignItems: 'flex-start',
    },
    clientDataLabel: {
        fontSize: 14,
        color: '#697CA3',
        width: 75,
    },
    clientDataValue: {
        fontSize: 14,
        fontWeight: '500',
        color: '#1A2138',
        flex: 1,
    },
    changeDocumentButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 16,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: '#9AE6B4',
        gap: 8,
    },
    changeDocumentText: {
        fontSize: 14,
        color: '#5474BC',
        fontWeight: '600',
    },
    // Upload title
    uploadTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1A2138',
        textAlign: 'center',
        marginTop: 20,
        marginBottom: 8,
    },
    // Upload description text
    uploadDescription: {
        fontSize: 15,
        color: '#697CA3',
        textAlign: 'center',
        marginBottom: 20,
        lineHeight: 22,
    },
    // Vertical upload options
    uploadOptionsVertical: {
        gap: 12,
        marginBottom: 10,
    },
    uploadOptionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 14,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    uploadOptionIconBlue: {
        width: 48,
        height: 48,
        borderRadius: 12,
        backgroundColor: '#EBF4FF',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
    },
    uploadOptionTextContainer: {
        flex: 1,
    },
    uploadOptionRowTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: '#1A2138',
        marginBottom: 2,
    },
    uploadOptionRowDesc: {
        fontSize: 13,
        color: '#A0AEC0',
    },
    processingCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 32,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 2,
        marginBottom: 10,
    },
    processingSpinner: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#EBF4FF',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    processingTitle: {
        fontSize: 17,
        fontWeight: '600',
        color: '#1A2138',
        marginBottom: 4,
    },
    processingSubtitle: {
        fontSize: 14,
        color: '#697CA3',
    },
    successCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 2,
        marginBottom: 10,
    },
    successHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    successIconContainer: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: '#38A169',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    successTitle: {
        fontSize: 17,
        fontWeight: '700',
        color: '#1A2138',
    },
    successDataList: {
        gap: 12,
    },
    successDataRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    successDataLabel: {
        fontSize: 13,
        color: '#697CA3',
        width: 70,
        fontWeight: '500',
    },
    successDataValue: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1A2138',
        flex: 1,
    },
    changeDocButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 16,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
        gap: 8,
    },
    changeDocText: {
        fontSize: 14,
        color: '#5474BC',
        fontWeight: '600',
    },
    // Estilos para RFC Input
    registerSubtitle: {
        fontSize: 12,
        fontWeight: '600',
        color: '#A0AEC0',
        textAlign: 'center',
        letterSpacing: 1,
        marginBottom: 32,
        textTransform: 'uppercase',
    },
    rfcInputWithIcon: {
        flexDirection: 'row',
        alignItems: 'center',
        width: '100%',
        height: 56,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 12,
        paddingHorizontal: 16,
        backgroundColor: '#FFFFFF',
        marginBottom: 20,
    },
    rfcInputIcon: {
        marginRight: 12,
    },
    rfcInputField: {
        flex: 1,
        fontSize: 16,
        fontWeight: '500',
        color: '#1A2138',
        letterSpacing: 0.5,
    },
    outlineButton: {
        width: '100%',
        height: 56,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        marginTop: 10,
    },
    outlineButtonDisabled: {
        opacity: 0.6,
    },
    outlineButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#697CA3',
        letterSpacing: 0.5,
    },
    termsFooter: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginTop: 40,
        paddingHorizontal: 10,
    },
    termsCheckbox: {
        marginRight: 10,
        marginTop: 2,
    },
    termsCheckboxCircle: {
        width: 18,
        height: 18,
        borderRadius: 9,
        borderWidth: 1,
        borderColor: '#D1D5DB',
        backgroundColor: '#FFFFFF',
    },
    termsFooterText: {
        flex: 1,
        fontSize: 11,
        color: '#9CA3AF',
        lineHeight: 16,
    },
    termsFooterLink: {
        color: '#5474BC',
        fontWeight: '500',
    },
    rfcInputHeader: {
        alignItems: 'center',
        marginBottom: 32,
    },
    rfcIconContainer: {
        width: 72,
        height: 72,
        borderRadius: 20,
        backgroundColor: '#EBF4FF',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    rfcInputContainer: {
        marginBottom: 10,
    },
    rfcInput: {
        width: '100%',
        height: 60,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 30,
        paddingHorizontal: 24,
        fontSize: 16,
        fontWeight: '500',
        color: '#1A2138',
        backgroundColor: '#F8FAFC',
        textAlign: 'center',
        letterSpacing: 1,
    },
    rfcInputHelp: {
        fontSize: 13,
        color: '#A0AEC0',
        textAlign: 'center',
        marginTop: 12,
        lineHeight: 18,
    },
    // Estilos para foto de perfil
    profilePhotoContainer: {
        alignSelf: 'center',
        marginBottom: 24,
        position: 'relative',
    },
    profilePhotoImage: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#F1F5F9',
    },
    profilePhotoPlaceholder: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#F1F5F9',
        borderWidth: 2,
        borderColor: '#E2E8F0',
        borderStyle: 'dashed',
        justifyContent: 'center',
        alignItems: 'center',
    },
    profilePhotoText: {
        fontSize: 12,
        color: '#A0AEC0',
        marginTop: 4,
    },
    removePhotoButton: {
        position: 'absolute',
        top: -4,
        right: -4,
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
    },
    // Estilos para foto de perfil centrada (pantalla registro)
    profilePhotoContainerCentered: {
        alignSelf: 'center',
        marginBottom: 30,
        position: 'relative',
    },
    profilePhotoLarge: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: '#5474BC',
    },
    profilePhotoPlaceholderLarge: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: '#A8BEE8',
        justifyContent: 'center',
        alignItems: 'center',
    },
    editPhotoBadge: {
        position: 'absolute',
        bottom: 4,
        right: 4,
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#5474BC',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: '#FFFFFF',
    },
    // Input de solo lectura
    readOnlyInput: {
        width: '100%',
        minHeight: 50,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        backgroundColor: '#F8FAFC',
        justifyContent: 'center',
    },
    readOnlyText: {
        fontSize: 16,
        color: '#1A2138',
    },
    // Estilos para pantalla de registro simplificada
    logoLarge: {
        width: 140,
        height: 140,
    },
    labelSmall: {
        fontSize: 12,
        fontWeight: '500',
        color: '#5474BC',
        marginBottom: 6,
        marginTop: 16,
    },
    inputSimple: {
        width: '100%',
        height: 50,
        borderBottomWidth: 1,
        borderBottomColor: '#E2E8F0',
        paddingHorizontal: 0,
        fontSize: 16,
        color: '#1A2138',
        backgroundColor: 'transparent',
        justifyContent: 'center',
    },
    inputSimpleText: {
        fontSize: 16,
        color: '#1A2138',
    },
    inputWithIconRight: {
        flexDirection: 'row',
        alignItems: 'center',
        width: '100%',
        height: 50,
        borderBottomWidth: 1,
        borderBottomColor: '#E2E8F0',
        backgroundColor: 'transparent',
    },
    inputWithIconField: {
        flex: 1,
        fontSize: 16,
        color: '#1A2138',
        paddingHorizontal: 0,
    },
    // Estilos para pantalla USER_WELCOME
    welcomeScrollContent: {
        flexGrow: 1,
        paddingHorizontal: 30,
        paddingVertical: 60,
        alignItems: 'center',
    },
    welcomeTitleBold: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1A2138',
        marginBottom: 30,
        letterSpacing: 1,
    },
    welcomePhotoContainer: {
        position: 'relative',
        marginBottom: 40,
    },
    welcomePhotoImage: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: '#5474BC',
    },
    welcomePhotoPlaceholder: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: '#A8BEE8',
        justifyContent: 'center',
        alignItems: 'center',
    },
    welcomePhotoBadge: {
        position: 'absolute',
        bottom: 4,
        right: 4,
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#5474BC',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#FFFFFF',
    },
    welcomeInfoCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        paddingVertical: 16,
        paddingHorizontal: 20,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 12,
        backgroundColor: '#FFFFFF',
        marginBottom: 12,
    },
    welcomeInfoText: {
        flex: 1,
        fontSize: 14,
        fontWeight: '500',
        color: '#1A2138',
        marginRight: 10,
    },
    welcomeLogoContainer: {
        alignItems: 'center',
        marginTop: 30,
        marginBottom: 20,
    },
    welcomeLogoSmall: {
        width: 80,
        height: 80,
    },
    welcomeLogoText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#1A2138',
        letterSpacing: 2,
        marginTop: 4,
    },
    welcomeSecurityContainer: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingHorizontal: 10,
        marginTop: 20,
    },
    welcomeSecurityText: {
        flex: 1,
        fontSize: 10,
        color: '#9CA3AF',
        lineHeight: 14,
        marginLeft: 8,
    },
    welcomeSecurityLink: {
        color: '#5474BC',
        fontWeight: '500',
    },
});

export default LoginScreen;
