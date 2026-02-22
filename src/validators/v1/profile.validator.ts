import Joi from 'joi';

export const updateProfileSchema = Joi.object({
    // Top-Level User Updates
    phone: Joi.string().optional().allow(null, ''),

    // Profile JSON Updates
    profile: Joi.object({
        // Core
        username: Joi.string().pattern(/^[a-zA-Z0-9_.-]+$/).min(3).max(30).optional(),
        name: Joi.string().max(100).optional(),
        picture: Joi.string().uri().optional().allow(null, ''),
        cover_image: Joi.string().uri().optional().allow(null, ''),
        dob: Joi.string().isoDate().optional().allow(null, ''),
        country: Joi.string().max(100).optional().allow(null, ''),
        city: Joi.string().max(100).optional().allow(null, ''),
        timezone: Joi.string().max(100).optional().allow(null, ''),
        preferred_language: Joi.string().max(50).optional().allow(null, ''),

        // Trust
        headline: Joi.string().max(150).optional().allow(null, ''),
        bio: Joi.string().max(2000).optional().allow(null, ''),
        portfolio_links: Joi.object({
            linkedin: Joi.string().uri().optional().allow(null, ''),
            website: Joi.string().uri().optional().allow(null, ''),
            farm_page: Joi.string().uri().optional().allow(null, '')
        }).optional(),

        // Role-Aware
        farmer_details: Joi.object({
            business_name: Joi.string().max(100).optional().allow(null, ''),
            farm_locations: Joi.array().items(Joi.string()).optional(),
            production_types: Joi.array().items(Joi.string()).optional(),
            workforce_size: Joi.string().optional().allow(null, ''),
            preferred_hiring_types: Joi.array().items(Joi.string()).optional()
        }).optional(),
        investor_details: Joi.object({
            investment_focus: Joi.array().items(Joi.string()).optional(),
            budget_range: Joi.string().optional().allow(null, ''),
            risk_profile: Joi.string().optional().allow(null, ''),
            preferred_regions: Joi.array().items(Joi.string()).optional(),
            involvement_level: Joi.string().optional().allow(null, '')
        }).optional(),

        // Privacy Controls
        privacy_settings: Joi.object({
            discoverable: Joi.boolean().optional(),
            show_contact_info: Joi.boolean().optional(),
            field_visibility: Joi.object().pattern(Joi.string(), Joi.string().valid('public', 'platform', 'private')).optional()
        }).optional(),

        completeness_score: Joi.number().min(0).max(100).optional()
    }).optional()
});
