import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types';
import colors from '../../theme/colors';

type TermsScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Terms'>;

interface TermsScreenProps {
    navigation: TermsScreenNavigationProp;
}

export const TermsScreen: React.FC<TermsScreenProps> = ({ navigation }) => {
    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="chevron-back" size={28} color={colors.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.title}>Términos y Condiciones</Text>
                <View style={styles.placeholder} />
            </View>

            <ScrollView
                style={styles.content}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <Text style={styles.lastUpdated}>Última actualización: 1 de Enero de 2026</Text>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>1. Introducción</Text>
                    <Text style={styles.paragraph}>
                        Bienvenido a nuestra aplicación de consultoría. Al acceder y utilizar nuestros servicios, aceptas cumplir y estar sujeto a los siguientes términos y condiciones.
                    </Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>2. Uso del Servicio</Text>
                    <Text style={styles.paragraph}>
                        Nuestra plataforma está diseñada para facilitar la comunicación entre usuarios y consultores profesionales. Te comprometes a utilizar el servicio de manera responsable y legal.
                    </Text>
                    <Text style={styles.paragraph}>
                        Queda prohibido el uso de lenguaje ofensivo, discriminatorio o cualquier forma de acoso hacia los consultores u otros usuarios.
                    </Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>3. Privacidad y Datos</Text>
                    <Text style={styles.paragraph}>
                        Respetamos tu privacidad. Toda la información compartida a través de la aplicación está protegida. Para más detalles, consulta nuestra sección de Privacidad en los Ajustes.
                    </Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>4. Responsabilidad</Text>
                    <Text style={styles.paragraph}>
                        Los consejos proporcionados por los consultores son opiniones profesionales basadas en la información que proporcionas. No nos hacemos responsables de las decisiones tomadas basándose únicamente en esta información.
                    </Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>5. Modificaciones</Text>
                    <Text style={styles.paragraph}>
                        Nos reservamos el derecho de modificar estos términos en cualquier momento. Te notificaremos sobre cambios significativos a través de la aplicación.
                    </Text>
                </View>

                <View style={styles.footer}>
                    <Text style={styles.footerText}>
                        © 2026 Yaakob. Todos los derechos reservados.
                    </Text>
                    <Text style={styles.footerText}>contacto@yaakob.com</Text>
                </View>
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 60,
        paddingBottom: 16,
        paddingHorizontal: 16,
        backgroundColor: colors.backgroundSecondary,
    },
    backButton: {
        padding: 4,
    },
    title: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.textPrimary,
    },
    placeholder: {
        width: 36,
    },
    content: {
        flex: 1,
    },
    scrollContent: {
        padding: 24,
        paddingBottom: 60,
    },
    lastUpdated: {
        fontSize: 14,
        color: colors.textMuted,
        marginBottom: 24,
        fontStyle: 'italic',
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.textPrimary,
        marginBottom: 12,
    },
    paragraph: {
        fontSize: 15,
        color: colors.textSecondary,
        lineHeight: 24,
        marginBottom: 12,
        textAlign: 'justify',
    },
    footer: {
        marginTop: 20,
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: colors.divider,
        paddingTop: 24,
    },
    footerText: {
        fontSize: 13,
        color: colors.textMuted,
        marginBottom: 4,
    },
});

export default TermsScreen;
