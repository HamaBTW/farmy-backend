import { AppDataSource } from '../../config/db.config.js';
import { Land } from '../../models/Land.js';
import { AppError } from '../../middlewares/error.middleware.js';
import { hederaService } from './HederaService.js';
import { subscriptionService } from './subscription.service.js';
import { metersToGridCells } from '../../utils/grid.utils.js';
import {
    buildPlayableMask,
    computeBoundaryBoundsMeters,
    computeGeometryHash,
    isPlayableCell,
    normalizeBoundaryRing,
    validateBoundaryRing,
} from '../../utils/landGeometry.utils.js';
import type { LngLatTuple } from '../../utils/landGeometry.utils.js';

interface CreateLandData {
    owner_id: string;
    name: string;
    description?: string;
    width_m?: number;
    height_m?: number;
    price?: number;
    grid_width?: number; // Legacy
    grid_height?: number; // Legacy
    boundaries?: any;
}

const DEFAULT_LAND_DIMENSION_METERS = 10.0;
const MAX_GRID_DIMENSION = 256;

class LandService {
    private landRepo = AppDataSource.getRepository(Land);
    private playableMaskCache = new Map<string, { geometryHash: string; mask: boolean[][] }>();

    private normalizeAndValidateBoundaries(boundaries: unknown): LngLatTuple[] {
        const normalized = normalizeBoundaryRing(boundaries);
        if (!normalized) {
            throw new AppError(400, 'Boundaries must contain at least 3 valid points.');
        }

        const validation = validateBoundaryRing(normalized);
        if (!validation.valid) {
            throw new AppError(400, validation.message);
        }

        return normalized;
    }

    private deriveGridDimensionsFromBoundary(boundaryRing: LngLatTuple[]): { width_m: number; height_m: number } {
        const bounds = computeBoundaryBoundsMeters(boundaryRing);
        const widthCells = Math.max(1, Math.min(MAX_GRID_DIMENSION, metersToGridCells(bounds.widthMeters)));
        const heightCells = Math.max(1, Math.min(MAX_GRID_DIMENSION, metersToGridCells(bounds.heightMeters)));

        return {
            width_m: widthCells,
            height_m: heightCells,
        };
    }

    private getPlayableMaskForLand(land: Land): boolean[][] | null {
        const normalized = normalizeBoundaryRing(land.boundaries);
        if (!normalized) {
            return null;
        }

        const validation = validateBoundaryRing(normalized);
        if (!validation.valid) {
            return null;
        }

        const geometryHash = computeGeometryHash(normalized, land.grid_width, land.grid_height);
        const cached = this.playableMaskCache.get(land.id);
        if (cached && cached.geometryHash === geometryHash) {
            return cached.mask;
        }

        const mask = buildPlayableMask(normalized, land.grid_width, land.grid_height);
        this.playableMaskCache.set(land.id, { geometryHash, mask });
        return mask;
    }

    async create(data: CreateLandData) {
        // Map legacy grid fields to meters if meters are not provided
        let width = data.width_m ?? data.grid_width ?? DEFAULT_LAND_DIMENSION_METERS;
        let height = data.height_m ?? data.grid_height ?? DEFAULT_LAND_DIMENSION_METERS;
        let normalizedBoundaries: LngLatTuple[] | null = null;

        if (data.boundaries !== undefined && data.boundaries !== null) {
            normalizedBoundaries = this.normalizeAndValidateBoundaries(data.boundaries);
            const derivedDimensions = this.deriveGridDimensionsFromBoundary(normalizedBoundaries);
            width = derivedDimensions.width_m;
            height = derivedDimensions.height_m;
        }

        // Entitlement Check
        const currentCount = await this.landRepo.count({ where: { owner_id: data.owner_id } });
        const canCreate = await subscriptionService.checkLimit(data.owner_id, 'land_limit', currentCount);
        if (!canCreate) {
            throw new AppError(403, 'Land limit reached for your current subscription plan. Upgrade to Farmer Pro for unlimited land listings.');
        }

        const land = this.landRepo.create({
            owner_id: data.owner_id,
            name: data.name,
            description: data.description,
            width_m: width,
            height_m: height,
            price: data.price ?? 1200,
            boundaries: normalizedBoundaries
        });
        const savedLand = await this.landRepo.save(land);

        // Record land creation on Hedera (non-blocking)
        try {
            const hederaTxId = await hederaService.recordPurchase({
                type: 'land_creation',
                user_id: data.owner_id,
                item_id: savedLand.id,
                item_name: data.name,
                amount: 0,
                currency: 'usd',
                payment_method: 'free',
                timestamp: new Date().toISOString(),
                metadata: {
                    land_id: savedLand.id,
                    width_m: width,
                    height_m: height,
                },
            });

            if (hederaTxId) {
                savedLand.hedera_transaction_id = hederaTxId;
                await this.landRepo.save(savedLand);
            }
        } catch (hederaError) {
            console.error('[HederaService] Non-fatal error recording land creation on Hedera:', hederaError);
        }

        return savedLand;
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
            relations: ['owner', 'rentals'],
            order: { createdAt: 'DESC' }
        });
    }

    async findById(id: string) {
        const land = await this.landRepo.findOne({
            where: { id },
            relations: ['owner', 'rentals']
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
            relations: ['rentals'],
            order: { createdAt: 'DESC' }
        });
    }

    async update(id: string, userId: string, data: Partial<CreateLandData & { is_active: boolean }>) {
        const land = await this.findById(id);

        if (land.owner_id !== userId) {
            throw new AppError(403, 'You do not own this land');
        }

        // Handle legacy field mapping in update
        if (data.grid_width !== undefined && data.width_m === undefined) {
            data.width_m = data.grid_width;
        }
        if (data.grid_height !== undefined && data.height_m === undefined) {
            data.height_m = data.grid_height;
        }

        if (data.boundaries !== undefined) {
            if (data.boundaries === null) {
                data.boundaries = null;
            } else {
                const normalizedBoundaries = this.normalizeAndValidateBoundaries(data.boundaries);
                const derivedDimensions = this.deriveGridDimensionsFromBoundary(normalizedBoundaries);
                data.boundaries = normalizedBoundaries;
                data.width_m = derivedDimensions.width_m;
                data.height_m = derivedDimensions.height_m;
            }
        }

        // Clean up legacy fields to avoid problems with getters
        const { grid_width, grid_height, ...updateData } = data;

        Object.assign(land, updateData);
        const savedLand = await this.landRepo.save(land);
        this.playableMaskCache.delete(savedLand.id);
        return savedLand;
    }

    async delete(id: string, userId: string) {
        const land = await this.findById(id);

        if (land.owner_id !== userId) {
            throw new AppError(403, 'You do not own this land');
        }

        await this.landRepo.delete(id);
        this.playableMaskCache.delete(id);
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
        const isInRectangularBounds = x >= 0 && x < land.grid_width && y >= 0 && y < land.grid_height;
        if (!isInRectangularBounds) {
            return false;
        }

        const playableMask = this.getPlayableMaskForLand(land);
        if (!playableMask) {
            return true;
        }

        return isPlayableCell(playableMask, x, y);
    }
}

export const landService = new LandService();
