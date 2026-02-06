import { Entity, Column, ManyToOne, JoinColumn, OneToMany, Relation } from 'typeorm';
import { BaseEntity } from './BaseEntity.js';
import { User } from './User.js';
import { PlacedItem } from './PlacedItem.js';
import type { LandRental } from './LandRental.js';

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

    @Column({ type: 'int', default: 10 })
    grid_width!: number;

    @Column({ type: 'int', default: 10 })
    grid_height!: number;

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
                return value;
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
