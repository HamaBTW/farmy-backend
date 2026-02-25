import { Request, Response } from 'express';
import { AppDataSource } from '../../config/db.config.js';
import { Notification } from '../../models/Notification.js';

export class NotificationController {
    private notificationRepo = AppDataSource.getRepository(Notification);

    async getMyNotifications(req: Request, res: Response) {
        try {
            const userId = (req as any).user.id;
            const notifications = await this.notificationRepo.find({
                where: { user_id: userId },
                order: { createdAt: 'DESC' },
                take: 50 // Limit to latest 50
            });

            res.status(200).json({
                success: true,
                data: notifications
            });
        } catch (error: any) {
            res.status(500).json({
                success: false,
                message: error.message || 'Error fetching notifications'
            });
        }
    }

    async markAsRead(req: Request, res: Response) {
        try {
            const userId = (req as any).user.id;
            const { id } = req.params;

            const notification = await this.notificationRepo.findOne({
                where: { id: id as string, user_id: userId }
            });

            if (!notification) {
                return res.status(404).json({
                    success: false,
                    message: 'Notification not found'
                });
            }

            notification.is_read = true;
            await this.notificationRepo.save(notification);

            res.status(200).json({
                success: true,
                message: 'Notification marked as read'
            });
        } catch (error: any) {
            res.status(500).json({
                success: false,
                message: error.message || 'Error marking notification as read'
            });
        }
    }

    async markAllAsRead(req: Request, res: Response) {
        try {
            const userId = (req as any).user.id;

            await this.notificationRepo.update(
                { user_id: userId, is_read: false },
                { is_read: true }
            );

            res.status(200).json({
                success: true,
                message: 'All notifications marked as read'
            });
        } catch (error: any) {
            res.status(500).json({
                success: false,
                message: error.message || 'Error marking all notifications as read'
            });
        }
    }

    async delete(req: Request, res: Response) {
        try {
            const userId = (req as any).user.id;
            const { id } = req.params;

            const result = await this.notificationRepo.delete({ id: id as string, user_id: userId });

            if (result.affected === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Notification not found'
                });
            }

            res.status(200).json({
                success: true,
                message: 'Notification deleted'
            });
        } catch (error: any) {
            res.status(500).json({
                success: false,
                message: error.message || 'Error deleting notification'
            });
        }
    }
}
