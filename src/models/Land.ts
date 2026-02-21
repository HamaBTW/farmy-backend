import { Entity, Column, ManyToOne, JoinColumn, OneToMany, Relation } from 'typeorm';
import { BaseEntity } from './BaseEntity.js';
import { User } from './User.js';
import { PlacedItem } from './PlacedItem.js';
import type { LandRental } from './LandRental.js';
import { metersToGridCells } from '../utils/grid.utils.js';

@Entity('lands')
export class Land extends BaseEntity {
    @Column({ type: 'uuid' })
    owner_id!: string;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'owner_id' })
    owner!: Relation<User>;

    @Column({ type: 'varchar' })
    name!: string;

    @Column({ type: 'text', nullable: true })
    description!: string | null;

    @Column({ type: 'float', default: 10.0 })
    width_m!: number;

    @Column({ type: 'float', default: 10.0 })
    height_m!: number;

    /**
     * Number of grid columns based on width in meters.
     */
    get grid_width(): number {
        return metersToGridCells(this.width_m);
    }

    /**
     * Number of grid rows based on height in meters.
     */
    get grid_height(): number {
        return metersToGridCells(this.height_m);
    }

    @Column({
        type: 'polygon',
        nullable: true,
        transformer: {
            from: (value: any) => {
                if (!value) return null;
                console.log(`[Land Model] Transformer FROM triggered for value type: ${typeof value}`);

                // 1. If it's already an array (e.g. from create/save), return it
                if (Array.isArray(value)) {
                    console.log(`[Land Model] FROM: Returning existing array (length: ${value.length})`);
                    return value;
                }

                // 2. Handle structured object format { points: [...] }
                if (typeof value === 'object' && value.points && Array.isArray(value.points)) {
                    const coords = value.points.map((p: any) => [p.x, p.y]);
                    console.log(`[Land Model] FROM: Parsed object format (points: ${coords.length})`);
                    return coords;
                }

                // 3. Handle WKT String format
                if (typeof value === 'string') {
                    console.log(`[Land Model] FROM: Parsing String (length: ${value.length})`);
                    if (value.startsWith('POLYGON')) {
                        try {
                            const match = value.match(/\(\((.*)\)\)/);
                            if (match && match[1]) {
                                const coords = match[1].split(',').map(pair => {
                                    const [lng, lat] = pair.trim().split(' ').map(Number);
                                    return [lng, lat];
                                });
                                console.log(`[Land Model] FROM: Successfully parsed ${coords.length} points from WKT string`);
                                return coords;
                            }
                        } catch (e) {
                            console.error('[Land Model] FROM: Failed to parse WKT string:', e);
                        }
                    }
                }

                // 4. Handle MySQL WKB (Well-Known Binary) Buffer with scanning discovery
                if (Buffer.isBuffer(value)) {
                    try {
                        const hex = value.toString('hex');
                        console.log(`[Land Model] FROM: Parsing Buffer (hex: ${hex.substring(0, 40)}...)`);

                        // Discover WKB start by scanning for Polygon header (0103000000 or 0000000003)
                        let offset = -1;
                        let isLittleEndian = true;

                        for (let i = 0; i <= value.length - 5; i++) {
                            // Little Endian Polygon: 01 03 00 00 00
                            if (value[i] === 0x01 && value[i + 1] === 0x03 && value[i + 2] === 0x00 && value[i + 3] === 0x00 && value[i + 4] === 0x00) {
                                offset = i;
                                isLittleEndian = true;
                                break;
                            }
                            // Big Endian Polygon: 00 00 00 00 03
                            if (value[i] === 0x00 && value[i + 1] === 0x00 && value[i + 2] === 0x00 && value[i + 3] === 0x00 && value[i + 4] === 0x03) {
                                offset = i;
                                isLittleEndian = false;
                                break;
                            }
                        }

                        if (offset !== -1) {
                            console.log(`[Land Model] FROM: Found WKB Polygon header at offset ${offset} (LE: ${isLittleEndian})`);
                            const wkb = value.subarray(offset);
                            // Header is 5 bytes (order + type)
                            const numRings = isLittleEndian ? wkb.readInt32LE(5) : wkb.readInt32BE(5);

                            if (numRings > 0) {
                                const numPoints = isLittleEndian ? wkb.readInt32LE(9) : wkb.readInt32BE(9);
                                const coords: [number, number][] = [];
                                for (let i = 0; i < numPoints; i++) {
                                    const pOffset = 13 + (i * 16);
                                    if (pOffset + 16 > wkb.length) break;
                                    const x = isLittleEndian ? wkb.readDoubleLE(pOffset) : wkb.readDoubleBE(pOffset);
                                    const y = isLittleEndian ? wkb.readDoubleLE(pOffset + 8) : wkb.readDoubleBE(pOffset + 8);
                                    coords.push([x, y]);
                                }
                                console.log(`[Land Model] FROM: Successfully discovered and parsed ${coords.length} points`);
                                return coords;
                            }
                        } else {
                            console.warn('[Land Model] FROM: No valid WKB Polygon header found in Buffer');
                        }
                    } catch (e) {
                        console.error('[Land Model] FROM: Failed to parse boundaries WKB Buffer:', e);
                    }
                }

                console.warn(`[Land Model] FROM: Returning fallback value of type ${typeof value}`);
                return value;
            },
            to: (value: any) => {
                if (!value) return null;
                console.log(`[Land Model] Transformer TO triggered for value type: ${typeof value}`);

                // Convert [[lng, lat], ...] to WKT POLYGON((lng lat, ...))
                let points = Array.isArray(value) ? value : [];
                if (points.length < 3) {
                    console.warn(`[Land Model] TO: Invalid point count (${points.length})`);
                    return null;
                }

                // Ensure it's a closed ring for MySQL POLYGON
                const first = points[0];
                const last = points[points.length - 1];
                if (first[0] !== last[0] || first[1] !== last[1]) {
                    points = [...points, first];
                    console.log('[Land Model] TO: Automatically closing polygon ring');
                }

                const wktPoints = points.map((p: any) => `${p[0]} ${p[1]}`).join(', ');
                const wkt = `POLYGON((${wktPoints}))`;
                console.log(`[Land Model] TO: Generated WKT (length: ${wkt.length})`);
                return wkt;
            }
        }
    })
    boundaries!: any | null;

    @Column({ type: 'boolean', default: true })
    is_active!: boolean;

    @Column({ type: 'varchar', length: 255, nullable: true })
    hedera_transaction_id!: string | null;

    @OneToMany(() => PlacedItem, (item) => item.land)
    placed_items!: Relation<PlacedItem>[];

    @OneToMany('LandRental', (rental: LandRental) => rental.land)
    rentals!: Relation<LandRental>[];

    /**
     * Total number of grid cells available on this land.
     */
    get total_capacity(): number {
        return this.grid_width * this.grid_height;
    }

    /**
     * Returns an empty 2D matrix representing the land grid.
     */
    getGridMatrix(): (string | null)[][] {
        return Array.from({ length: this.grid_height }, () =>
            Array.from({ length: this.grid_width }, () => null)
        );
    }
}
