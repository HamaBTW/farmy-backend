import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './BaseEntity.js';
import { TreeType } from './TreeType.js';
import { jsonTransformer } from '../utils/transformers.js';

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

    @Column({ type: 'text', nullable: true, transformer: jsonTransformer })
    attributes?: {
        growth_years?: number;      // Years to mature
        harvest_season?: string;    // spring, summer, fall, winter
        max_height?: number;        // Maximum height in meters
        water_needs?: number;       // Water requirement level (1-10)
        size_width?: number;        // Grid width (e.g. 1 for a standard tree)
        size_height?: number;       // Grid height (e.g. 1 for a standard tree)
        lifespan_years?: number;    // Tree lifespan
    };

    @Column({ type: 'varchar', nullable: true })
    image_url?: string;

    @Column({ type: 'text', nullable: true, transformer: jsonTransformer })
    sprites?: {
        idle?: string;
        unharvested?: string; // Corrected spelling from unhavesed
        harvested?: string;   // Corrected spelling from harvesed
        cut?: string;
        stump?: string;
        growing?: string;
        pending?: string;
    };

    @Column({ type: 'boolean', default: true })
    is_available!: boolean;
}
