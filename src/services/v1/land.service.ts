import { AppDataSource } from '../../config/db.config.js';
import { Land } from '../../models/Land.js';
import { AppError } from '../../middlewares/error.middleware.js';

interface CreateLandData {
    owner_id: string;
    name: string;
    description?: string;
    grid_width?: number;
    grid_height?: number;
    boundaries?: any;
}

class LandService {
    private landRepo = AppDataSource.getRepository(Land);

    async create(data: CreateLandData) {
        const land = this.landRepo.create({
            ...data,
            grid_width: data.grid_width || 10,
            grid_height: data.grid_height || 10
        });
        return this.landRepo.save(land);
    }

    async findAll(ownerId?: string, includeInactive = false) {
        const where: any = {};
        if (ownerId) {
            where.owner_id = ownerId;
        }
        if (!includeInactive) {
            where.is_active = true;
        }
        return this.landRepo.find({
            where,
            relations: ['owner'],
            order: { createdAt: 'DESC' }
        });
    }

    async findById(id: string) {
        const land = await this.landRepo.findOne({
            where: { id },
            relations: ['owner']
        });
        if (!land) {
            throw new AppError(404, 'Land not found');
        }
        return land;
    }

    async findByIdWithItems(id: string) {
        const land = await this.landRepo.findOne({
            where: { id },
            relations: ['owner', 'placed_items']
        });
        if (!land) {
            throw new AppError(404, 'Land not found');
        }
        return land;
    }

    async findByOwner(ownerId: string) {
        return this.landRepo.find({
            where: { owner_id: ownerId, is_active: true },
            order: { createdAt: 'DESC' }
        });
    }

    async update(id: string, userId: string, data: Partial<CreateLandData & { is_active: boolean }>) {
        const land = await this.findById(id);

        if (land.owner_id !== userId) {
            throw new AppError(403, 'You do not own this land');
        }

        Object.assign(land, data);
        return this.landRepo.save(land);
    }

    async delete(id: string, userId: string) {
        const land = await this.findById(id);

        if (land.owner_id !== userId) {
            throw new AppError(403, 'You do not own this land');
        }

        await this.landRepo.delete(id);
        return { message: 'Land deleted successfully' };
    }

    async verifyOwnership(landId: string, userId: string) {
        const land = await this.findById(landId);
        if (land.owner_id !== userId) {
            throw new AppError(403, 'You do not own this land');
        }
        return land;
    }

    async isPositionOccupied(landId: string, x: number, y: number): Promise<boolean> {
        const land = await this.findByIdWithItems(landId);
        return land.placed_items.some(item => item.position_x === x && item.position_y === y && item.is_active);
    }

    async isPositionValid(landId: string, x: number, y: number): Promise<boolean> {
        const land = await this.findById(landId);
        return x >= 0 && x < land.grid_width && y >= 0 && y < land.grid_height;
    }
}

export const landService = new LandService();
