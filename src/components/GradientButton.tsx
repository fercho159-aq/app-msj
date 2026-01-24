import React from 'react';
import {
    Text,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    StyleProp,
    ViewStyle,
    TextStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { gradients, lightColors } from '../theme/colors';

interface GradientButtonProps {
    title: string;
    onPress: () => void;
    colors?: string[];
    style?: StyleProp<ViewStyle>;
    textStyle?: StyleProp<TextStyle>;
    disabled?: boolean;
    loading?: boolean;
    icon?: React.ReactNode;
}

export const GradientButton: React.FC<GradientButtonProps> = ({
    title,
    onPress,
    colors = gradients.primary,
    style,
    textStyle,
    disabled = false,
    loading = false,
    icon,
}) => {
    return (
        <TouchableOpacity
            onPress={onPress}
            disabled={disabled || loading}
            activeOpacity={0.8}
            style={[styles.container, style]}
        >
            <LinearGradient
                colors={(disabled ? [lightColors.textMuted, lightColors.textMuted] : colors) as [string, string, ...string[]]}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={styles.gradient}
            >
                {loading ? (
                    <ActivityIndicator color="white" />
                ) : (
                    <>
                        {icon}
                        <Text style={[styles.text, textStyle, icon ? { marginLeft: 8 } : null]}>
                            {title}
                        </Text>
                    </>
                )}
            </LinearGradient>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        width: '100%',
        height: 56,
        borderRadius: 16,
        overflow: 'hidden',
        // Shadow for iOS
        shadowColor: '#5474BC',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        // Elevation for Android
        elevation: 4,
    },
    gradient: {
        width: '100%',
        height: '100%',
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    text: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
        letterSpacing: 0.5,
    },
});
