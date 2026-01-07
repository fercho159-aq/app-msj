const { withAndroidManifest } = require('@expo/config-plugins');

/**
 * Plugin para asegurar que Android permita tráfico HTTP (cleartext)
 * Esto es necesario para conectarse a servidores HTTP en Android 9+
 */
const withAndroidCleartextTraffic = (config) => {
    return withAndroidManifest(config, async (config) => {
        const androidManifest = config.modResults;

        // Obtener el elemento application
        const application = androidManifest.manifest.application?.[0];

        if (application) {
            // Asegurar que usesCleartextTraffic esté habilitado
            application.$['android:usesCleartextTraffic'] = 'true';

            // También agregar networkSecurityConfig si es necesario
            // application.$['android:networkSecurityConfig'] = '@xml/network_security_config';
        }

        return config;
    });
};

module.exports = withAndroidCleartextTraffic;
