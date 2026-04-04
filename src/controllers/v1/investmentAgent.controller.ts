import { Request, Response } from 'express';
import { investmentAgentService } from '../../services/v1/investmentAgent.service.js';

export const getInvestmentRecommendations = async (req: Request, res: Response): Promise<void> => {
    try {
        const { preferences } = req.body;
        
        const result = await investmentAgentService.getRecommendations(preferences || '');

        res.status(200).json({
            success: true,
            data: result
        });
    } catch (error: any) {
        console.error('[InvestmentAgentController] Error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate investment recommendations',
            error: error.message
        });
    }
};
