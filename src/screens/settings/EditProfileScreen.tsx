import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    Image,
    Alert,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api';
import { RootStackParamList } from '../../types';
import colors, { gradients } from '../../theme/colors';

type EditProfileScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'EditProfile'>;

interface EditProfileScreenProps {
    navigation: EditProfileScreenNavigationProp;
}

export const EditProfileScreen: React.FC<EditProfileScreenProps> = ({ navigation }) => {
    const { user } = useAuth();
    const [name, setName] = useState(user?.name || '');
    const [avatar, setAvatar] = useState(user?.avatar_url || '');
    const [isLoading, setIsLoading] = useState(false);

    const handlePickImage = async () => {
        const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

        if (!permissionResult.granted) {
            Alert.alert('Permiso requerido', 'Necesitamos acceso a tu galería para cambiar la foto.');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
        });

        if (!result.canceled && result.assets[0]) {
            setAvatar(result.assets[0].uri);
        }
    };

    const handleSave = async () => {
        if (!name.trim()) {
            Alert.alert('Error', 'El nombre no puede estar vacío');
            return;
        }

        setIsLoading(true);
        // Por ahora solo mostramos el mensaje de éxito
        // TODO: Implementar actualización en el servidor
        setTimeout(() => {
            setIsLoading(false);
            Alert.alert('Éxito', 'Perfil actualizado correctamente', [
                { text: 'OK', onPress: () => navigation.goBack() }
            ]);
        }, 1000);
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="chevron-back" size={28} color={colors.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.title}>Editar Perfil</Text>
                <TouchableOpacity
                    onPress={handleSave}
                    disabled={isLoading}
                    style={styles.saveButton}
                >
                    {isLoading ? (
                        <ActivityIndicator size="small" color={colors.primary} />
                    ) : (
                        <Text style={styles.saveText}>Guardar</Text>
                    )}
                </TouchableOpacity>
            </View>

            <ScrollView
                style={styles.content}
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
            >
                {/* Avatar */}
                <TouchableOpacity style={styles.avatarContainer} onPress={handlePickImage}>
                    {avatar ? (
                        <Image source={{ uri: avatar }} style={styles.avatar} />
                    ) : (
                        <LinearGradient
                            colors={gradients.primary as [string, string, ...string[]]}
                            style={styles.avatarPlaceholder}
                        >
                            <Ionicons name="camera" size={32} color={colors.textPrimary} />
                        </LinearGradient>
                    )}
                    <View style={styles.editBadge}>
                        <Ionicons name="pencil" size={14} color="#FFFFFF" />
                    </View>
                </TouchableOpacity>
                <Text style={styles.changePhotoText}>Cambiar foto de perfil</Text>

                {/* Form */}
                <View style={styles.form}>
                    <Text style={styles.label}>Nombre</Text>
                    <TextInput
                        style={styles.input}
                        value={name}
                        onChangeText={setName}
                        placeholder="Tu nombre"
                        placeholderTextColor={colors.textMuted}
                    />

                    <Text style={styles.label}>RFC</Text>
                    <View style={styles.disabledInput}>
                        <Text style={styles.disabledText}>{user?.rfc || 'N/A'}</Text>
                        <Ionicons name="lock-closed" size={18} color={colors.textMuted} />
                    </View>
                    <Text style={styles.helperText}>El RFC no puede ser modificado</Text>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
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
    saveButton: {
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    saveText: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.primary,
    },
    content: {
        flex: 1,
    },
    scrollContent: {
        padding: 24,
        alignItems: 'center',
    },
    avatarContainer: {
        position: 'relative',
        marginBottom: 12,
    },
    avatar: {
        width: 120,
        height: 120,
        borderRadius: 60,
        borderWidth: 3,
        borderColor: colors.primary,
    },
    avatarPlaceholder: {
        width: 120,
        height: 120,
        borderRadius: 60,
        justifyContent: 'center',
        alignItems: 'center',
    },
    editBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: colors.primary,
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: colors.background,
    },
    changePhotoText: {
        fontSize: 16,
        color: colors.primary,
        marginBottom: 32,
    },
    form: {
        width: '100%',
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.textSecondary,
        marginBottom: 8,
        marginTop: 16,
    },
    input: {
        backgroundColor: colors.surface,
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
        color: colors.textPrimary,
        borderWidth: 1,
        borderColor: colors.border,
    },
    disabledInput: {
        backgroundColor: colors.surface,
        borderRadius: 12,
        padding: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.border,
        opacity: 0.7,
    },
    disabledText: {
        fontSize: 16,
        color: colors.textMuted,
    },
    helperText: {
        fontSize: 12,
        color: colors.textMuted,
        marginTop: 6,
    },
});

export default EditProfileScreen;
