import express, { type Application, type Request, type Response } from 'express';
import { swaggerUi, swaggerSpec, swaggerUiOptions } from './config/swagger.js';

const app: Application = express();

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, swaggerUiOptions));

app.get('/', (req: Request, res: Response) => {
    res.send('Farmy Backend is running! Access API docs at /api-docs');
});

export default app;
