import Joi from 'joi';

const deliveryStatuses = [
    'ORDER_CREATED',
    'CONFIRMED',
    'PREPARING',
    'OUT_FOR_DELIVERY',
    'NEARBY',
    'DELIVERED',
    'CANCELLED'
];

export const updateDeliveryStatusSchema = Joi.object({
    status: Joi.string()
        .valid(...deliveryStatuses)
        .required()
        .messages({
            'any.only': `Status must be one of: ${deliveryStatuses.join(', ')}`,
            'any.required': 'Status is required'
        }),
    note: Joi.string().max(500).optional().allow('', null),
    latitude: Joi.number().min(-90).max(90).optional().allow(null),
    longitude: Joi.number().min(-180).max(180).optional().allow(null),
    cancellation_reason: Joi.string().max(500).optional().allow('', null)
});

export const updateDeliveryLocationSchema = Joi.object({
    latitude: Joi.number().min(-90).max(90).required()
        .messages({ 'any.required': 'Latitude is required' }),
    longitude: Joi.number().min(-180).max(180).required()
        .messages({ 'any.required': 'Longitude is required' })
});
