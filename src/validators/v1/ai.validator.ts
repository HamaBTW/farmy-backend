import Joi from 'joi';

export const aiAskSchema = Joi.object({
    message: Joi.string().trim().min(2).max(1200).required(),
    context: Joi.object({
        location: Joi.string().trim().max(120).allow('', null).optional(),
        crop: Joi.string().trim().max(120).allow('', null).optional(),
        season: Joi.string().trim().max(60).allow('', null).optional(),
        language: Joi.string().valid('auto', 'ar', 'fr', 'en').default('auto')
    }).default({})
});

export const aiCreateChatSchema = Joi.object({
    title: Joi.string().trim().min(2).max(180).optional()
});

export const aiRenameChatSchema = Joi.object({
    title: Joi.string().trim().min(2).max(180).required()
});

export const aiChatMessageSchema = Joi.object({
    message: Joi.string().trim().min(2).max(1200).required(),
});
