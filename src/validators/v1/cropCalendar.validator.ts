import Joi from 'joi';

// Create Crop Plan schema
export const createCropPlanSchema = Joi.object({
    land_id: Joi.string().uuid().required(),
    variant_id: Joi.string().uuid().required(),
    variant_name: Joi.string().max(100).required(),
    asset_category: Joi.string().valid('vegetation', 'tree').required(),
    icon_url: Joi.string().uri().optional().allow(null, ''),
    planned_planting_date: Joi.date().iso().required(),
    expected_harvest_date: Joi.date().iso().optional().allow(null),
    cycle_days: Joi.number().integer().positive().optional(),
    growth_days: Joi.number().integer().positive().optional(),
    is_perennial: Joi.boolean().default(false),
    notes: Joi.string().max(1000).optional().allow(null, ''),
});

// Update Crop Plan schema
export const updateCropPlanSchema = Joi.object({
    variant_id: Joi.string().uuid().optional(),
    variant_name: Joi.string().max(100).optional(),
    asset_category: Joi.string().valid('vegetation', 'tree').optional(),
    icon_url: Joi.string().uri().optional().allow(null, ''),
    planned_planting_date: Joi.date().iso().optional(),
    expected_harvest_date: Joi.date().iso().optional().allow(null),
    cycle_days: Joi.number().integer().positive().optional(),
    growth_days: Joi.number().integer().positive().optional(),
    is_perennial: Joi.boolean().optional(),
    status: Joi.string().valid('planned', 'active', 'completed', 'cancelled').optional(),
    notes: Joi.string().max(1000).optional().allow(null, ''),
    completed_at: Joi.date().iso().optional().allow(null),
});

// Validate UUID parameter
export const uuidParamSchema = Joi.object({
    id: Joi.string().uuid().required(),
    landId: Joi.string().uuid().required(),
});

// Query schema for upcoming harvests
export const upcomingHarvestsQuerySchema = Joi.object({
    days: Joi.number().integer().positive().max(365).optional(),
});
