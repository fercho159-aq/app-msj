# App Mensajería

Proyecto de mensajería con React Native (Expo) y Node.js/Express.

## Requisitos

- Node.js (v18+)
- PostgreSQL (URL configurada en .env)

## Configuración Rápida

1. **Instalar dependencias**:
   ```bash
   npm install
   ```

2. **Variables de Entorno**:
   Revisa el archivo `.env` para asegurar que la configuración es correcta.
   Si estás probando en un dispositivo físico, cambia `EXPO_PUBLIC_API_URL` a tu IP local (ej. `http://192.168.1.X:3000/api`).

3. **Base de Datos**:
   ```bash
   npm run db:migrate
   ```

## Ejecución

1. **Servidor (Backend)**:
   ```bash
   npm run server
   ```
   El servidor correrá en el puerto 3000 por defecto.

2. **Aplicación (Frontend)**:
   ```bash
   npm start
   ```
   Usa la aplicación 'Expo Go' en tu teléfono para escanear el código QR, o presiona 'i' para abrir en simulador de iOS (macOS solamente).

   **Solución de problemas iOS**:
   Si ves un error de `CocoaPods CLI not found`, ejecuta este comando antes de iniciar:
   ```bash
   export PATH=$PATH:/Users/fernandotrejo/.gem/ruby/2.6.0/bin
   npm run ios
   ```

## Estructura

- `src/server`: Backend Express
- `src/screens`: Pantallas de la App
- `src/components`: Componentes reutilizables
- `src/context`: Estado global (Auth, Calls, Theme)
