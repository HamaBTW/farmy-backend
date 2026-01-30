import express, { type Application, type Request, type Response } from 'express';

const app: Application = express();

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.get('/', (req: Request, res: Response) => {
    res.send('Farmy Backend is running!');
});

export default app;
