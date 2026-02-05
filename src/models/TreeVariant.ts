import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './BaseEntity.js';
import { TreeType } from './TreeType.js';

@Entity('tree_variants')
export class TreeVariant extends BaseEntity {
    @Column({ type: 'uuid' })
    type_id!: string;

    @ManyToOne(() => TreeType, (type) => type.variants)
    @JoinColumn({ name: 'type_id' })
    type!: TreeType;

    @Column({ type: 'varchar', length: 50, unique: true })
    variant_code!: string;

    @Column({ type: 'decimal', precision: 10, scale: 2 })
    base_price!: number;

    @Column({ type: 'json', nullable: true })
    attributes?: {
        growth_years?: number;      // Years to mature
        harvest_season?: string;    // spring, summer, fall, winter
        max_height?: number;        // Maximum height in meters
        water_needs?: number;       // Water requirement level (1-10)
        lifespan_years?: number;    // Tree lifespan
    };

    @Column({ type: 'varchar', nullable: true })
    image_url?: string;

    @Column({ type: 'boolean', default: true })
    is_available!: boolean;
}
