import { Request, Response, NextFunction } from 'express';
import { smartMatchingService } from '../../services/v1/smartMatching.service.js';
import { AuthRequest } from '../../middlewares/auth.middleware.js';

export const getSmartProductRecommendations = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const limit = parseInt(req.query.limit as string) || 10;
    console.log(`🎯 Fetching smart product recommendations for user ${req.user.id}`);

    const recommendations = await smartMatchingService.getSmartProductRecommendations(req.user.id, limit);

    res.status(200).json({
      success: true,
      message: 'Smart product recommendations fetched',
      data: recommendations.map((item) => ({
        id: item.id,
        title: item.title,
        description: item.description,
        price: item.price,
        quantity: item.quantity,
        unit: item.unit,
        images: item.images,
        owner: item.owner,
        productType: item.product_type,
        status: item.status,
        matchScore: Math.round(item.finalScore),
        matchFactors: item.matchFactors,
        aiReasoning: item.aiReasoning
      }))
    });
  } catch (error) {
    next(error);
  }
};

export const getSmartLandRecommendations = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const limit = parseInt(req.query.limit as string) || 10;
    console.log(`🎯 Fetching smart land recommendations for user ${req.user.id}`);

    const recommendations = await smartMatchingService.getSmartLandRecommendations(req.user.id, limit);

    res.status(200).json({
      success: true,
      message: 'Smart land recommendations fetched',
      data: recommendations.map((item) => ({
        id: item.id,
        name: item.name,
        description: item.description,
        widthM: item.width_m,
        heightM: item.height_m,
        gridWidth: (item.width_m / 1) * 10, // Calculate from width
        gridHeight: (item.height_m / 1) * 10, // Calculate from height
        boundaries: item.boundaries,
        owner: item.owner,
        matchScore: Math.round(item.finalScore),
        matchFactors: item.matchFactors,
        aiReasoning: item.aiReasoning
      }))
    });
  } catch (error) {
    next(error);
  }
};
