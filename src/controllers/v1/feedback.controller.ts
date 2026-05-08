import { Request, Response } from 'express';
import { FeedbackService } from '../../services/FeedbackService.js';
import { FeedbackStatus } from '../../models/Feedback.js';

export class FeedbackController {
    static async create(req: Request, res: Response) {
        try {
            const user_id = (req as any).user.id;
            const feedback = await FeedbackService.createFeedback({
                ...req.body,
                user_id
            });
            res.status(201).json(feedback);
        } catch (error: any) {
            res.status(400).json({ message: error.message });
        }
    }

    static async getMyFeedbacks(req: Request, res: Response) {
        try {
            const user_id = (req as any).user.id;
            const feedbacks = await FeedbackService.getMyFeedbacks(user_id);
            res.json(feedbacks);
        } catch (error: any) {
            res.status(500).json({ message: error.message });
        }
    }

    static async getDetails(req: Request, res: Response) {
        try {
            const user_id = (req as any).user.id;
            const { id } = req.params;
            const feedback = await FeedbackService.getFeedbackById(id as string, user_id);
            
            if (!feedback) {
                return res.status(404).json({ message: 'Feedback not found' });
            }
            
            res.json(feedback);
        } catch (error: any) {
            res.status(500).json({ message: error.message });
        }
    }

    static async updateStatus(req: Request, res: Response) {
        try {
            // Admin only check should be in middleware, but we'll add a check here too if needed
            const { id } = req.params;
            const { status, admin_notes } = req.body;
            
            if (!Object.values(FeedbackStatus).includes(status)) {
                return res.status(400).json({ message: 'Invalid status' });
            }

            const feedback = await FeedbackService.updateFeedbackStatus(id as string, status, admin_notes);
            res.json(feedback);
        } catch (error: any) {
            res.status(400).json({ message: error.message });
        }
    }

    static async delete(req: Request, res: Response) {
        try {
            const user_id = (req as any).user.id;
            const { id } = req.params;
            await FeedbackService.deleteFeedback(id as string, user_id);
            res.status(204).send();
        } catch (error: any) {
            res.status(400).json({ message: error.message });
        }
    }
}
