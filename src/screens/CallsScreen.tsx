import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import colors, { gradients } from '../theme/colors';

interface CallItemProps {
    name: string;
    time: string;
    type: 'incoming' | 'outgoing' | 'missed';
    isVideo: boolean;
}

const CallItem: React.FC<CallItemProps> = ({ name, time, type, isVideo }) => {
    const getCallIcon = (): keyof typeof Ionicons.glyphMap => {
        if (type === 'missed') return 'call';
        return type === 'incoming' ? 'arrow-down' : 'arrow-up';
    };

    const getCallColor = () => {
        if (type === 'missed') return colors.error;
        return type === 'incoming' ? colors.success : colors.primary;
    };

    return (
        <TouchableOpacity style={styles.callItem} activeOpacity={0.7}>
            <LinearGradient
                colors={gradients.primary as [string, string, ...string[]]}
                style={styles.callAvatar}
            >
                <Text style={styles.callAvatarText}>{name.charAt(0)}</Text>
            </LinearGradient>

            <View style={styles.callInfo}>
                <Text style={[styles.callName, type === 'missed' && styles.missedCall]}>
                    {name}
                </Text>
                <View style={styles.callMeta}>
                    <Ionicons
                        name={getCallIcon()}
                        size={14}
                        color={getCallColor()}
                        style={styles.callTypeIcon}
                    />
                    <Text style={styles.callTime}>{time}</Text>
                </View>
            </View>

            <TouchableOpacity style={styles.callButton}>
                <Ionicons
                    name={isVideo ? 'videocam' : 'call'}
                    size={22}
                    color={colors.primary}
                />
            </TouchableOpacity>
        </TouchableOpacity>
    );
};

export const CallsScreen: React.FC = () => {
    const calls = [
        { id: '1', name: 'María García', time: 'Hoy, 10:30', type: 'incoming' as const, isVideo: true },
        { id: '2', name: 'Carlos López', time: 'Hoy, 09:15', type: 'outgoing' as const, isVideo: false },
        { id: '3', name: 'Ana Martínez', time: 'Ayer, 18:45', type: 'missed' as const, isVideo: true },
        { id: '4', name: 'Roberto Sánchez', time: 'Ayer, 14:20', type: 'incoming' as const, isVideo: false },
        { id: '5', name: 'Laura Fernández', time: '28/12/24', type: 'outgoing' as const, isVideo: true },
        { id: '6', name: 'Diego Ramírez', time: '27/12/24', type: 'missed' as const, isVideo: false },
    ];

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" />

            <LinearGradient
                colors={[colors.backgroundSecondary, colors.background] as [string, string]}
                style={styles.header}
            >
                <View style={styles.headerContent}>
                    <Text style={styles.title}>Llamadas</Text>
                    <TouchableOpacity style={styles.iconButton}>
                        <Ionicons name="add" size={28} color={colors.textPrimary} />
                    </TouchableOpacity>
                </View>

                <View style={styles.tabContainer}>
                    <TouchableOpacity style={[styles.tab, styles.tabActive]}>
                        <Text style={[styles.tabText, styles.tabTextActive]}>Todas</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.tab}>
                        <Text style={styles.tabText}>Perdidas</Text>
                    </TouchableOpacity>
                </View>
            </LinearGradient>

            <ScrollView
                style={styles.content}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                <Text style={styles.sectionTitle}>Recientes</Text>

                {calls.map((call) => (
                    <CallItem
                        key={call.id}
                        name={call.name}
                        time={call.time}
                        type={call.type}
                        isVideo={call.isVideo}
                    />
                ))}
            </ScrollView>

            {/* FAB */}
            <TouchableOpacity style={styles.fab}>
                <LinearGradient
                    colors={gradients.primary as [string, string, ...string[]]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.fabGradient}
                >
                    <Ionicons name="call" size={26} color={colors.textPrimary} />
                </LinearGradient>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    header: {
        paddingTop: 60,
        paddingBottom: 16,
        paddingHorizontal: 20,
    },
    headerContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: colors.textPrimary,
    },
    iconButton: {
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: colors.surface,
        justifyContent: 'center',
        alignItems: 'center',
    },
    tabContainer: {
        flexDirection: 'row',
        backgroundColor: colors.surface,
        borderRadius: 12,
        padding: 4,
    },
    tab: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: 10,
    },
    tabActive: {
        backgroundColor: colors.primary,
    },
    tabText: {
        fontSize: 15,
        fontWeight: '500',
        color: colors.textMuted,
    },
    tabTextActive: {
        color: colors.textPrimary,
    },
    content: {
        flex: 1,
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 100,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.textMuted,
        marginBottom: 16,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    callItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        borderBottomWidth: 0.5,
        borderBottomColor: colors.divider,
    },
    callAvatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
    },
    callAvatarText: {
        fontSize: 20,
        fontWeight: '600',
        color: colors.textPrimary,
    },
    callInfo: {
        flex: 1,
        marginLeft: 14,
    },
    callName: {
        fontSize: 16,
        fontWeight: '500',
        color: colors.textPrimary,
    },
    missedCall: {
        color: colors.error,
    },
    callMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
    },
    callTypeIcon: {
        marginRight: 6,
    },
    callTime: {
        fontSize: 13,
        color: colors.textMuted,
    },
    callButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: colors.surface,
        justifyContent: 'center',
        alignItems: 'center',
    },
    fab: {
        position: 'absolute',
        bottom: 24,
        right: 24,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
        elevation: 8,
    },
    fabGradient: {
        width: 60,
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
    },
});

export default CallsScreen;
