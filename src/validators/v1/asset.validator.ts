import Joi from 'joi';

const assetCategories = ['animal', 'vegetation', 'tree', 'structure', 'machine'];

// Asset Type schemas
export const createAssetTypeSchema = Joi.object({
    name: Joi.string().min(2).max(100).required(),
    description: Joi.string().max(500).optional(),
    icon_url: Joi.string().uri().optional()
});

export const updateAssetTypeSchema = Joi.object({
    name: Joi.string().min(2).max(100).optional(),
    description: Joi.string().max(500).optional().allow(null),
    icon_url: Joi.string().uri().optional().allow(null),
    is_active: Joi.boolean().optional()
});

// Unified Variant schema (all categories use attributes JSON)
export const createVariantSchema = Joi.object({
    type_id: Joi.string().uuid().required(),
    variant_code: Joi.string().min(2).max(50).required(),
    base_price: Joi.number().positive().required(),
    attributes: Joi.object().optional(),
    image_url: Joi.string().uri().optional()
});

export const updateVariantSchema = Joi.object({
    type_id: Joi.string().uuid().optional(),
    variant_code: Joi.string().min(2).max(50).optional(),
    base_price: Joi.number().positive().optional(),
    attributes: Joi.object().optional().allow(null),
    image_url: Joi.string().uri().optional().allow(null),
    is_available: Joi.boolean().optional()
});

// Product Type schemas
export const createProductTypeSchema = Joi.object({
    name: Joi.string().min(2).max(100).required(),
    unit: Joi.string().min(1).max(50).required(),
    description: Joi.string().max(500).optional(),
    icon_url: Joi.string().uri().optional()
});

export const updateProductTypeSchema = Joi.object({
    name: Joi.string().min(2).max(100).optional(),
    unit: Joi.string().min(1).max(50).optional(),
    description: Joi.string().max(500).optional().allow(null),
    icon_url: Joi.string().uri().optional().allow(null),
    is_active: Joi.boolean().optional()
});

// Asset Production schemas
export const addProductionSchema = Joi.object({
    product_id: Joi.string().uuid().required(),
    rate_per_cycle: Joi.number().min(0).required(),
    cycle_days: Joi.number().integer().min(1).optional(),
    on_harvest_only: Joi.boolean().optional(),
    min_level: Joi.number().integer().min(0).optional(),
    conditions: Joi.object().optional()
});

export const updateProductionSchema = Joi.object({
    rate_per_cycle: Joi.number().min(0).optional(),
    cycle_days: Joi.number().integer().min(1).optional(),
    on_harvest_only: Joi.boolean().optional(),
    min_level: Joi.number().integer().min(0).optional(),
    conditions: Joi.object().optional().allow(null)
});

const boundaryPointSchema = Joi.alternatives().try(
    Joi.array().length(2).ordered(
        Joi.number().min(-180).max(180).required(),
        Joi.number().min(-90).max(90).required(),
    ),
    Joi.object({
        longitude: Joi.number().min(-180).max(180).required(),
        latitude: Joi.number().min(-90).max(90).required(),
    }),
    Joi.object({
        lng: Joi.number().min(-180).max(180).required(),
        lat: Joi.number().min(-90).max(90).required(),
    }),
    Joi.object({
        x: Joi.number().min(-180).max(180).required(),
        y: Joi.number().min(-90).max(90).required(),
    }),
);

// Land schemas
export const createLandSchema = Joi.object({
    name: Joi.string().min(2).max(100).required(),
    description: Joi.string().max(500).optional(),
    price: Joi.number().positive().min(0).optional(),
    width_m: Joi.number().min(1).max(500).optional(),
    height_m: Joi.number().min(1).max(500).optional(),
    grid_width: Joi.number().integer().min(1).max(500).optional(), // Maintain backward compatibility
    grid_height: Joi.number().integer().min(1).max(500).optional(),
    boundaries: Joi.array().items(boundaryPointSchema).min(3).optional()
});

export const updateLandSchema = Joi.object({
    name: Joi.string().min(2).max(100).optional(),
    description: Joi.string().max(500).optional().allow(null),
    price: Joi.number().positive().min(0).optional().allow(null),
    width_m: Joi.number().min(1).max(500).optional(),
    height_m: Joi.number().min(1).max(500).optional(),
    grid_width: Joi.number().integer().min(1).max(500).optional(),
    grid_height: Joi.number().integer().min(1).max(500).optional(),
    boundaries: Joi.array().items(boundaryPointSchema).min(3).optional().allow(null),
    is_active: Joi.boolean().optional()
});

// Item Request schemas
export const createItemRequestSchema = Joi.object({
    land_id: Joi.string().uuid().required(),
    asset_category: Joi.string().valid(...assetCategories).required(),
    variant_id: Joi.string().uuid().required(),
    position_x: Joi.number().integer().min(0).required(),
    position_y: Joi.number().integer().min(0).required()
});

export const rejectItemRequestSchema = Joi.object({
    reason: Joi.string().min(5).max(500).required()
});

// Placed Item schemas
export const updatePlacedItemStateSchema = Joi.object({
    state: Joi.object().required()
});

export const movePlacedItemSchema = Joi.object({
    position_x: Joi.number().integer().min(0).required(),
    position_y: Joi.number().integer().min(0).required()
});

export const placeItemSchema = Joi.object({
    position_x: Joi.number().integer().min(0).required(),
    position_y: Joi.number().integer().min(0).required(),
    rotation: Joi.number().integer().min(0).max(3).optional()
});
