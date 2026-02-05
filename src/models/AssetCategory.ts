/**
 * Enum for the four main asset categories in the farm game
 */
export enum AssetCategory {
    ANIMAL = 'animal',
    VEGETATION = 'vegetation',
    TREE = 'tree',
    STRUCTURE = 'structure',
    MACHINE = 'machine'
}

/**
 * Status of an item request in the approval workflow
 */
export enum ItemRequestStatus {
    PENDING = 'pending',
    APPROVED = 'approved',
    REJECTED = 'rejected'
}
