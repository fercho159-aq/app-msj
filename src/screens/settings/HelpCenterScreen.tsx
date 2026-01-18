import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types';
import colors from '../../theme/colors';

type HelpCenterScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'HelpCenter'>;

interface HelpCenterScreenProps {
    navigation: HelpCenterScreenNavigationProp;
}

interface FaqItemProps {
    question: string;
    answer: string;
}

const FaqItem: React.FC<FaqItemProps> = ({ question, answer }) => {
    const [expanded, setExpanded] = React.useState(false);

    return (
        <TouchableOpacity
            style={styles.faqItem}
            activeOpacity={0.7}
            onPress={() => setExpanded(!expanded)}
        >
            <View style={styles.faqHeader}>
                <Text style={styles.faqQuestion}>{question}</Text>
                <Ionicons
                    name={expanded ? "chevron-up" : "chevron-down"}
                    size={20}
                    color={colors.textMuted}
                />
            </View>
            {expanded && (
                <Text style={styles.faqAnswer}>{answer}</Text>
            )}
        </TouchableOpacity>
    );
};

export const HelpCenterScreen: React.FC<HelpCenterScreenProps> = ({ navigation }) => {
    const handleEmailSupport = () => {
        Linking.openURL('mailto:soporte@tuapp.com');
    };

    const handleWhatsappSupport = () => {
        // Asumiendo un número genérico para el ejemplo
        Linking.openURL('https://wa.me/5215555555555');
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="chevron-back" size={28} color={colors.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.title}>Centro de Ayuda</Text>
                <View style={styles.placeholder} />
            </View>

            <ScrollView
                style={styles.content}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Contact Support */}
                <View style={styles.contactContainer}>
                    <Text style={styles.sectionTitle}>¿Necesitas ayuda adicional?</Text>
                    <View style={styles.contactButtons}>
                        <TouchableOpacity style={styles.contactButton} onPress={handleEmailSupport}>
                            <View style={[styles.iconContainer, { backgroundColor: '#E3F2FD' }]}>
                                <Ionicons name="mail" size={24} color="#1976D2" />
                            </View>
                            <Text style={styles.contactButtonText}>Email</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.contactButton} onPress={handleWhatsappSupport}>
                            <View style={[styles.iconContainer, { backgroundColor: '#E8F5E9' }]}>
                                <Ionicons name="logo-whatsapp" size={24} color="#2E7D32" />
                            </View>
                            <Text style={styles.contactButtonText}>WhatsApp</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* FAQ Section */}
                <Text style={styles.sectionTitle}>Preguntas Frecuentes</Text>
                <View style={styles.section}>
                    <FaqItem
                        question="¿Cómo solicito una llamada?"
                        answer="Para solicitar una llamada, ve a la pantalla de Chat con tu consultor y presiona el botón rojo de teléfono en la esquina superior derecha. Llena el formulario y envíalo."
                    />
                    <FaqItem
                        question="¿Cómo cambio mi contraseña?"
                        answer="Por razones de seguridad, para cambiar tu contraseña debes contactar directamente a soporte técnico o solicitarlo a tu administrador."
                    />
                    <FaqItem
                        question="¿Puedo usar la app en modo oscuro?"
                        answer="Sí, puedes cambiar la apariencia de la aplicación yendo a Ajustes > Apariencia y seleccionando el tema 'Oscuro'."
                    />
                    <FaqItem
                        question="¿Cómo subo archivos en el chat?"
                        answer="Dentro de un chat, presiona el botón '+' a la izquierda del campo de texto para abrir el menú de adjuntos. Puedes seleccionar fotos o documentos de tu dispositivo."
                    />
                    <FaqItem
                        question="¿Mis mensajes son privados?"
                        answer="Sí, nos tomamos la privacidad muy en serio. Tus mensajes están encriptados y solo son visibles para ti y el consultor asignado."
                    />
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
        padding: 20,
        paddingBottom: 40,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.textPrimary,
        marginBottom: 16,
        marginTop: 8,
    },
    section: {
        backgroundColor: colors.surface,
        borderRadius: 16,
        overflow: 'hidden',
        marginBottom: 24,
    },
    // Contact Styles
    contactContainer: {
        alignItems: 'center',
        marginBottom: 32,
    },
    contactButtons: {
        flexDirection: 'row',
        gap: 24,
        marginTop: 16,
    },
    contactButton: {
        alignItems: 'center',
        gap: 8,
    },
    iconContainer: {
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
    },
    contactButtonText: {
        fontSize: 14,
        fontWeight: '500',
        color: colors.textPrimary,
    },
    // FAQ Styles
    faqItem: {
        padding: 16,
        borderBottomWidth: 0.5,
        borderBottomColor: colors.divider,
    },
    faqHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    faqQuestion: {
        fontSize: 15,
        fontWeight: '500',
        color: colors.textPrimary,
        flex: 1,
        paddingRight: 16,
    },
    faqAnswer: {
        marginTop: 12,
        fontSize: 14,
        color: colors.textSecondary,
        lineHeight: 20,
    },
});

export default HelpCenterScreen;
