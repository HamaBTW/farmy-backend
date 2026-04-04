import { Request, Response, NextFunction } from 'express';
import { farmerAgentService } from '../../services/v1/farmerAgent.service.js';

export class FarmerAgentController {
    async analyze(req: Request, res: Response) {
        try {
            const userId = (req as any).user.id;
            const { landId, question, sessionId } = req.body;
            const data = await farmerAgentService.getProfitAnalysis(userId, landId, question, sessionId);
            res.status(200).json({ success: true, data });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    async getHistory(req: Request, res: Response) {
        try {
            const userId = (req as any).user.id;
            const history = await farmerAgentService.getHistory(userId);
            res.status(200).json({ success: true, data: history });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    async getSessionDetails(req: Request, res: Response) {
        try {
            const userId = (req as any).user.id;
            const sessionId = req.params.sessionId as string;
            const session = await farmerAgentService.getSessionDetails(userId, sessionId);
            res.status(200).json({ success: true, data: session });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    async deleteSession(req: Request, res: Response) {
        try {
            const userId = (req as any).user.id;
            const sessionId = req.params.sessionId as string;
            const success = await farmerAgentService.deleteSession(userId, sessionId);
            res.status(200).json({ success, message: success ? 'Session deleted' : 'Session not found' });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    }
}

export const farmerAgentController = new FarmerAgentController();
