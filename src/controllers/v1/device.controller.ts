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
}
