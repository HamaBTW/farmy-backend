import { AppDataSource } from '../../config/db.config.js';
import { Device } from '../../models/Device.js';

export class DeviceService {
    private deviceRepository = AppDataSource.getRepository(Device);

    async upsertDevice(userId: string, token: string, fingerprint?: string, platform?: string) {
        let device: Device | null = null;

        // Try to find by fingerprint first (more reliable identification of the physical device)
        if (fingerprint && fingerprint !== 'unknown_device') {
            device = await this.deviceRepository.findOne({
                where: { fingerprint, userId }
            });
        }

        // If not found by fingerprint, try by token
        if (!device) {
            device = await this.deviceRepository.findOne({
                where: { token }
            });
        }

        if (device) {
            device.userId = userId;
            device.token = token; // Update token in case it changed
            device.fingerprint = fingerprint || device.fingerprint;
            device.platform = platform || device.platform;
            device.lastUsedAt = new Date();
        } else {
            device = this.deviceRepository.create({
                userId,
                token,
                fingerprint,
                platform,
                lastUsedAt: new Date()
            });
        }

        return await this.deviceRepository.save(device);
    }

    async removeToken(token: string) {
        return await this.deviceRepository.delete({ token });
    }

    async getDevicesByUserId(userId: string) {
        return await this.deviceRepository.find({
            where: { userId }
        });
    }
}
