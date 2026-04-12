import { createHash } from 'crypto';

export type LngLatTuple = [number, number];

const EPSILON = 1e-9;
const EARTH_RADIUS_METERS = 6371000;

const toNumber = (value: unknown): number | null => {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim().length > 0) {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
};

const tupleEquals = (a: LngLatTuple, b: LngLatTuple): boolean => {
    return Math.abs(a[0] - b[0]) < EPSILON && Math.abs(a[1] - b[1]) < EPSILON;
};

const isValidLngLat = (point: LngLatTuple): boolean => {
    const [lng, lat] = point;
    return Number.isFinite(lng) && Number.isFinite(lat) && lng >= -180 && lng <= 180 && lat >= -90 && lat <= 90;
};

const parseBoundaryPoint = (point: unknown): LngLatTuple | null => {
    if (Array.isArray(point) && point.length >= 2) {
        const lng = toNumber(point[0]);
        const lat = toNumber(point[1]);
        if (lng === null || lat === null) return null;
        return [lng, lat];
    }

    if (point && typeof point === 'object') {
        const asObject = point as Record<string, unknown>;
        const lng = toNumber(asObject.longitude ?? asObject.lng ?? asObject.x);
        const lat = toNumber(asObject.latitude ?? asObject.lat ?? asObject.y);
        if (lng === null || lat === null) return null;
        return [lng, lat];
    }

    return null;
};

const dedupeSequential = (ring: LngLatTuple[]): LngLatTuple[] => {
    const deduped: LngLatTuple[] = [];
    for (const point of ring) {
        const last = deduped[deduped.length - 1];
        if (!last || !tupleEquals(last, point)) {
            deduped.push(point);
        }
    }
    return deduped;
};

const toRadians = (degrees: number): number => (degrees * Math.PI) / 180;

const haversineDistanceMeters = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const dLat = toRadians(lat2 - lat1);
    const dLng = toRadians(lng2 - lng1);
    const rLat1 = toRadians(lat1);
    const rLat2 = toRadians(lat2);

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.sin(dLng / 2) * Math.sin(dLng / 2) * Math.cos(rLat1) * Math.cos(rLat2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return EARTH_RADIUS_METERS * c;
};

const orientation = (a: LngLatTuple, b: LngLatTuple, c: LngLatTuple): number => {
    return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
};

const onSegment = (a: LngLatTuple, b: LngLatTuple, p: LngLatTuple): boolean => {
    return (
        p[0] <= Math.max(a[0], b[0]) + EPSILON &&
        p[0] + EPSILON >= Math.min(a[0], b[0]) &&
        p[1] <= Math.max(a[1], b[1]) + EPSILON &&
        p[1] + EPSILON >= Math.min(a[1], b[1])
    );
};

const segmentsIntersect = (a1: LngLatTuple, a2: LngLatTuple, b1: LngLatTuple, b2: LngLatTuple): boolean => {
    const o1 = orientation(a1, a2, b1);
    const o2 = orientation(a1, a2, b2);
    const o3 = orientation(b1, b2, a1);
    const o4 = orientation(b1, b2, a2);

    if (((o1 > EPSILON && o2 < -EPSILON) || (o1 < -EPSILON && o2 > EPSILON)) &&
        ((o3 > EPSILON && o4 < -EPSILON) || (o3 < -EPSILON && o4 > EPSILON))) {
        return true;
    }

    if (Math.abs(o1) <= EPSILON && onSegment(a1, a2, b1)) return true;
    if (Math.abs(o2) <= EPSILON && onSegment(a1, a2, b2)) return true;
    if (Math.abs(o3) <= EPSILON && onSegment(b1, b2, a1)) return true;
    if (Math.abs(o4) <= EPSILON && onSegment(b1, b2, a2)) return true;
    return false;
};

const hasSelfIntersections = (ring: LngLatTuple[]): boolean => {
    const edgeCount = ring.length - 1;
    for (let i = 0; i < edgeCount; i++) {
        const a1 = ring[i];
        const a2 = ring[i + 1];

        for (let j = i + 1; j < edgeCount; j++) {
            const isAdjacent = Math.abs(i - j) <= 1 || (i === 0 && j === edgeCount - 1);
            if (isAdjacent) continue;

            const b1 = ring[j];
            const b2 = ring[j + 1];
            if (segmentsIntersect(a1, a2, b1, b2)) {
                return true;
            }
        }
    }
    return false;
};

export const normalizeBoundaryRing = (raw: unknown): LngLatTuple[] | null => {
    if (!Array.isArray(raw)) return null;

    const parsed: LngLatTuple[] = [];
    for (const point of raw) {
        const parsedPoint = parseBoundaryPoint(point);
        if (parsedPoint) parsed.push(parsedPoint);
    }

    const deduped = dedupeSequential(parsed);
    if (deduped.length < 3) return null;

    const first = deduped[0];
    const last = deduped[deduped.length - 1];
    if (!tupleEquals(first, last)) {
        deduped.push(first);
    }

    return deduped;
};

export const validateBoundaryRing = (ring: LngLatTuple[]): { valid: true } | { valid: false; message: string } => {
    if (ring.length < 4) {
        return { valid: false, message: 'Boundary polygon must have at least 3 points.' };
    }

    for (const point of ring) {
        if (!isValidLngLat(point)) {
            return { valid: false, message: 'Boundary contains invalid coordinate values.' };
        }
    }

    const uniquePoints = new Set(ring.slice(0, -1).map(([lng, lat]) => `${lng.toFixed(7)},${lat.toFixed(7)}`));
    if (uniquePoints.size < 3) {
        return { valid: false, message: 'Boundary polygon must contain at least 3 unique points.' };
    }

    if (!tupleEquals(ring[0], ring[ring.length - 1])) {
        return { valid: false, message: 'Boundary polygon ring must be closed.' };
    }

    if (hasSelfIntersections(ring)) {
        return { valid: false, message: 'Boundary polygon has self-intersections.' };
    }

    return { valid: true };
};

export const computeBoundaryBoundsMeters = (ring: LngLatTuple[]) => {
    const lngs = ring.map(([lng]) => lng);
    const lats = ring.map(([, lat]) => lat);

    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);

    const midLat = (minLat + maxLat) / 2;
    const midLng = (minLng + maxLng) / 2;

    const widthMeters = haversineDistanceMeters(midLat, minLng, midLat, maxLng);
    const heightMeters = haversineDistanceMeters(minLat, midLng, maxLat, midLng);

    return {
        minLng,
        maxLng,
        minLat,
        maxLat,
        widthMeters,
        heightMeters,
    };
};

export const buildFullPlayableMask = (gridWidth: number, gridHeight: number): boolean[][] => {
    return Array.from({ length: gridHeight }, () => Array.from({ length: gridWidth }, () => true));
};

const pointInPolygon = (x: number, y: number, polygon: Array<{ x: number; y: number }>): boolean => {
    let inside = false;
    let j = polygon.length - 1;

    for (let i = 0; i < polygon.length; i++) {
        const xi = polygon[i].x;
        const yi = polygon[i].y;
        const xj = polygon[j].x;
        const yj = polygon[j].y;

        const intersect =
            yi > y !== yj > y &&
            x < ((xj - xi) * (y - yi)) / ((yj - yi) || EPSILON) + xi;
        if (intersect) inside = !inside;
        j = i;
    }

    return inside;
};

const isPointInRect = (
    point: { x: number; y: number },
    minX: number,
    minY: number,
    maxX: number,
    maxY: number,
): boolean => {
    return point.x >= minX - EPSILON && point.x <= maxX + EPSILON && point.y >= minY - EPSILON && point.y <= maxY + EPSILON;
};

const doesPolygonIntersectCell = (
    polygon: Array<{ x: number; y: number }>,
    minX: number,
    minY: number,
    maxX: number,
    maxY: number,
): boolean => {
    // 1) Polygon vertex inside cell
    for (const point of polygon) {
        if (isPointInRect(point, minX, minY, maxX, maxY)) {
            return true;
        }
    }

    // 2) Cell corner inside polygon
    const rectCorners = [
        { x: minX, y: minY },
        { x: maxX, y: minY },
        { x: maxX, y: maxY },
        { x: minX, y: maxY },
    ];
    for (const corner of rectCorners) {
        if (pointInPolygon(corner.x, corner.y, polygon)) {
            return true;
        }
    }

    // 3) Edge intersection between polygon edges and cell edges
    const rectEdges: Array<[LngLatTuple, LngLatTuple]> = [
        [[minX, minY], [maxX, minY]],
        [[maxX, minY], [maxX, maxY]],
        [[maxX, maxY], [minX, maxY]],
        [[minX, maxY], [minX, minY]],
    ];

    for (let i = 0; i < polygon.length; i++) {
        const next = (i + 1) % polygon.length;
        const p1: LngLatTuple = [polygon[i].x, polygon[i].y];
        const p2: LngLatTuple = [polygon[next].x, polygon[next].y];

        for (const [r1, r2] of rectEdges) {
            if (segmentsIntersect(p1, p2, r1, r2)) {
                return true;
            }
        }
    }

    return false;
};

export const buildPlayableMask = (
    ring: LngLatTuple[],
    gridWidth: number,
    gridHeight: number,
): boolean[][] => {
    if (gridWidth <= 0 || gridHeight <= 0) return [];

    const validation = validateBoundaryRing(ring);
    if (!validation.valid) {
        return buildFullPlayableMask(gridWidth, gridHeight);
    }

    const bounds = computeBoundaryBoundsMeters(ring);
    const lngSpan = bounds.maxLng - bounds.minLng;
    const latSpan = bounds.maxLat - bounds.minLat;

    if (Math.abs(lngSpan) < EPSILON || Math.abs(latSpan) < EPSILON) {
        return buildFullPlayableMask(gridWidth, gridHeight);
    }

    const normalizedPolygon = ring.slice(0, -1).map(([lng, lat]) => ({
        x: (lng - bounds.minLng) / lngSpan,
        y: (lat - bounds.minLat) / latSpan,
    }));

    const mask = Array.from({ length: gridHeight }, () => Array.from({ length: gridWidth }, () => false));

    for (let y = 0; y < gridHeight; y++) {
        for (let x = 0; x < gridWidth; x++) {
            const minX = x / gridWidth;
            const maxX = (x + 1) / gridWidth;
            const minY = y / gridHeight;
            const maxY = (y + 1) / gridHeight;

            mask[y][x] = doesPolygonIntersectCell(normalizedPolygon, minX, minY, maxX, maxY);
        }
    }

    // Guarantee at least one playable tile for valid polygons.
    const hasPlayableCells = mask.some((row) => row.some(Boolean));
    if (!hasPlayableCells) {
        const cx = normalizedPolygon.reduce((sum, p) => sum + p.x, 0) / normalizedPolygon.length;
        const cy = normalizedPolygon.reduce((sum, p) => sum + p.y, 0) / normalizedPolygon.length;
        const fallbackX = Math.max(0, Math.min(gridWidth - 1, Math.floor(cx * gridWidth)));
        const fallbackY = Math.max(0, Math.min(gridHeight - 1, Math.floor(cy * gridHeight)));
        mask[fallbackY][fallbackX] = true;
    }

    return mask;
};

export const isPlayableCell = (mask: boolean[][] | null | undefined, x: number, y: number): boolean => {
    if (!mask) return true;
    if (y < 0 || y >= mask.length) return false;
    const row = mask[y];
    if (!Array.isArray(row) || x < 0 || x >= row.length) return false;
    return row[x] === true;
};

export const computeGeometryHash = (ring: LngLatTuple[], gridWidth: number, gridHeight: number): string => {
    const compactRing = ring.map(([lng, lat]) => [Number(lng.toFixed(7)), Number(lat.toFixed(7))]);
    const payload = JSON.stringify({ gridWidth, gridHeight, ring: compactRing });
    return createHash('sha1').update(payload).digest('hex');
};