# Land Grid & Asset Placement Logic

This document explains the technical implementation of the land grid system and asset placement logic used in the Farmy Backend.

## 1. Grid Fundamentals

The land is representated as a 2D grid of "box" squares.
- **Dimensions**: Defined by `grid_width` and `grid_height` in the `Land` model.
- **Coordinates**: Uses a 0-indexed system `(x, y)`, where `(0,0)` is the top-left corner.
- **Matrix representation**: A 2D array `matrix[y][x]` is used to represent the land state.

## 2. Asset Footprints

Every asset variant (Animal, Machine, Structure, Tree, Vegetation) has a defined size within its `attributes` JSON field.

### Attributes
- `size_width`: Number of grid squares the asset occupies horizontally at 0° rotation.
- `size_height`: Number of grid squares the asset occupies vertically at 0° rotation.

### Rotation Logic
Assets can be rotated in increments of 90 degrees (0°, 90°, 180°, 270°).
- **0° and 180°**: Dimensions remain `(size_width, size_height)`.
- **90° and 270°**: Dimensions are swapped to `(size_height, size_width)`.

**Example: A 3x2 Tool Shed**
- @ 0°: 3 columns wide, 2 rows high.
- @ 90°: 2 columns wide, 3 rows high.

## 3. Implementation Details

### `grid.utils.ts`
Contains the core logic for calculating which exact squares are occupied by an asset:
- `calculateFootprint()`: Takes `width`, `height`, `startX`, `startY`, and `rotation` to return an array of `{x, y}` coordinates.

### `LandGridService`
- `getLandGrid(landId)`: Retrieves all active items on a land, calculates their footprints, and populates a 2D matrix with item metadata.
- `getVariantFootprint(...)`: A helper to preview how many squares an asset will take before placement.

## 4. How to add a new Asset
When adding a new asset type or variant:
1. Ensure the `attributes` JSON in the database contains `size_width` and `size_height`.
2. Default values are `1x1` if not specified.

## 5. API Endpoints
- `GET /api/v1/land-grid/:id/grid`: Returns the full matrix of the land.
- `GET /api/v1/land-grid/assets/:category/variants/:id/footprint`: Returns the footprint of a variant.

---
*Note: This system allows for building complex "box matrix" farm games where space management is a core mechanic.*
