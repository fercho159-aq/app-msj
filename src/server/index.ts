import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { authRoutes } from './routes/auth';
import { userRoutes } from './routes/users';
import { chatRoutes } from './routes/chats';
import { messageRoutes } from './routes/messages';
import { uploadRoutes } from './routes/upload';
import { callRoutes } from './routes/calls';

const app = express();
const port = process.env.PORT || 3000;

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
// Aseguramos que la ruta sea correcta independientemente de si corremos ts-node o node
app.use('/uploads', express.static(path.join(__dirname, '../../uploads')));

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

// Start server
app.listen(port, () => {
    console.log(`
🚀 Servidor de Mensajería iniciado!
📍 URL: http://localhost:${port}
📚 Endpoints disponibles:
   - POST   /api/auth/login          (login con RFC)
   - GET    /api/users               (listar usuarios)
   - GET    /api/chats               (listar chats)
   - POST   /api/upload              (subir archivos)
  `);
});

export default app;
