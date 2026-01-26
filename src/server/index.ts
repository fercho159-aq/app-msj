import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import { createServer } from 'http';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { authRoutes } from './routes/auth';
import { userRoutes } from './routes/users';
import { chatRoutes } from './routes/chats';
import { messageRoutes } from './routes/messages';
import { uploadRoutes } from './routes/upload';
import { callRoutes } from './routes/calls';
import { labelRoutes } from './routes/labels';
// import { streamRoutes } from './routes/stream'; // Deprecated
// Agora routes removed - now using Spreed-WebRTC
import { ocrRoutes } from './routes/ocr';
import { initializeWebSocket } from './websocket/signaling';

const app = express();
const httpServer = createServer(app);
const port = process.env.PORT || 3000;

// Inicializar WebSocket para llamadas
initializeWebSocket(httpServer);

// Middlewares
app.use(helmet({
    crossOriginResourcePolicy: false, // Permitir carga de archivos desde otros orígenes
}));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// Servir archivos estáticos (uploads)
app.use('/uploads', express.static(path.join(__dirname, '../../uploads')));

// Servir página web de llamadas
app.use('/call', express.static(path.join(__dirname, '../../public/call')));

// Health check
app.get('/health', (req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/calls', callRoutes);
app.use('/api/labels', labelRoutes);
// app.use('/api/stream', streamRoutes);
// Agora routes removed - now using Spreed-WebRTC
app.use('/api/ocr', ocrRoutes);

// 404 handler
app.use((req: Request, res: Response) => {
    res.status(404).json({ error: 'Ruta no encontrada' });
});

// Error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    console.error('Error:', err);
    res.status(500).json({
        error: 'Error interno del servidor',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// Start server con HTTP (para WebSocket)
httpServer.listen(port, () => {
    console.log(`
🚀 Servidor de Mensajería iniciado!
📍 URL: http://localhost:${port}
📞 WebSocket: ws://localhost:${port}
📚 Endpoints disponibles:
   - POST   /api/auth/login          (login con RFC)
   - GET    /api/users               (listar usuarios)
   - GET    /api/chats               (listar chats)
   - POST   /api/upload              (subir archivos)
   - GET    /call                    (página web de llamadas)
  `);
});

export default app;
