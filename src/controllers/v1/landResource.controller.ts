import { Request, Response } from 'express';
import { AppDataSource } from '../../config/db.config.js';
import { LandResource } from '../../models/LandResource.js';
import { Land } from '../../models/Land.js';
import { ProductType } from '../../models/ProductType.js';

const landResourceRepo = AppDataSource.getRepository(LandResource);
const landRepo = AppDataSource.getRepository(Land);
const productTypeRepo = AppDataSource.getRepository(ProductType);

/**
 * Get all resources for a specific land
 */
export const getLandResources = async (req: Request, res: Response) => {
  try {
    const landId = req.params.landId as string;

    const resources = await landResourceRepo.find({
      where: { land_id: landId },
      relations: ['resource_type'],
      order: { createdAt: 'DESC' }
    });

    res.status(200).json({
      success: true,
      data: resources
    });
  } catch (error: any) {
    console.error('Error fetching land resources:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch land resources',
      error: error.message
    });
  }
};

/**
 * Add a resource to a land
 */
export const addLandResource = async (req: Request, res: Response) => {
  try {
    const landId = req.params.landId as string;
    const { resource_type_id, quantity, max_capacity } = req.body;

    // Verify land exists
    const land = await landRepo.findOne({ where: { id: landId } });
    if (!land) {
      return res.status(404).json({
        success: false,
        message: 'Land not found'
      });
    }

    // Verify resource type exists
    const resourceType = await productTypeRepo.findOne({ where: { id: resource_type_id } });
    if (!resourceType) {
      return res.status(404).json({
        success: false,
        message: 'Resource type not found'
      });
    }

    // Check if resource already exists for this land
    const existingResource = await landResourceRepo.findOne({
      where: { land_id: landId, resource_type_id: resource_type_id as string }
    });

    if (existingResource) {
      // Update existing resource
      existingResource.quantity = Number(existingResource.quantity) + Number(quantity);
      if (max_capacity) {
        existingResource.max_capacity = Number(max_capacity);
      }
      existingResource.last_updated = new Date();

      const updated = await landResourceRepo.save(existingResource);

      return res.status(200).json({
        success: true,
        message: 'Resource updated successfully',
        data: updated
      });
    }

    // Create new resource
    const resource = landResourceRepo.create({
      land_id: landId,
      resource_type_id,
      quantity: Number(quantity) || 0,
      max_capacity: Number(max_capacity) || 1000,
      last_updated: new Date()
    });

    const saved = await landResourceRepo.save(resource);

    // Fetch with relations
    const result = await landResourceRepo.findOne({
      where: { id: saved.id },
      relations: ['resource_type']
    });

    res.status(201).json({
      success: true,
      message: 'Resource added successfully',
      data: result
    });
  } catch (error: any) {
    console.error('Error adding land resource:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add land resource',
      error: error.message
    });
  }
};

/**
 * Update a land resource quantity
 */
export const updateLandResource = async (req: Request, res: Response) => {
  try {
    const landId = req.params.landId as string;
    const resourceId = req.params.resourceId as string;
    const { quantity, max_capacity } = req.body;

    const resource = await landResourceRepo.findOne({
      where: { id: resourceId, land_id: landId }
    });

    if (!resource) {
      return res.status(404).json({
        success: false,
        message: 'Resource not found'
      });
    }

    if (quantity !== undefined) {
      resource.quantity = Number(quantity);
    }
    if (max_capacity !== undefined) {
      resource.max_capacity = Number(max_capacity);
    }
    resource.last_updated = new Date();

    const updated = await landResourceRepo.save(resource);

    // Fetch with relations
    const result = await landResourceRepo.findOne({
      where: { id: updated.id },
      relations: ['resource_type']
    });

    res.status(200).json({
      success: true,
      message: 'Resource updated successfully',
      data: result
    });
  } catch (error: any) {
    console.error('Error updating land resource:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update land resource',
      error: error.message
    });
  }
};

/**
 * Delete a land resource
 */
export const deleteLandResource = async (req: Request, res: Response) => {
  try {
    const landId = req.params.landId as string;
    const resourceId = req.params.resourceId as string;

    const resource = await landResourceRepo.findOne({
      where: { id: resourceId, land_id: landId }
    });

    if (!resource) {
      return res.status(404).json({
        success: false,
        message: 'Resource not found'
      });
    }

    await landResourceRepo.remove(resource);

    res.status(200).json({
      success: true,
      message: 'Resource deleted successfully'
    });
  } catch (error: any) {
    console.error('Error deleting land resource:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete land resource',
      error: error.message
    });
  }
};

/**
 * Get land stats (level, money, food, etc.)
 */
export const getLandStats = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;

    const land = await landRepo.findOne({
      where: { id },
      select: ['id', 'name', 'level', 'experience', 'money', 'food_storage', 'max_food_storage']
    });

    if (!land) {
      return res.status(404).json({
        success: false,
        message: 'Land not found'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        id: land.id,
        name: land.name,
        level: land.level,
        experience: land.experience,
        money: land.money,
        food_storage: land.food_storage,
        max_food_storage: land.max_food_storage
      }
    });
  } catch (error: any) {
    console.error('Error fetching land stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch land stats',
      error: error.message
    });
  }
};

/**
 * Update land stats (for game actions)
 */
export const updateLandStats = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { level, experience, money, food_storage, max_food_storage } = req.body;

    const land = await landRepo.findOne({ where: { id } });

    if (!land) {
      return res.status(404).json({
        success: false,
        message: 'Land not found'
      });
    }

    if (level !== undefined) land.level = Number(level);
    if (experience !== undefined) land.experience = Number(experience);
    if (money !== undefined) land.money = Number(money);
    if (food_storage !== undefined) land.food_storage = Number(food_storage);
    if (max_food_storage !== undefined) land.max_food_storage = Number(max_food_storage);

    const updated = await landRepo.save(land);

    res.status(200).json({
      success: true,
      message: 'Land stats updated successfully',
      data: {
        id: updated.id,
        name: updated.name,
        level: updated.level,
        experience: updated.experience,
        money: updated.money,
        food_storage: updated.food_storage,
        max_food_storage: updated.max_food_storage
      }
    });
  } catch (error: any) {
    console.error('Error updating land stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update land stats',
      error: error.message
    });
  }
};
