import { Request, Response } from 'express';
import { AppDataSource } from '../../config/db.config.js';
import { AnimalCategory } from '../../models/AnimalCategory.js';
import { AnimalType } from '../../models/AnimalType.js';

const animalCategoryRepo = AppDataSource.getRepository(AnimalCategory);
const animalTypeRepo = AppDataSource.getRepository(AnimalType);

/**
 * Get all animal categories
 */
export const getAllAnimalCategories = async (req: Request, res: Response) => {
  try {
    const categories = await animalCategoryRepo.find({
      where: { is_active: true },
      relations: ['resource_consumptions', 'resource_consumptions.resource_type'],
      order: { created_at: 'ASC' }
    });

    res.status(200).json({
      success: true,
      data: categories
    });
  } catch (error: any) {
    console.error('Error fetching animal categories:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch animal categories',
      error: error.message
    });
  }
};

/**
 * Get a single animal category by ID with its animals
 */
export const getAnimalCategoryById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const category = await animalCategoryRepo.findOne({
      where: { id },
      relations: ['resource_consumptions', 'resource_consumptions.resource_type']
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Animal category not found'
      });
    }

    // Get animals in this category
    const animals = await animalTypeRepo.find({
      where: { category_id: id, is_active: true },
      relations: ['variants']
    });

    res.status(200).json({
      success: true,
      data: {
        ...category,
        animals
      }
    });
  } catch (error: any) {
    console.error('Error fetching animal category:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch animal category',
      error: error.message
    });
  }
};
