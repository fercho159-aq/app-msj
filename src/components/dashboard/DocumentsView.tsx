import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, TouchableOpacity, ScrollView, TextInput,
    ActivityIndicator, StyleSheet, useWindowDimensions, Platform,
    Modal, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { api } from '../../api/client';

const MOBILE_BREAKPOINT = 768;

interface Template {
    id: string;
    name: string;
    description: string | null;
    category: string;
    html_content: string;
    placeholders: PlaceholderDef[];
    is_active: boolean;
    created_at: string;
}

interface PlaceholderDef {
    key: string;
    label: string;
    type: 'text' | 'date' | 'number' | 'currency';
    source?: 'client' | 'manual' | 'auto';
    client_field?: string;
    default_value?: string;
    auto_generator?: string;
}

interface GeneratedDoc {
    id: string;
    template_id: string;
    client_id: string;
    title: string;
    file_url: string;
    file_size: number | null;
    filled_data: Record<string, string>;
    expires_at: string;
    created_at: string;
    template_name?: string;
    client_name?: string;
    client_rfc?: string;
}

interface ClientOption {
    id: string;
    rfc: string;
    name: string | null;
    razon_social: string | null;
}

type DocView = 'templates' | 'generated' | 'create-template' | 'generate';

export const DocumentsView: React.FC = () => {
    const { colors, isDark } = useTheme();
    const { width: screenWidth } = useWindowDimensions();
    const isMobile = screenWidth < MOBILE_BREAKPOINT;

    const [view, setView] = useState<DocView>('templates');
    const [templates, setTemplates] = useState<Template[]>([]);
    const [documents, setDocuments] = useState<GeneratedDoc[]>([]);
    const [clients, setClients] = useState<ClientOption[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
    const [selectedClient, setSelectedClient] = useState<ClientOption | null>(null);
    const [extraData, setExtraData] = useState<Record<string, string>>({});
    const [docTitle, setDocTitle] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [clientSearch, setClientSearch] = useState('');
    const [showClientPicker, setShowClientPicker] = useState(false);
    const [successDoc, setSuccessDoc] = useState<GeneratedDoc | null>(null);

    // Template editor state
    const [editName, setEditName] = useState('');
    const [editDesc, setEditDesc] = useState('');
    const [editCategory, setEditCategory] = useState('general');
    const [editHtml, setEditHtml] = useState('');
    const [editPlaceholders, setEditPlaceholders] = useState<PlaceholderDef[]>([]);
    const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    const cardBg = isDark ? '#141414' : '#ffffff';
    const borderColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';
    const inputBg = isDark ? '#1a1a1a' : '#f5f5f5';

    const loadTemplates = useCallback(async () => {
        try {
            const result = await api.getDocumentTemplates();
            if (result.data) setTemplates(result.data.templates);
        } catch (e) { console.error(e); }
    }, []);

    const loadDocuments = useCallback(async () => {
        try {
            const result = await api.getGeneratedDocuments();
            if (result.data) setDocuments(result.data.documents);
        } catch (e) { console.error(e); }
    }, []);

    const handleDeleteDocument = useCallback(async (docId: string, title: string) => {
        const doDelete = async () => {
            try {
                const result = await api.deleteGeneratedDocument(docId);
                if (result.data?.success) {
                    setDocuments(prev => prev.filter(d => d.id !== docId));
                }
            } catch (e) { console.error(e); }
        };

        if (Platform.OS === 'web') {
            if (window.confirm(`¿Eliminar "${title}"?`)) doDelete();
        } else {
            Alert.alert('Eliminar documento', `¿Eliminar "${title}"?`, [
                { text: 'Cancelar', style: 'cancel' },
                { text: 'Eliminar', style: 'destructive', onPress: doDelete },
            ]);
        }
    }, []);

    const loadClients = useCallback(async () => {
        try {
            const result = await api.getProjectClients(1, 200, clientSearch || undefined);
            if (result.data) setClients(result.data.clients);
        } catch (e) { console.error(e); }
    }, [clientSearch]);

    useEffect(() => {
        setIsLoading(true);
        Promise.all([loadTemplates(), loadDocuments()]).finally(() => setIsLoading(false));
    }, []);

    useEffect(() => {
        if (view === 'generate') loadClients();
    }, [view, clientSearch]);

    const handleSeedTemplates = async () => {
        await api.seedDocumentTemplates();
        await loadTemplates();
    };

    const handleGenerate = async () => {
        if (!selectedTemplate || !selectedClient) return;
        setIsGenerating(true);
        try {
            const result = await api.generateDocument({
                template_id: selectedTemplate.id,
                client_id: selectedClient.id,
                extra_data: extraData,
                title: docTitle || undefined,
            });
            if (result.data) {
                setSuccessDoc(result.data.document);
                await loadDocuments();
            } else if (result.error) {
                alert(result.error);
            }
        } catch (e: any) {
            alert(e.message || 'Error al generar documento');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleSaveTemplate = async () => {
        if (!editName || !editHtml) return;
        setIsSaving(true);
        try {
            if (editingTemplate) {
                await api.updateDocumentTemplate(editingTemplate.id, {
                    name: editName, description: editDesc, category: editCategory,
                    html_content: editHtml, placeholders: editPlaceholders,
                });
            } else {
                await api.createDocumentTemplate({
                    name: editName, description: editDesc, category: editCategory,
                    html_content: editHtml, placeholders: editPlaceholders,
                });
            }
            await loadTemplates();
            setView('templates');
            resetEditor();
        } catch (e: any) {
            alert(e.message || 'Error al guardar plantilla');
        } finally {
            setIsSaving(false);
        }
    };

    const resetEditor = () => {
        setEditName(''); setEditDesc(''); setEditCategory('general');
        setEditHtml(''); setEditPlaceholders([]); setEditingTemplate(null);
    };

    const openEditTemplate = (t: Template) => {
        setEditingTemplate(t);
        setEditName(t.name);
        setEditDesc(t.description || '');
        setEditCategory(t.category);
        setEditHtml(t.html_content);
        setEditPlaceholders(t.placeholders);
        setView('create-template');
    };

    const openGenerate = (t: Template) => {
        setSelectedTemplate(t);
        setSelectedClient(null);
        setExtraData({});
        setDocTitle('');
        setSuccessDoc(null);
        const initialData: Record<string, string> = {};
        t.placeholders.filter(p => p.source === 'manual').forEach(p => {
            initialData[p.key] = (p as any).default_value || '';
        });
        setExtraData(initialData);
        setView('generate');
    };

    const formatFileSize = (bytes: number | null) => {
        if (!bytes) return '-';
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / 1048576).toFixed(1)} MB`;
    };

    const formatDate = (d: string) => {
        return new Date(d).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    // Add placeholder to template editor
    const addPlaceholder = () => {
        setEditPlaceholders([...editPlaceholders, { key: '', label: '', type: 'text', source: 'manual' }]);
    };

    const updatePlaceholder = (idx: number, field: string, value: string) => {
        const updated = [...editPlaceholders];
        (updated[idx] as any)[field] = value;
        setEditPlaceholders(updated);
    };

    const removePlaceholder = (idx: number) => {
        setEditPlaceholders(editPlaceholders.filter((_, i) => i !== idx));
    };

    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={[styles.loadingText, { color: colors.textMuted }]}>Cargando documentos...</Text>
            </View>
        );
    }

    // ==================== GENERATE VIEW ====================
    if (view === 'generate' && selectedTemplate) {
        const manualPlaceholders = selectedTemplate.placeholders.filter(p => p.source === 'manual');
        const autoPlaceholders = selectedTemplate.placeholders.filter(p => p.source === 'auto');

        return (
            <ScrollView style={styles.fill} contentContainerStyle={styles.scrollContent}>
                {/* Header */}
                <View style={styles.headerRow}>
                    <TouchableOpacity onPress={() => setView('templates')} style={[styles.backBtn, { backgroundColor: inputBg }]}>
                        <Ionicons name="arrow-back" size={18} color={colors.textPrimary} />
                    </TouchableOpacity>
                    <View style={{ flex: 1 }}>
                        <Text style={[styles.pageTitle, { color: colors.textPrimary }]}>Generar Documento</Text>
                        <Text style={[styles.pageSubtitle, { color: colors.textMuted }]}>Plantilla: {selectedTemplate.name}</Text>
                    </View>
                </View>

                {successDoc ? (
                    <View style={[styles.card, { backgroundColor: cardBg, borderColor, alignItems: 'center', padding: 40 }]}>
                        <View style={[styles.iconCircle, { backgroundColor: '#10B98120' }]}>
                            <Ionicons name="checkmark-circle" size={48} color="#10B981" />
                        </View>
                        <Text style={[styles.successTitle, { color: colors.textPrimary }]}>Documento Generado</Text>
                        <Text style={[styles.successSubtitle, { color: colors.textMuted }]}>{successDoc.title}</Text>
                        <TouchableOpacity
                            style={[styles.primaryBtn, { backgroundColor: colors.primary, marginTop: 20 }]}
                            onPress={() => {
                                if (Platform.OS === 'web') {
                                    window.open(successDoc.file_url, '_blank');
                                }
                            }}
                        >
                            <Ionicons name="download-outline" size={18} color="#fff" />
                            <Text style={styles.primaryBtnText}>Descargar PDF</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.secondaryBtn, { borderColor: colors.primary, marginTop: 12 }]}
                            onPress={() => { setSuccessDoc(null); setView('generated'); }}
                        >
                            <Text style={[styles.secondaryBtnText, { color: colors.primary }]}>Ver documentos generados</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
                        {/* Client selector */}
                        <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Cliente</Text>
                        {selectedClient ? (
                            <View style={[styles.selectedClientRow, { backgroundColor: inputBg, borderColor }]}>
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.clientName, { color: colors.textPrimary }]}>
                                        {selectedClient.razon_social || selectedClient.name || selectedClient.rfc}
                                    </Text>
                                    <Text style={[styles.clientRfc, { color: colors.textMuted }]}>RFC: {selectedClient.rfc}</Text>
                                </View>
                                <TouchableOpacity onPress={() => setSelectedClient(null)}>
                                    <Ionicons name="close-circle" size={22} color={colors.textMuted} />
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <View>
                                <TextInput
                                    style={[styles.input, { backgroundColor: inputBg, color: colors.textPrimary, borderColor }]}
                                    placeholder="Buscar cliente por RFC o nombre..."
                                    placeholderTextColor={colors.textMuted}
                                    value={clientSearch}
                                    onChangeText={setClientSearch}
                                />
                                {clients.length > 0 && (
                                    <View style={[styles.clientList, { backgroundColor: cardBg, borderColor }]}>
                                        {clients.slice(0, 10).map(c => (
                                            <TouchableOpacity
                                                key={c.id}
                                                style={[styles.clientListItem, { borderBottomColor: borderColor }]}
                                                onPress={() => { setSelectedClient(c); setClientSearch(''); }}
                                            >
                                                <Text style={[styles.clientItemName, { color: colors.textPrimary }]}>
                                                    {c.razon_social || c.name || c.rfc}
                                                </Text>
                                                <Text style={[styles.clientItemRfc, { color: colors.textMuted }]}>{c.rfc}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                )}
                            </View>
                        )}

                        {/* Title */}
                        <Text style={[styles.fieldLabel, { color: colors.textSecondary, marginTop: 20 }]}>Titulo del documento (opcional)</Text>
                        <TextInput
                            style={[styles.input, { backgroundColor: inputBg, color: colors.textPrimary, borderColor }]}
                            placeholder={selectedTemplate.name}
                            placeholderTextColor={colors.textMuted}
                            value={docTitle}
                            onChangeText={setDocTitle}
                        />

                        {/* Auto-generated fields info */}
                        {autoPlaceholders.length > 0 && (
                            <View style={[styles.autoFieldsBox, { backgroundColor: isDark ? '#0d2818' : '#f0fdf4', borderColor: isDark ? '#166534' : '#bbf7d0', marginTop: 20 }]}>
                                <Ionicons name="flash" size={16} color="#10B981" />
                                <Text style={[styles.autoFieldsText, { color: isDark ? '#86efac' : '#166534' }]}>
                                    {autoPlaceholders.map(p => p.label).join(', ')} se generan automaticamente
                                </Text>
                            </View>
                        )}

                        {/* Manual placeholders */}
                        {manualPlaceholders.length > 0 && (
                            <>
                                <Text style={[styles.sectionTitle, { color: colors.textPrimary, marginTop: 24 }]}>Datos adicionales</Text>
                                <Text style={[styles.sectionDesc, { color: colors.textMuted }]}>
                                    Los datos del cliente y campos auto se llenan automaticamente. Modifique solo si es necesario:
                                </Text>
                                {manualPlaceholders.map(p => (
                                    <View key={p.key} style={{ marginTop: 12 }}>
                                        <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{p.label}</Text>
                                        <TextInput
                                            style={[styles.input, { backgroundColor: inputBg, color: colors.textPrimary, borderColor }]}
                                            placeholder={`Ingrese ${p.label.toLowerCase()}`}
                                            placeholderTextColor={colors.textMuted}
                                            value={extraData[p.key] || ''}
                                            onChangeText={(val) => setExtraData({ ...extraData, [p.key]: val })}
                                        />
                                    </View>
                                ))}
                            </>
                        )}

                        {/* Generate button */}
                        <TouchableOpacity
                            style={[styles.primaryBtn, {
                                backgroundColor: selectedClient ? colors.primary : '#999',
                                marginTop: 30,
                                alignSelf: 'center',
                            }]}
                            onPress={handleGenerate}
                            disabled={!selectedClient || isGenerating}
                        >
                            {isGenerating ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <>
                                    <Ionicons name="document-text-outline" size={18} color="#fff" />
                                    <Text style={styles.primaryBtnText}>Generar PDF</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                )}
            </ScrollView>
        );
    }

    // ==================== TEMPLATE EDITOR VIEW ====================
    if (view === 'create-template') {
        return (
            <ScrollView style={styles.fill} contentContainerStyle={styles.scrollContent}>
                <View style={styles.headerRow}>
                    <TouchableOpacity onPress={() => { setView('templates'); resetEditor(); }} style={[styles.backBtn, { backgroundColor: inputBg }]}>
                        <Ionicons name="arrow-back" size={18} color={colors.textPrimary} />
                    </TouchableOpacity>
                    <Text style={[styles.pageTitle, { color: colors.textPrimary, flex: 1 }]}>
                        {editingTemplate ? 'Editar Plantilla' : 'Nueva Plantilla'}
                    </Text>
                </View>

                <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
                    <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Nombre</Text>
                    <TextInput
                        style={[styles.input, { backgroundColor: inputBg, color: colors.textPrimary, borderColor }]}
                        value={editName} onChangeText={setEditName}
                        placeholder="Nombre de la plantilla"
                        placeholderTextColor={colors.textMuted}
                    />

                    <Text style={[styles.fieldLabel, { color: colors.textSecondary, marginTop: 16 }]}>Descripcion</Text>
                    <TextInput
                        style={[styles.input, { backgroundColor: inputBg, color: colors.textPrimary, borderColor }]}
                        value={editDesc} onChangeText={setEditDesc}
                        placeholder="Descripcion breve"
                        placeholderTextColor={colors.textMuted}
                    />

                    <Text style={[styles.fieldLabel, { color: colors.textSecondary, marginTop: 16 }]}>Categoria</Text>
                    <TextInput
                        style={[styles.input, { backgroundColor: inputBg, color: colors.textPrimary, borderColor }]}
                        value={editCategory} onChangeText={setEditCategory}
                        placeholder="general"
                        placeholderTextColor={colors.textMuted}
                    />

                    <Text style={[styles.fieldLabel, { color: colors.textSecondary, marginTop: 16 }]}>
                        Contenido HTML del cuerpo del documento
                    </Text>
                    <Text style={[styles.hint, { color: colors.textMuted }]}>
                        Use {'{{variable}}'} para placeholders. El encabezado y pie de pagina del SAT se agregan automaticamente.
                    </Text>
                    <TextInput
                        style={[styles.textarea, { backgroundColor: inputBg, color: colors.textPrimary, borderColor }]}
                        value={editHtml} onChangeText={setEditHtml}
                        placeholder='<div class="section">...</div>'
                        placeholderTextColor={colors.textMuted}
                        multiline
                        numberOfLines={12}
                    />

                    {/* Placeholders */}
                    <View style={[styles.sectionHeaderRow, { marginTop: 24 }]}>
                        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Variables / Placeholders</Text>
                        <TouchableOpacity onPress={addPlaceholder} style={[styles.smallBtn, { backgroundColor: `${colors.primary}15` }]}>
                            <Ionicons name="add" size={16} color={colors.primary} />
                            <Text style={[styles.smallBtnText, { color: colors.primary }]}>Agregar</Text>
                        </TouchableOpacity>
                    </View>

                    {editPlaceholders.map((p, idx) => (
                        <View key={idx} style={[styles.placeholderRow, { borderColor }]}>
                            <View style={styles.placeholderFields}>
                                <View style={styles.placeholderField}>
                                    <Text style={[styles.miniLabel, { color: colors.textMuted }]}>Key</Text>
                                    <TextInput
                                        style={[styles.miniInput, { backgroundColor: inputBg, color: colors.textPrimary, borderColor }]}
                                        value={p.key}
                                        onChangeText={(v) => updatePlaceholder(idx, 'key', v)}
                                        placeholder="nombre_variable"
                                        placeholderTextColor={colors.textMuted}
                                    />
                                </View>
                                <View style={styles.placeholderField}>
                                    <Text style={[styles.miniLabel, { color: colors.textMuted }]}>Label</Text>
                                    <TextInput
                                        style={[styles.miniInput, { backgroundColor: inputBg, color: colors.textPrimary, borderColor }]}
                                        value={p.label}
                                        onChangeText={(v) => updatePlaceholder(idx, 'label', v)}
                                        placeholder="Nombre visible"
                                        placeholderTextColor={colors.textMuted}
                                    />
                                </View>
                                <View style={styles.placeholderField}>
                                    <Text style={[styles.miniLabel, { color: colors.textMuted }]}>Fuente</Text>
                                    <View style={styles.sourceRow}>
                                        <TouchableOpacity
                                            style={[styles.sourceBtn, p.source === 'client' && { backgroundColor: `${colors.primary}20` }]}
                                            onPress={() => updatePlaceholder(idx, 'source', 'client')}
                                        >
                                            <Text style={[styles.sourceBtnText, { color: p.source === 'client' ? colors.primary : colors.textMuted }]}>Cliente</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={[styles.sourceBtn, p.source === 'manual' && { backgroundColor: `${colors.primary}20` }]}
                                            onPress={() => updatePlaceholder(idx, 'source', 'manual')}
                                        >
                                            <Text style={[styles.sourceBtnText, { color: p.source === 'manual' ? colors.primary : colors.textMuted }]}>Manual</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </View>
                            <TouchableOpacity onPress={() => removePlaceholder(idx)} style={styles.removeBtn}>
                                <Ionicons name="trash-outline" size={16} color="#F43F5E" />
                            </TouchableOpacity>
                        </View>
                    ))}

                    <TouchableOpacity
                        style={[styles.primaryBtn, { backgroundColor: editName && editHtml ? colors.primary : '#999', marginTop: 30, alignSelf: 'center' }]}
                        onPress={handleSaveTemplate}
                        disabled={!editName || !editHtml || isSaving}
                    >
                        {isSaving ? (
                            <ActivityIndicator size="small" color="#fff" />
                        ) : (
                            <>
                                <Ionicons name="save-outline" size={18} color="#fff" />
                                <Text style={styles.primaryBtnText}>Guardar Plantilla</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            </ScrollView>
        );
    }

    // ==================== GENERATED DOCUMENTS VIEW ====================
    if (view === 'generated') {
        return (
            <ScrollView style={styles.fill} contentContainerStyle={styles.scrollContent}>
                <View style={styles.headerRow}>
                    <TouchableOpacity onPress={() => setView('templates')} style={[styles.backBtn, { backgroundColor: inputBg }]}>
                        <Ionicons name="arrow-back" size={18} color={colors.textPrimary} />
                    </TouchableOpacity>
                    <Text style={[styles.pageTitle, { color: colors.textPrimary, flex: 1 }]}>Documentos Generados</Text>
                </View>

                {documents.length === 0 ? (
                    <View style={[styles.card, { backgroundColor: cardBg, borderColor, alignItems: 'center', padding: 40 }]}>
                        <Ionicons name="documents-outline" size={48} color={colors.textMuted} />
                        <Text style={[styles.emptyText, { color: colors.textMuted }]}>No hay documentos generados</Text>
                    </View>
                ) : (
                    <View style={[styles.card, { backgroundColor: cardBg, borderColor, padding: 0, overflow: 'hidden' }]}>
                        {/* Table header */}
                        <View style={[styles.tableHeader, { backgroundColor: isDark ? '#1a1a1a' : '#f8f8f8', borderBottomColor: borderColor }]}>
                            <Text style={[styles.th, { color: colors.textMuted, flex: 2.5 }]}>Documento</Text>
                            <Text style={[styles.th, { color: colors.textMuted, flex: 1.5 }]}>Cliente</Text>
                            <Text style={[styles.th, { color: colors.textMuted, flex: 1 }]}>Tamano</Text>
                            <Text style={[styles.th, { color: colors.textMuted, flex: 1.2 }]}>Fecha</Text>
                            <Text style={[styles.th, { color: colors.textMuted, flex: 1 }]}>Expira</Text>
                            <Text style={[styles.th, { color: colors.textMuted, width: 80 }]}>Accion</Text>
                        </View>
                        {documents.map((doc, idx) => (
                            <View key={doc.id} style={[styles.tableRow, { borderBottomColor: borderColor, backgroundColor: idx % 2 === 0 ? 'transparent' : (isDark ? '#0d0d0d' : '#fafafa') }]}>
                                <View style={{ flex: 2.5 }}>
                                    <Text style={[styles.docTitle, { color: colors.textPrimary }]} numberOfLines={1}>{doc.title}</Text>
                                    <Text style={[styles.docTemplate, { color: colors.textMuted }]} numberOfLines={1}>{doc.template_name}</Text>
                                </View>
                                <View style={{ flex: 1.5 }}>
                                    <Text style={[styles.cellText, { color: colors.textPrimary }]} numberOfLines={1}>{doc.client_name || doc.client_rfc}</Text>
                                    <Text style={[styles.cellSubtext, { color: colors.textMuted }]}>{doc.client_rfc}</Text>
                                </View>
                                <Text style={[styles.cellText, { color: colors.textMuted, flex: 1 }]}>{formatFileSize(doc.file_size)}</Text>
                                <Text style={[styles.cellText, { color: colors.textMuted, flex: 1.2, fontSize: 11 }]}>{formatDate(doc.created_at)}</Text>
                                <Text style={[styles.cellText, { color: colors.textMuted, flex: 1, fontSize: 11 }]}>{formatDate(doc.expires_at)}</Text>
                                <View style={{ width: 80, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                                    <TouchableOpacity
                                        style={[styles.downloadBtn, { backgroundColor: `${colors.primary}15` }]}
                                        onPress={() => { if (Platform.OS === 'web') window.open(doc.file_url, '_blank'); }}
                                    >
                                        <Ionicons name="download-outline" size={16} color={colors.primary} />
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.downloadBtn, { backgroundColor: 'rgba(220,38,38,0.1)' }]}
                                        onPress={() => handleDeleteDocument(doc.id, doc.title)}
                                    >
                                        <Ionicons name="trash-outline" size={16} color="#dc2626" />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ))}
                    </View>
                )}
            </ScrollView>
        );
    }

    // ==================== TEMPLATES LIST VIEW (default) ====================
    return (
        <ScrollView style={styles.fill} contentContainerStyle={styles.scrollContent}>
            {/* Top bar */}
            <View style={styles.headerRow}>
                <View style={{ flex: 1 }}>
                    <Text style={[styles.pageTitle, { color: colors.textPrimary }]}>Plantillas de Documentos</Text>
                    <Text style={[styles.pageSubtitle, { color: colors.textMuted }]}>
                        {templates.length} plantilla{templates.length !== 1 ? 's' : ''} disponible{templates.length !== 1 ? 's' : ''}
                    </Text>
                </View>
                <View style={styles.actionRow}>
                    <TouchableOpacity
                        style={[styles.outlineBtn, { borderColor }]}
                        onPress={() => setView('generated')}
                    >
                        <Ionicons name="documents-outline" size={16} color={colors.textSecondary} />
                        <Text style={[styles.outlineBtnText, { color: colors.textSecondary }]}>Generados ({documents.length})</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
                        onPress={() => { resetEditor(); setView('create-template'); }}
                    >
                        <Ionicons name="add" size={18} color="#fff" />
                        <Text style={styles.primaryBtnText}>Nueva Plantilla</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {templates.length === 0 ? (
                <View style={[styles.card, { backgroundColor: cardBg, borderColor, alignItems: 'center', padding: 40 }]}>
                    <Ionicons name="document-text-outline" size={48} color={colors.textMuted} />
                    <Text style={[styles.emptyText, { color: colors.textMuted }]}>No hay plantillas creadas</Text>
                    <Text style={[styles.emptySubtext, { color: colors.textMuted }]}>
                        Cree una plantilla nueva o cargue las plantillas por defecto
                    </Text>
                    <TouchableOpacity
                        style={[styles.outlineBtn, { borderColor: colors.primary, marginTop: 16 }]}
                        onPress={handleSeedTemplates}
                    >
                        <Ionicons name="flash-outline" size={16} color={colors.primary} />
                        <Text style={[styles.outlineBtnText, { color: colors.primary }]}>Cargar plantilla de ejemplo</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <View style={styles.templateGrid}>
                    {templates.map(t => (
                        <View key={t.id} style={[styles.templateCard, { backgroundColor: cardBg, borderColor }]}>
                            <View style={[styles.templateIconBg, { backgroundColor: `${colors.primary}12` }]}>
                                <Ionicons name="document-text" size={24} color={colors.primary} />
                            </View>
                            <Text style={[styles.templateName, { color: colors.textPrimary }]}>{t.name}</Text>
                            {t.description && (
                                <Text style={[styles.templateDesc, { color: colors.textMuted }]} numberOfLines={2}>{t.description}</Text>
                            )}
                            <View style={[styles.templateMeta, { borderTopColor: borderColor }]}>
                                <View style={[styles.badge, { backgroundColor: `${colors.primary}15` }]}>
                                    <Text style={[styles.badgeText, { color: colors.primary }]}>{t.category}</Text>
                                </View>
                                <Text style={[styles.placeholderCount, { color: colors.textMuted }]}>
                                    {t.placeholders.length} campo{t.placeholders.length !== 1 ? 's' : ''}
                                </Text>
                            </View>
                            <View style={styles.templateActions}>
                                <TouchableOpacity
                                    style={[styles.templateActionBtn, { backgroundColor: `${colors.primary}10` }]}
                                    onPress={() => openGenerate(t)}
                                >
                                    <Ionicons name="print-outline" size={15} color={colors.primary} />
                                    <Text style={[styles.templateActionText, { color: colors.primary }]}>Generar</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.templateActionBtn, { backgroundColor: inputBg }]}
                                    onPress={() => openEditTemplate(t)}
                                >
                                    <Ionicons name="create-outline" size={15} color={colors.textSecondary} />
                                    <Text style={[styles.templateActionText, { color: colors.textSecondary }]}>Editar</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    ))}
                </View>
            )}
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    fill: { flex: 1 },
    scrollContent: { padding: 24 },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
    loadingText: { fontSize: 13, fontWeight: '500' },

    headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 24, gap: 12, flexWrap: 'wrap' },
    backBtn: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    pageTitle: { fontSize: 22, fontWeight: '800', letterSpacing: -0.5 },
    pageSubtitle: { fontSize: 13, fontWeight: '500', marginTop: 2 },

    actionRow: { flexDirection: 'row', gap: 8 },
    primaryBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 },
    primaryBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
    secondaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, borderWidth: 1 },
    secondaryBtnText: { fontSize: 13, fontWeight: '600' },
    outlineBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10, borderWidth: 1 },
    outlineBtnText: { fontSize: 12, fontWeight: '600' },

    card: { borderRadius: 14, borderWidth: 1, padding: 24, marginBottom: 16 },
    emptyText: { fontSize: 15, fontWeight: '600', marginTop: 12 },
    emptySubtext: { fontSize: 12, marginTop: 4, textAlign: 'center' },

    // Template grid
    templateGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
    templateCard: { borderRadius: 14, borderWidth: 1, padding: 20, width: 320, minHeight: 200, justifyContent: 'space-between' },
    templateIconBg: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
    templateName: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
    templateDesc: { fontSize: 12, lineHeight: 17, marginBottom: 12 },
    templateMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, paddingTop: 12, marginTop: 8 },
    badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 6 },
    badgeText: { fontSize: 11, fontWeight: '600' },
    placeholderCount: { fontSize: 11 },
    templateActions: { flexDirection: 'row', gap: 8, marginTop: 14 },
    templateActionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 8, borderRadius: 8 },
    templateActionText: { fontSize: 12, fontWeight: '600' },

    // Form fields
    fieldLabel: { fontSize: 12, fontWeight: '600', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
    input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14 },
    textarea: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 13, fontFamily: Platform.OS === 'web' ? 'monospace' : undefined, minHeight: 200, textAlignVertical: 'top' },
    hint: { fontSize: 11, marginBottom: 8, fontStyle: 'italic' },

    sectionTitle: { fontSize: 15, fontWeight: '700' },
    sectionDesc: { fontSize: 12, marginTop: 4, marginBottom: 8 },
    sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
    smallBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
    smallBtnText: { fontSize: 12, fontWeight: '600' },

    // Placeholder editor
    placeholderRow: { flexDirection: 'row', alignItems: 'flex-start', borderBottomWidth: 1, paddingBottom: 12, marginBottom: 12, gap: 8 },
    placeholderFields: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    placeholderField: { minWidth: 140, flex: 1 },
    miniLabel: { fontSize: 10, fontWeight: '600', marginBottom: 4, textTransform: 'uppercase' },
    miniInput: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, fontSize: 12 },
    sourceRow: { flexDirection: 'row', gap: 4 },
    sourceBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6 },
    sourceBtnText: { fontSize: 11, fontWeight: '600' },
    removeBtn: { padding: 8 },

    // Client selector
    selectedClientRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 10, padding: 12, gap: 12 },
    clientName: { fontSize: 14, fontWeight: '600' },
    clientRfc: { fontSize: 12, marginTop: 2 },
    clientList: { borderWidth: 1, borderRadius: 10, marginTop: 4, maxHeight: 250, overflow: 'hidden' },
    clientListItem: { paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1 },
    clientItemName: { fontSize: 13, fontWeight: '500' },
    clientItemRfc: { fontSize: 11, marginTop: 2 },

    // Success
    iconCircle: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
    successTitle: { fontSize: 20, fontWeight: '800' },
    successSubtitle: { fontSize: 14, marginTop: 4 },

    // Table
    tableHeader: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, alignItems: 'center' },
    th: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
    tableRow: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, alignItems: 'center' },
    docTitle: { fontSize: 13, fontWeight: '600' },
    docTemplate: { fontSize: 11, marginTop: 2 },
    cellText: { fontSize: 12 },
    cellSubtext: { fontSize: 10, marginTop: 2 },
    downloadBtn: { width: 34, height: 34, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
    autoFieldsBox: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 10, borderWidth: 1 },
    autoFieldsText: { fontSize: 12, fontWeight: '600', flex: 1 },
});
