import { rateLimit } from 'express-rate-limit';

export const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 100, // Limit each IP to 100 requests per `window`
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: {
        status: 'error',
        message: 'Too many requests from this IP, please try again after 15 minutes'
    }
});

export const aiAssistantLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    limit: 20,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: {
        success: false,
        error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many AI assistant requests. Please wait a minute and try again.'
        }
    }
});
