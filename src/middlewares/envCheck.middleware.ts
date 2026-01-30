import { Request, Response, NextFunction } from 'express';

// List of required environment variables for Farmy
const requiredEnvVariables = [
    'PORT',
    'JWT_SECRET',
    'NODE_ENV',
    'DB_HOST',
    'DB_PORT',
    'DB_USER',
    'DB_PASSWORD',
    'DB_NAME'
];

// Function to validate environment variables on startup
export const checkEnvVariables = () => {
    const missingVariables = requiredEnvVariables.filter((variable) => {
        if (variable === 'DB_PASSWORD') {
            return process.env[variable] === undefined;
        }
        return !process.env[variable];
    });

    if (missingVariables.length > 0) {
        console.error(`🚨 Missing required environment variables: ${missingVariables.join(', ')}`);
        return false;
    }

    return true;
};

// Middleware to check environment variables on each request
export const envCheckMiddleware = (req: Request, res: Response, next: NextFunction) => {
    if (!checkEnvVariables()) {
        return res.status(500).json({ error: 'Server error: Missing required environment variables' });
    }
    next();
};
