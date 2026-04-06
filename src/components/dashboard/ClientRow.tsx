import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../context/ThemeContext';
import { DeadlineTrafficLight, getDeadlineSeverity } from './DeadlineTrafficLight';
import type { ClientRow as ClientRowType } from '../../types';

interface ClientRowProps {
    client: ClientRowType;
    index: number;
    onPress: (client: ClientRowType) => void;
    onDelete?: (client: ClientRowType) => void;
}

export const ClientRow: React.FC<ClientRowProps> = ({ client, index, onPress, onDelete }) => {
    const { colors, isDark } = useTheme();
    const efirmaSeverity = getDeadlineSeverity(client.efirma_expiry);

    return (
        <View style={[
            styles.row,
            {
                backgroundColor: index % 2 === 0
                    ? (isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)')
                    : 'transparent',
                borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
            },
        ]}>
            <TouchableOpacity
                style={styles.rowContent}
                onPress={() => onPress(client)}
                activeOpacity={0.7}
            >
                <LinearGradient
                    colors={['#5C76B2', '#97B1DE']}
                    style={styles.avatar}
                >
                    <Text style={styles.avatarText}>
                        {(client.name || client.rfc || '?').charAt(0).toUpperCase()}
                    </Text>
                </LinearGradient>

                <View style={styles.info}>
                    <Text style={[styles.name, { color: colors.textPrimary }]} numberOfLines={1}>
                        {client.name || client.razon_social || 'Sin nombre'}
                    </Text>
                    <Text style={[styles.rfc, { color: colors.textMuted }]}>{client.rfc}</Text>
                </View>

                <View style={styles.meta}>
                    {client.regimen_fiscal && (
                        <Text style={[styles.regimen, { color: colors.textMuted }]} numberOfLines={1}>
                            {client.regimen_fiscal.substring(0, 30)}
                        </Text>
                    )}
                </View>

                <View style={styles.badges}>
                    {efirmaSeverity && (
                        <View style={styles.efirmaBadge}>
                            <DeadlineTrafficLight severity={efirmaSeverity} size={8} />
                            <Text style={[styles.efirmaLabel, { color: colors.textMuted }]}>e.firma</Text>
                        </View>
                    )}
                    <View style={[styles.projectCount, { backgroundColor: `${colors.primary}12` }]}>
                        <Text style={[styles.projectCountText, { color: colors.primary }]}>
                            {client.projects_count}
                        </Text>
                    </View>
                </View>

                <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </TouchableOpacity>

            {onDelete && (
                <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => onDelete(client)}
                    activeOpacity={0.7}
                >
                    <Ionicons name="trash-outline" size={16} color="#E54D4D" />
                </TouchableOpacity>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        borderBottomWidth: 1,
    },
    rowContent: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        gap: 12,
    },
    deleteButton: {
        paddingHorizontal: 12,
        paddingVertical: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '700',
    },
    info: {
        flex: 1,
        minWidth: 120,
    },
    name: {
        fontSize: 13,
        fontWeight: '600',
    },
    rfc: {
        fontSize: 11,
        fontWeight: '500',
        marginTop: 2,
    },
    meta: {
        flex: 1,
        minWidth: 100,
    },
    regimen: {
        fontSize: 11,
        fontWeight: '500',
    },
    badges: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    efirmaBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    efirmaLabel: {
        fontSize: 10,
        fontWeight: '500',
    },
    projectCount: {
        width: 24,
        height: 24,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    projectCountText: {
        fontSize: 11,
        fontWeight: '700',
    },
});
