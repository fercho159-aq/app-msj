import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, Modal,
    StyleSheet, ActivityIndicator, ScrollView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { api } from '../../api/client';
import type { ConsultorRow, PhaseRow } from '../../types';

interface CreatePhaseModalProps {
    visible: boolean;
    projectId: string;
    onClose: () => void;
    onCreated: () => void;
}

export const CreatePhaseModal: React.FC<CreatePhaseModalProps> = ({
    visible, projectId, onClose, onCreated,
}) => {
    const { colors, isDark } = useTheme();
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [deadline, setDeadline] = useState('');
    const [executorId, setExecutorId] = useState('');
    const [consultors, setConsultors] = useState<ConsultorRow[]>([]);
    const [dependsOnPhaseId, setDependsOnPhaseId] = useState('');
    const [siblingPhases, setSiblingPhases] = useState<PhaseRow[]>([]);
    const [isCreating, setIsCreating] = useState(false);

    useEffect(() => {
        if (visible) {
            api.getConsultors().then(r => {
                if (r.data) setConsultors(r.data.consultors);
            });
            api.getProject(projectId).then(r => {
                if (r.data) setSiblingPhases(r.data.project.phases);
            });
        }
    }, [visible, projectId]);

    const handleCreate = async () => {
        if (!name.trim()) return;
        setIsCreating(true);
        try {
            const result = await api.createPhase(projectId, {
                name: name.trim(),
                description: description.trim() || undefined,
                deadline: deadline || undefined,
                executorId: executorId || undefined,
                dependsOnPhaseId: dependsOnPhaseId || undefined,
            });
            if (result.data) {
                setName('');
                setDescription('');
                setDeadline('');
                setExecutorId('');
                setDependsOnPhaseId('');
                onCreated();
            }
        } catch (error) {
            console.error('Error creating phase:', error);
        } finally {
            setIsCreating(false);
        }
    };

    const inputBg = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)';
    const inputBorder = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <View style={styles.overlay}>
                <View style={[styles.modal, { backgroundColor: isDark ? '#1a1a1a' : '#ffffff' }]}>
                    <View style={styles.modalHeader}>
                        <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Nueva Fase</Text>
                        <TouchableOpacity onPress={onClose}>
                            <Ionicons name="close" size={22} color={colors.textMuted} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                        <Text style={[styles.label, { color: colors.textMuted }]}>Nombre *</Text>
                        <TextInput
                            style={[styles.input, { color: colors.textPrimary, backgroundColor: inputBg, borderColor: inputBorder }]}
                            value={name}
                            onChangeText={setName}
                            placeholder="Ej: Recopilacion de documentos"
                            placeholderTextColor={colors.textMuted}
                        />

                        <Text style={[styles.label, { color: colors.textMuted }]}>Descripcion</Text>
                        <TextInput
                            style={[styles.input, styles.textArea, { color: colors.textPrimary, backgroundColor: inputBg, borderColor: inputBorder }]}
                            value={description}
                            onChangeText={setDescription}
                            placeholder="Descripcion de la fase..."
                            placeholderTextColor={colors.textMuted}
                            multiline
                            numberOfLines={3}
                        />

                        <Text style={[styles.label, { color: colors.textMuted }]}>Fecha limite</Text>
                        {Platform.OS === 'web' ? (
                            <View style={[styles.input, { backgroundColor: inputBg, borderColor: inputBorder, flexDirection: 'row', alignItems: 'center' }]}>
                                <input
                                    type="date"
                                    value={deadline}
                                    onChange={(e: any) => setDeadline(e.target.value)}
                                    style={{
                                        flex: 1,
                                        background: 'transparent',
                                        border: 'none',
                                        outline: 'none',
                                        color: isDark ? '#e5e5e5' : '#1a1a1a',
                                        fontSize: 13,
                                        fontWeight: 500,
                                        fontFamily: 'inherit',
                                        colorScheme: isDark ? 'dark' : 'light',
                                    }}
                                />
                            </View>
                        ) : (
                            <TextInput
                                style={[styles.input, { color: colors.textPrimary, backgroundColor: inputBg, borderColor: inputBorder }]}
                                value={deadline}
                                onChangeText={setDeadline}
                                placeholder="YYYY-MM-DD"
                                placeholderTextColor={colors.textMuted}
                            />
                        )}

                        <Text style={[styles.label, { color: colors.textMuted }]}>Responsable</Text>
                        <View style={styles.consultorGrid}>
                            <TouchableOpacity
                                style={[styles.consultorChip, {
                                    backgroundColor: !executorId ? `${colors.primary}15` : inputBg,
                                    borderColor: !executorId ? colors.primary : inputBorder,
                                }]}
                                onPress={() => setExecutorId('')}
                            >
                                <Text style={[styles.consultorChipText, {
                                    color: !executorId ? colors.primary : colors.textSecondary,
                                }]}>Sin asignar</Text>
                            </TouchableOpacity>
                            {consultors.map(c => (
                                <TouchableOpacity
                                    key={c.id}
                                    style={[styles.consultorChip, {
                                        backgroundColor: executorId === c.id ? `${colors.primary}15` : inputBg,
                                        borderColor: executorId === c.id ? colors.primary : inputBorder,
                                    }]}
                                    onPress={() => setExecutorId(c.id)}
                                >
                                    <Text style={[styles.consultorChipText, {
                                        color: executorId === c.id ? colors.primary : colors.textSecondary,
                                    }]}>{c.name || c.rfc}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {siblingPhases.length > 0 && (
                            <>
                                <Text style={[styles.label, { color: colors.textMuted }]}>Depende de</Text>
                                <View style={styles.consultorGrid}>
                                    <TouchableOpacity
                                        style={[styles.consultorChip, {
                                            backgroundColor: !dependsOnPhaseId ? `${colors.primary}15` : inputBg,
                                            borderColor: !dependsOnPhaseId ? colors.primary : inputBorder,
                                        }]}
                                        onPress={() => setDependsOnPhaseId('')}
                                    >
                                        <Text style={[styles.consultorChipText, {
                                            color: !dependsOnPhaseId ? colors.primary : colors.textSecondary,
                                        }]}>Ninguna</Text>
                                    </TouchableOpacity>
                                    {siblingPhases.map(p => (
                                        <TouchableOpacity
                                            key={p.id}
                                            style={[styles.consultorChip, {
                                                backgroundColor: dependsOnPhaseId === p.id ? `${colors.primary}15` : inputBg,
                                                borderColor: dependsOnPhaseId === p.id ? colors.primary : inputBorder,
                                            }]}
                                            onPress={() => setDependsOnPhaseId(p.id)}
                                        >
                                            <Text style={[styles.consultorChipText, {
                                                color: dependsOnPhaseId === p.id ? colors.primary : colors.textSecondary,
                                            }]}>{p.name}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </>
                        )}
                    </ScrollView>

                    <View style={styles.modalFooter}>
                        <TouchableOpacity onPress={onClose} style={styles.cancelButton}>
                            <Text style={[styles.cancelText, { color: colors.textMuted }]}>Cancelar</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={handleCreate}
                            disabled={!name.trim() || isCreating}
                            style={[styles.createButton, { backgroundColor: colors.primary }, !name.trim() && { opacity: 0.5 }]}
                        >
                            {isCreating ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <Text style={styles.createText}>Crear Fase</Text>
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
    consultorGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    consultorChip: {
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 20,
        borderWidth: 1,
    },
    consultorChipText: {
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
