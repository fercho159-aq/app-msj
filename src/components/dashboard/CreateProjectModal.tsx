import React, { useState, useEffect } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, Modal,
    StyleSheet, ActivityIndicator, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { api } from '../../api/client';

const SERVICE_TYPES = [
    'Declaracion Anual',
    'Declaracion Mensual',
    'Contabilidad',
    'Nomina',
    'Auditoria',
    'Constitucion',
    'Tramites SAT',
    'Otro',
];

interface EditProjectData {
    id: string;
    name: string;
    serviceType: string;
    description: string | null;
}

interface CreateProjectModalProps {
    visible: boolean;
    clientId: string;
    editProject?: EditProjectData | null;
    onClose: () => void;
    onCreated: () => void;
}

export const CreateProjectModal: React.FC<CreateProjectModalProps> = ({
    visible, clientId, editProject, onClose, onCreated,
}) => {
    const { colors, isDark } = useTheme();
    const [name, setName] = useState('');
    const [serviceType, setServiceType] = useState('');
    const [description, setDescription] = useState('');
    const [isCreating, setIsCreating] = useState(false);

    const isEditMode = !!editProject;

    useEffect(() => {
        if (visible && editProject) {
            setName(editProject.name);
            setServiceType(editProject.serviceType);
            setDescription(editProject.description || '');
        } else if (visible && !editProject) {
            setName('');
            setServiceType('');
            setDescription('');
        }
    }, [visible, editProject]);

    const handleCreate = async () => {
        if (!name.trim() || !serviceType) return;
        setIsCreating(true);
        try {
            if (isEditMode && editProject) {
                await api.updateProjectData(editProject.id, {
                    name: name.trim(),
                    serviceType,
                    description: description.trim() || undefined,
                });
                onCreated();
            } else {
                const result = await api.createProject({
                    clientId,
                    name: name.trim(),
                    serviceType,
                    description: description.trim() || undefined,
                });
                if (result.data) {
                    setName('');
                    setServiceType('');
                    setDescription('');
                    onCreated();
                }
            }
        } catch (error) {
            console.error('Error creating/updating project:', error);
        } finally {
            setIsCreating(false);
        }
    };

    const modalBg = isDark ? '#1a1a1a' : '#ffffff';
    const inputBg = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)';
    const inputBorder = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <View style={styles.overlay}>
                <View style={[styles.modal, { backgroundColor: modalBg }]}>
                    <View style={styles.modalHeader}>
                        <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                            {isEditMode ? 'Editar Proyecto' : 'Nuevo Proyecto'}
                        </Text>
                        <TouchableOpacity onPress={onClose}>
                            <Ionicons name="close" size={22} color={colors.textMuted} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                        <Text style={[styles.label, { color: colors.textMuted }]}>Nombre del proyecto *</Text>
                        <TextInput
                            style={[styles.input, { color: colors.textPrimary, backgroundColor: inputBg, borderColor: inputBorder }]}
                            value={name}
                            onChangeText={setName}
                            placeholder="Ej: Declaracion Anual 2025"
                            placeholderTextColor={colors.textMuted}
                        />

                        <Text style={[styles.label, { color: colors.textMuted }]}>Tipo de servicio *</Text>
                        <View style={styles.serviceGrid}>
                            {SERVICE_TYPES.map(type => (
                                <TouchableOpacity
                                    key={type}
                                    style={[
                                        styles.serviceChip,
                                        {
                                            backgroundColor: serviceType === type ? `${colors.primary}15` : inputBg,
                                            borderColor: serviceType === type ? colors.primary : inputBorder,
                                        },
                                    ]}
                                    onPress={() => setServiceType(type)}
                                >
                                    <Text style={[
                                        styles.serviceChipText,
                                        { color: serviceType === type ? colors.primary : colors.textSecondary },
                                    ]}>
                                        {type}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={[styles.label, { color: colors.textMuted }]}>Descripcion (opcional)</Text>
                        <TextInput
                            style={[styles.input, styles.textArea, { color: colors.textPrimary, backgroundColor: inputBg, borderColor: inputBorder }]}
                            value={description}
                            onChangeText={setDescription}
                            placeholder="Descripcion del proyecto..."
                            placeholderTextColor={colors.textMuted}
                            multiline
                            numberOfLines={3}
                        />
                    </ScrollView>

                    <View style={styles.modalFooter}>
                        <TouchableOpacity onPress={onClose} style={styles.cancelButton}>
                            <Text style={[styles.cancelText, { color: colors.textMuted }]}>Cancelar</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={handleCreate}
                            disabled={!name.trim() || !serviceType || isCreating}
                            style={[
                                styles.createButton,
                                { backgroundColor: colors.primary },
                                (!name.trim() || !serviceType) && { opacity: 0.5 },
                            ]}
                        >
                            {isCreating ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <Text style={styles.createText}>{isEditMode ? 'Guardar' : 'Crear Proyecto'}</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modal: {
        width: 440,
        maxHeight: '80%',
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 24,
        elevation: 10,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        paddingBottom: 16,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '700',
    },
    modalBody: {
        paddingHorizontal: 20,
    },
    label: {
        fontSize: 11,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 6,
        marginTop: 14,
    },
    input: {
        fontSize: 13,
        fontWeight: '500',
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 10,
        borderWidth: 1,
    },
    textArea: {
        minHeight: 70,
        textAlignVertical: 'top',
    },
    serviceGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    serviceChip: {
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 20,
        borderWidth: 1,
    },
    serviceChipText: {
        fontSize: 12,
        fontWeight: '600',
    },
    modalFooter: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 10,
        padding: 20,
        paddingTop: 16,
    },
    cancelButton: {
        paddingVertical: 10,
        paddingHorizontal: 16,
    },
    cancelText: {
        fontSize: 13,
        fontWeight: '600',
    },
    createButton: {
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 10,
    },
    createText: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '700',
    },
});
