const { withAndroidManifest } = require('@expo/config-plugins');

/**
 * Plugin para agregar permisos de WebRTC en Android
 * Necesario para react-native-webrtc
 */
const withWebRTCPermissions = (config) => {
    return withAndroidManifest(config, async (config) => {
        const androidManifest = config.modResults;
        const manifest = androidManifest.manifest;

        // Asegurar que existe el array de permisos
        if (!manifest['uses-permission']) {
            manifest['uses-permission'] = [];
        }

        const permissions = [
            'android.permission.CAMERA',
            'android.permission.RECORD_AUDIO',
            'android.permission.MODIFY_AUDIO_SETTINGS',
            'android.permission.ACCESS_NETWORK_STATE',
            'android.permission.BLUETOOTH',
            'android.permission.BLUETOOTH_CONNECT',
        ];

        // Agregar permisos si no existen
        permissions.forEach((permission) => {
            const exists = manifest['uses-permission'].some(
                (p) => p.$?.['android:name'] === permission
            );
            if (!exists) {
                manifest['uses-permission'].push({
                    $: { 'android:name': permission },
                });
            }
        });

        // Agregar features para camera
        if (!manifest['uses-feature']) {
            manifest['uses-feature'] = [];
        }

        const features = [
            { name: 'android.hardware.camera', required: false },
            { name: 'android.hardware.camera.autofocus', required: false },
            { name: 'android.hardware.microphone', required: false },
        ];

        features.forEach((feature) => {
            const exists = manifest['uses-feature'].some(
                (f) => f.$?.['android:name'] === feature.name
            );
            if (!exists) {
                manifest['uses-feature'].push({
                    $: {
                        'android:name': feature.name,
                        'android:required': String(feature.required),
                    },
                });
            }
        });

        return config;
    });
};

module.exports = withWebRTCPermissions;
