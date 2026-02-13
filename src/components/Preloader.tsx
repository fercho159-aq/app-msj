import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Image, Animated, Platform } from 'react-native';

interface PreloaderProps {
    onFinish: () => void;
}

const Preloader: React.FC<PreloaderProps> = ({ onFinish }) => {
    const fadeAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        // Show preloader for 2 seconds, then fade out
        const timer = setTimeout(() => {
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 800,
                useNativeDriver: true,
            }).start(() => {
                onFinish();
            });
        }, 2500);

        return () => clearTimeout(timer);
    }, [fadeAnim, onFinish]);

    return (
        <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
            <View style={styles.content}>
                {/* Geometric Logo */}
                <Image
                    source={require('../../assets/logo.png')}
                    style={styles.logo}
                    resizeMode="contain"
                />

                {/* Brand Text */}
                <View style={styles.textContainer}>
                    <Text style={styles.title}>YAAKOB</Text>
                    <Text style={styles.subtitle}>B E  H E A R T</Text>
                </View>
            </View>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: '#FFFFFF',
        zIndex: 9999,
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
    },
    logo: {
        width: 200,
        height: 200,
        marginBottom: 40,
        // tintColor removed to show original logo
    },
    textContainer: {
        alignItems: 'center',
    },
    title: {
        fontSize: 28,
        fontFamily: 'Times New Roman', // System serif font as fallback
        fontWeight: '500',
        color: '#000000',
        letterSpacing: 2,
        marginBottom: 8,
        // iOS serif font
        ...Platform.select({
            ios: { fontFamily: 'Times New Roman' },
            android: { fontFamily: 'serif' },
        }),
    },
    subtitle: {
        fontSize: 12,
        color: '#666666',
        letterSpacing: 5, // Wide spacing for "BE HEART"
        textTransform: 'uppercase',
        ...Platform.select({
            ios: { fontFamily: 'Times New Roman' },
            android: { fontFamily: 'serif' },
        }),
    },
});

export default Preloader;
