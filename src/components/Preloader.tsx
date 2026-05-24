import React, { useEffect, useRef } from 'react';
import { StyleSheet, Image, Animated } from 'react-native';

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
            <Image
                source={require('../../assets/preloader.png')}
                style={styles.logo}
                resizeMode="cover"
            />
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: '#FFFFFF',
        zIndex: 9999,
    },
    logo: {
        ...StyleSheet.absoluteFillObject,
        width: '100%',
        height: '100%',
    },
});

export default Preloader;
