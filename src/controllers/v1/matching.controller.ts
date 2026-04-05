import { Request, Response, NextFunction } from 'express';
import { matchingService } from '../../services/v1/matching.service.js';
import { AuthRequest } from '../../middlewares/auth.middleware.js';

export const getSmartMatches = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.query.userId as string;
    const role = req.query.role as string;

    if (!userId || !role) {
      return res.status(400).json({
        success: false,
        message: 'userId and role are required'
      });
    }

    const matches = await matchingService.getSmartMatches(userId, role);
    res.json({
      success: true,
      data: { matches }
    });
  } catch (error) {
    console.error('Error in getSmartMatches:', error);
    next(error);
  }
};

export const sendMatchRequest = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { fromUserId, toUserId, matchType } = req.body;

    if (!fromUserId || !toUserId || !matchType) {
      return res.status(400).json({
        success: false,
        message: 'fromUserId, toUserId, and matchType are required'
      });
    }

    const success = await matchingService.sendMatchRequest(fromUserId, toUserId, matchType);

    if (success) {
      res.json({
        success: true,
        message: 'Match request sent successfully'
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to send match request'
      });
    }
  } catch (error) {
    console.error('Error in sendMatchRequest:', error);
    next(error);
  }
};