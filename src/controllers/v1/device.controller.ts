import { Request, Response } from 'express';
import { DeviceService } from '../../services/v1/device.service.js';

const deviceService = new DeviceService();

export class DeviceController {
    async register(req: Request, res: Response) {
        try {
            const { token, fingerprint, platform } = req.body;
            const userId = (req as any).user.id;

            if (!token) {
                return res.status(400).json({
                    success: false,
                    message: 'Token is required'
                });
            }

            const device = await deviceService.upsertDevice(userId, token, fingerprint, platform);

            res.status(200).json({
                success: true,
                message: 'Device registered successfully',
                data: device
            });
        } catch (error: any) {
            res.status(500).json({
                success: false,
                message: error.message || 'Error registering device'
            });
        }
    }

    async unregister(req: Request, res: Response) {
        try {
            const { token } = req.body;

            if (!token) {
                return res.status(400).json({
                    success: false,
                    message: 'Token is required'
                });
            }

            await deviceService.removeToken(token);

            res.status(200).json({
                success: true,
                message: 'Device unregistered successfully'
            });
        } catch (error: any) {
            res.status(500).json({
                success: false,
                message: error.message || 'Error unregistering device'
            });
        }
    }

    async testSend(req: Request, res: Response) {
        try {
            const { userId, userIds, title, body, data } = req.body;
            const targetIds = userIds || userId;

            if (!targetIds || !title || !body) {
                return res.status(400).json({
                    success: false,
                    message: 'userId/userIds, title, and body are required'
                });
            }

            const { firebaseService } = await import('../../services/v1/firebase.service.js');
            const result = await firebaseService.sendToUsers(targetIds, title, body, data);

            res.status(200).json({
                success: true,
                message: 'Test notification(s) sent',
                data: result
            });
        } catch (error: any) {
            res.status(500).json({
                success: false,
                message: error.message || 'Error sending test notification'
            });
        }
    }
}
