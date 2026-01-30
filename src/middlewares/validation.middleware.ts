import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { AppError } from './error.middleware.js';

export interface ValidationRequest extends Request {
    validatedData?: any;
}

export const validateRequest = (schema: Joi.ObjectSchema) => {
    return (req: ValidationRequest, res: Response, next: NextFunction) => {
        const { error, value } = schema.validate(req.body, {
            abortEarly: false,
            allowUnknown: false,
            stripUnknown: true
        });

        if (error) {
            const errorMessages = error.details.map(detail => ({
                field: detail.path.join('.'),
                message: detail.message
            }));

            return res.status(400).json({
                success: false,
                error: 'Validation failed',
                details: errorMessages
            });
        }

        req.validatedData = value;
        next();
    };
};

export const commonSchemas = {
    uuid: Joi.string().uuid().required(),
    pagination: Joi.object({
        page: Joi.number().integer().min(1).default(1),
        limit: Joi.number().integer().min(1).max(100).default(10),
    })
};
