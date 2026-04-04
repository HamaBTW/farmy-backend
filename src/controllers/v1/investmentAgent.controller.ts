import { Request, Response } from 'express';
import { investmentAgentService } from '../../services/v1/investmentAgent.service.js';

export const getInvestmentRecommendations = async (req: Request, res: Response): Promise<void> => {
    try {
        const { preferences, sessionId } = req.body;
        const userId = (req as any).user?.id!;
        
        const result = await investmentAgentService.getRecommendations(preferences, userId, sessionId);

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

export const getInvestmentHistory = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as any).user?.id!;
        const sessions = await investmentAgentService.getHistory(userId);
        res.status(200).json({ success: true, data: sessions });
    } catch (error: any) {
        res.status(500).json({ success: false, message: 'Failed to load investment history.' });
    }
};

export const getInvestmentSession = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as any).user?.id!;
        const { sessionId } = req.params;
        const session = await investmentAgentService.getSession(userId, sessionId as string);
        res.status(200).json({ success: true, data: session });
    } catch (error: any) {
        res.status(500).json({ success: false, message: 'Failed to load investment session.' });
    }
};
