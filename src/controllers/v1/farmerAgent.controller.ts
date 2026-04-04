import { Request, Response, NextFunction } from 'express';
import { farmerAgentService } from '../../services/v1/farmerAgent.service.js';

export const getFarmerAnalysis = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = (req as any).user?.id!;
        const { landId, question } = req.body;
        
        const result = await farmerAgentService.getProfitAnalysis(userId, landId, question);

        res.status(200).json({
            success: true,
            data: result
        });
    } catch (error) {
        next(error);
    }
};
