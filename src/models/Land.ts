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
                return value;
            },
            to: (value: any) => {
                if (!value) return null;
                // Convert [[lng, lat], ...] to WKT POLYGON((lng lat, ...))
                const points = Array.isArray(value) ? value : [];
                if (points.length < 3) return null;

                // Ensure the polygon is closed (first point == last point)
                const firstPoint = points[0];
                const lastPoint = points[points.length - 1];
                if (firstPoint[0] !== lastPoint[0] || firstPoint[1] !== lastPoint[1]) {
                    points.push(firstPoint);
                }

                const wktPoints = points.map((p: any) => `${p[0]} ${p[1]}`).join(', ');
                return `POLYGON((${wktPoints}))`;
            }
        }
    })
    boundaries!: any | null;

    @Column({ type: 'boolean', default: true })
    is_active!: boolean;

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
