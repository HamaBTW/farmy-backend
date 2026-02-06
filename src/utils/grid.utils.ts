import { AssetCategory } from '../models/AssetCategory.js';
import { AnimalVariant } from '../models/AnimalVariant.js';
import { MachineVariant } from '../models/MachineVariant.js';
import { StructureVariant } from '../models/StructureVariant.js';
import { TreeVariant } from '../models/TreeVariant.js';
import { VegetationVariant } from '../models/VegetationVariant.js';

export interface GridCell {
    x: number;
    y: number;
}

export type VariantType = AnimalVariant | MachineVariant | StructureVariant | TreeVariant | VegetationVariant;

/**
 * Calculates the grid footprint of an asset variant.
 * 
 * @param width Base width of the variant.
 * @param height Base height of the variant.
 * @param startX X coordinate of the top-left corner.
 * @param startY Y coordinate of the top-left corner.
 * @param rotation Rotation in degrees (0, 90, 180, 270).
 * @returns Array of occupied cell coordinates.
 */
export const calculateFootprint = (
    width: number,
    height: number,
    startX: number,
    startY: number,
    rotation: number = 0
): GridCell[] => {
    const footprint: GridCell[] = [];

    // Normalize rotation to 0, 90, 180, 270
    const normalizedRotation = ((rotation % 360) + 360) % 360;

    let actualWidth = width;
    let actualHeight = height;

    if (normalizedRotation === 90 || normalizedRotation === 270) {
        actualWidth = height;
        actualHeight = width;
    }

    for (let x = 0; x < actualWidth; x++) {
        for (let y = 0; y < actualHeight; y++) {
            footprint.push({
                x: startX + x,
                y: startY + y
            });
        }
    }

    return footprint;
};

/**
 * Gets the size from a variant entity.
 */
export const getVariantSize = (variant: VariantType): { width: number; height: number } => {
    const attrs = (variant as any).attributes || {};
    return {
        width: Number(attrs.size_width || 1),
        height: Number(attrs.size_height || 1)
    };
};
