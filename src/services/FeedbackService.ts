import { AppDataSource } from '../config/db.config.js';
import { Feedback, FeedbackStatus } from '../models/Feedback.js';

export class FeedbackService {
    private static feedbackRepo = AppDataSource.getRepository(Feedback);

    static async createFeedback(data: Partial<Feedback>) {
        const feedback = this.feedbackRepo.create(data);
        return await this.feedbackRepo.save(feedback);
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

        return await this.feedbackRepo.save(feedback);
    }

    static async deleteFeedback(id: string, userId: string) {
        const feedback = await this.feedbackRepo.findOne({ where: { id, user_id: userId } });
        if (!feedback) throw new Error('Feedback not found or unauthorized');

        return await this.feedbackRepo.remove(feedback);
    }
}
