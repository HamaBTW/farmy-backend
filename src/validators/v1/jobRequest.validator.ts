import Joi from 'joi';

export const createJobRequestSchema = Joi.object({
    land_id: Joi.string().uuid().required(),
    title: Joi.string().min(3).max(100).required(),
    description: Joi.string().min(10).required(),
    required_skills: Joi.array().items(Joi.string()).optional().allow(null),
    salary: Joi.number().positive().optional().allow(null),
    duration: Joi.string().optional().allow(null),
    task_type: Joi.string().optional().allow(null),
});
