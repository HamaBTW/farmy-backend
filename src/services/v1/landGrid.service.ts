import { AppDataSource } from '../../config/db.config.js';
import { Land } from '../../models/Land.js';
import { AssetCategory } from '../../models/AssetCategory.js';
import { AppError } from '../../middlewares/error.middleware.js';
import { assetVariantService } from './assetVariant.service.js';
import { calculateFootprint, getVariantSize } from '../../utils/grid.utils.js';
import {
    buildFullPlayableMask,
    buildPlayableMask,
    computeGeometryHash,
    isPlayableCell,
    normalizeBoundaryRing,
    validateBoundaryRing,
} from '../../utils/landGeometry.utils.js';
import type { LngLatTuple } from '../../utils/landGeometry.utils.js';

class LandGridService {
    private landRepo = AppDataSource.getRepository(Land);

    private resolveLandGeometry(land: Land): {
        playableMask: boolean[][];
        geometryHash: string | null;
        boundaryRing: LngLatTuple[] | null;
    } {
        const boundaryRing = normalizeBoundaryRing(land.boundaries);
        if (!boundaryRing) {
            return {
                playableMask: buildFullPlayableMask(land.grid_width, land.grid_height),
                geometryHash: null,
                boundaryRing: null,
            };
        }

        const validation = validateBoundaryRing(boundaryRing);
        if (!validation.valid) {
            return {
                playableMask: buildFullPlayableMask(land.grid_width, land.grid_height),
                geometryHash: null,
                boundaryRing: null,
            };
        }

        return {
            playableMask: buildPlayableMask(boundaryRing, land.grid_width, land.grid_height),
            geometryHash: computeGeometryHash(boundaryRing, land.grid_width, land.grid_height),
            boundaryRing,
        };
    }

    /**
     * Returns a 2D matrix representing the land grid populated with placed item IDs.
     */
    async getLandGrid(landId: string) {
        const land = await this.landRepo.findOne({
            where: { id: landId },
            relations: ['placed_items']
        });

        if (!land) {
            throw new AppError(404, 'Land not found');
        }

        const matrix: (any | null)[][] = land.getGridMatrix();
        const { playableMask, geometryHash, boundaryRing } = this.resolveLandGeometry(land);
        const variantCache = new Map<string, any>();

        for (const item of land.placed_items) {
            try {
                // Fetch variant to get its size (cache by category + variant for this request)
                const cacheKey = `${item.asset_category}:${item.variant_id}`;
                let variant = variantCache.get(cacheKey);
                if (!variant) {
                    variant = await assetVariantService.findById(item.asset_category, item.variant_id);
                    variantCache.set(cacheKey, variant);
                }

                const { width, height } = getVariantSize(variant);

                const footprint = calculateFootprint(
                    width,
                    height,
                    item.position_x,
                    item.position_y,
                    item.rotation
                );

                for (const cell of footprint) {
                    // Check if cell is within bounds
                    if (cell.x >= 0 && cell.x < land.grid_width && cell.y >= 0 && cell.y < land.grid_height) {
                        if (!isPlayableCell(playableMask, cell.x, cell.y)) {
                            continue;
                        }

                        matrix[cell.y][cell.x] = {
                            id: item.id,
                            land_id: land.id,
                            category: item.asset_category,
                            variant_id: item.variant_id,
                            variant_code: (variant as any).variant_code,
                            state: item.state,
                            sprites: (variant as any).sprites,
                            is_active: item.is_active,
                            origin_x: item.position_x,
                            origin_y: item.position_y,
                            is_origin: cell.x === item.position_x && cell.y === item.position_y,
                            footprint_width: width,
                            footprint_height: height
                        };
                    }
                }
            } catch (error) {
                console.error(`Error processing placed item ${item.id}:`, error);
                // Skip items with missing variants/errors
            }
        }

        return {
            land_id: land.id,
            grid_width: land.grid_width,
            grid_height: land.grid_height,
            matrix,
            playable_mask: playableMask,
            geometry_hash: geometryHash,
            has_polygon_boundaries: boundaryRing !== null,
        };
    }

    /**
     * Gets the footprint for a specific variant.
     */
    async getVariantFootprint(category: AssetCategory, variantId: string, rotation: number = 0) {
        const variant = await assetVariantService.findById(category, variantId);
        const { width, height } = getVariantSize(variant);

        const squares = calculateFootprint(width, height, 0, 0, rotation);

        return {
            variant_id: variantId,
            category,
            base_size: { width, height },
            rotation,
            squares
        };
    }
}

export const landGridService = new LandGridService();
