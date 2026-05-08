import { AppDataSource } from '../config/db.config.js';
import { Feedback, FeedbackStatus } from '../models/Feedback.js';
import { getIO } from '../socket/socket.js';

export class FeedbackService {
    private static feedbackRepo = AppDataSource.getRepository(Feedback);

    static async createFeedback(data: Partial<Feedback>) {
        const feedback = this.feedbackRepo.create(data);
        const savedFeedback = await this.feedbackRepo.save(feedback);
        
        // Notify user via socket
        try {
            getIO().to(savedFeedback.user_id).emit('feedback_created', savedFeedback);
        } catch (e) {
            console.error('Socket emit error (create):', e);
        }
        
        return savedFeedback;
    }

    static async getMyFeedbacks(userId: string) {
        return await this.feedbackRepo.find({
            where: { user_id: userId },
            order: { createdAt: 'DESC' }
        });
    }

    static async getFeedbackById(id: string, userId?: string) {
        const where: any = { id };
        if (userId) where.user_id = userId;

        return await this.feedbackRepo.findOne({
            where,
            relations: ['user']
        });
    }

    static async getAllFeedbacks(filters?: any) {
        return await this.feedbackRepo.find({
            where: filters,
            order: { createdAt: 'DESC' },
            relations: ['user']
        });
    }

    static async updateFeedbackStatus(id: string, status: FeedbackStatus, adminNotes?: string) {
        const feedback = await this.feedbackRepo.findOne({ where: { id } });
        if (!feedback) throw new Error('Feedback not found');

        feedback.status = status;
        if (adminNotes) feedback.admin_notes = adminNotes;

        const updated = await this.feedbackRepo.save(feedback);
        
        // Notify user via socket
        try {
            getIO().to(updated.user_id).emit('feedback_updated', updated);
        } catch (e) {
            console.error('Socket emit error (update):', e);
        }

        return updated;
    }

    static async deleteFeedback(id: string, userId: string) {
        const feedback = await this.feedbackRepo.findOne({ where: { id, user_id: userId } });
        if (!feedback) throw new Error('Feedback not found or unauthorized');

        await this.feedbackRepo.remove(feedback);
        
        // Notify user via socket
        try {
            getIO().to(userId).emit('feedback_deleted', { id });
        } catch (e) {
            console.error('Socket emit error (delete):', e);
        }
        
        return true;
    }
}
