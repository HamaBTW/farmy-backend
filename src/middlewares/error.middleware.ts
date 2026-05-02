import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger.js';

export class AppError extends Error {
    statusCode: number;
    isOperational: boolean;

    constructor(statusCode: number, message: string, isOperational = true) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        Error.captureStackTrace(this, this.constructor);
    }
}

// Global error handler middleware
export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
    const statusCode = err.statusCode || 500;
    const message = err.message || 'Something went wrong! Please try again later.';
    const isProduction = process.env.NODE_ENV === 'production';

    if (err.isOperational) {
        res.status(statusCode).json({
            status: 'error',
            message: message,
        });
    } else {
        // Log unexpected errors
        logger.error('Unexpected Error: %O', err);

        res.status(500).json({
            status: 'error',
            message: isProduction ? 'Something went wrong! Please try again later.' : message,
        });
    }
};

// Not Found (404) handler
export const notFoundHandler = (req: Request, res: Response, next: NextFunction) => {
    res.status(404).json({
        status: 'error',
        message: 'Resource not found',
    });
};
