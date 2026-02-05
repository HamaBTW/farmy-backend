import Joi from 'joi';

const assetCategories = ['animal', 'vegetation', 'structure', 'machine'];

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

// Asset Variant schemas
export const createAnimalVariantSchema = Joi.object({
    type_id: Joi.string().uuid().required(),
    variant_code: Joi.string().min(2).max(50).required(),
    base_price: Joi.number().positive().required(),
    age: Joi.number().integer().min(0).optional(),
    milk_production: Joi.number().min(0).optional(),
    meat_yield: Joi.number().min(0).optional(),
    attributes: Joi.object().optional(),
    image_url: Joi.string().uri().optional()
});

export const createVegetationVariantSchema = Joi.object({
    type_id: Joi.string().uuid().required(),
    variant_code: Joi.string().min(2).max(50).required(),
    base_price: Joi.number().positive().required(),
    growth_days: Joi.number().integer().min(1).optional(),
    yield_amount: Joi.number().min(0).optional(),
    water_needs: Joi.number().min(0).optional(),
    attributes: Joi.object().optional(),
    image_url: Joi.string().uri().optional()
});

export const createStructureVariantSchema = Joi.object({
    type_id: Joi.string().uuid().required(),
    variant_code: Joi.string().min(2).max(50).required(),
    base_price: Joi.number().positive().required(),
    capacity: Joi.number().integer().min(0).optional(),
    durability: Joi.number().integer().min(0).max(100).optional(),
    upgrade_level: Joi.number().integer().min(1).optional(),
    attributes: Joi.object().optional(),
    image_url: Joi.string().uri().optional()
});

export const createMachineVariantSchema = Joi.object({
    type_id: Joi.string().uuid().required(),
    variant_code: Joi.string().min(2).max(50).required(),
    base_price: Joi.number().positive().required(),
    speed: Joi.number().min(0).optional(),
    efficiency: Joi.number().min(0).optional(),
    fuel_consumption: Joi.number().min(0).optional(),
    attributes: Joi.object().optional(),
    image_url: Joi.string().uri().optional()
});

export const updateVariantSchema = Joi.object({
    type_id: Joi.string().uuid().optional(),
    variant_code: Joi.string().min(2).max(50).optional(),
    base_price: Joi.number().positive().optional(),
    age: Joi.number().integer().min(0).optional(),
    milk_production: Joi.number().min(0).optional(),
    meat_yield: Joi.number().min(0).optional(),
    growth_days: Joi.number().integer().min(1).optional(),
    yield_amount: Joi.number().min(0).optional(),
    water_needs: Joi.number().min(0).optional(),
    capacity: Joi.number().integer().min(0).optional(),
    durability: Joi.number().integer().min(0).max(100).optional(),
    upgrade_level: Joi.number().integer().min(1).optional(),
    speed: Joi.number().min(0).optional(),
    efficiency: Joi.number().min(0).optional(),
    fuel_consumption: Joi.number().min(0).optional(),
    attributes: Joi.object().optional().allow(null),
    image_url: Joi.string().uri().optional().allow(null),
    is_available: Joi.boolean().optional()
});

// Land schemas
export const createLandSchema = Joi.object({
    name: Joi.string().min(2).max(100).required(),
    description: Joi.string().max(500).optional(),
    grid_width: Joi.number().integer().min(1).max(100).optional(),
    grid_height: Joi.number().integer().min(1).max(100).optional(),
    boundaries: Joi.any().optional()
});

export const updateLandSchema = Joi.object({
    name: Joi.string().min(2).max(100).optional(),
    description: Joi.string().max(500).optional().allow(null),
    grid_width: Joi.number().integer().min(1).max(100).optional(),
    grid_height: Joi.number().integer().min(1).max(100).optional(),
    boundaries: Joi.any().optional().allow(null),
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
