import 'reflect-metadata';
import path from 'path';
import { fileURLToPath } from 'url';
import express, { type Application, type Request, type Response } from 'express';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import responseTime from 'response-time';
import { swaggerUi, swaggerSpec, swaggerUiOptions } from './config/swagger.js';
import { requestLogger } from './middlewares/requestLogger.middleware.js';
import { envCheckMiddleware } from './middlewares/envCheck.middleware.js';
import { generalLimiter } from './middlewares/rateLimiter.middleware.js';
import { errorHandler, notFoundHandler } from './middlewares/error.middleware.js';
import routes from './routes/index.js';

const app: Application = express();

// Enable trust proxy
app.set('trust proxy', 1);

// Request Logger
app.use(requestLogger);

// Performance Monitoring
app.use(responseTime());

// Security Headers
const cspDirectives = helmet.contentSecurityPolicy.getDefaultDirectives();
cspDirectives["img-src"] = ["'self'", 'data:', 'https:', 'http:'];

app.use(helmet({
    contentSecurityPolicy: {
        directives: cspDirectives
    },
    crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

// Serve static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Compression
app.use(compression());

// CORS configuration
// --- OLD: Restricted origins (uncomment to restore) ---
// const getAllowedOrigins = (): string[] => {
//     const productionOrigins = ['https://www.farmy.tn'];
//     const developmentOrigins = ['http://localhost:3000', 'http://localhost:3005', 'http://localhost:3001', 'http://localhost:5173'];
//
//     if (process.env.NODE_ENV === 'production') {
//         return productionOrigins;
//     } else {
//         return [...developmentOrigins, ...productionOrigins];
//     }
// };
//
// const allowedOrigins = getAllowedOrigins();
//
// app.use(cors({
//     origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
//         if (!origin && process.env.NODE_ENV !== 'production') {
//             return callback(null, true);
//         }
//
//         if (!origin || allowedOrigins.includes(origin)) {
//             callback(null, true);
//         } else {
//             console.warn(`🚨 CORS: Blocked request from unauthorized origin: ${origin}`);
//             callback(new Error('Not allowed by CORS'));
//         }
//     },
//     methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD'],
//     allowedHeaders: ['Content-Type', 'Authorization'],
//     credentials: true,
//     maxAge: 86400 // 24 hours
// }));

// --- NEW: Allow all origins ---
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 86400 // 24 hours
}));

// Body parsing with suggested limits
app.use(express.json({ limit: '5gb' }));
app.use(express.urlencoded({ extended: true, limit: '3gb' }));

// Apply environment variable check middleware
app.use(envCheckMiddleware);

// Rate Limiting (disabled for now)
// app.use(generalLimiter);

// Routes
app.use('/api', routes);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, swaggerUiOptions));

app.get('/', (req: Request, res: Response) => {
    res.send('Farmy Backend is running! Access API docs at /api-docs');
});

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
