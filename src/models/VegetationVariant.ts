import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './BaseEntity.js';
import { VegetationType } from './VegetationType.js';

@Entity('vegetation_variants')
export class VegetationVariant extends BaseEntity {
    @Column({ type: 'uuid' })
    type_id!: string;

    @ManyToOne(() => VegetationType, (type) => type.variants)
    @JoinColumn({ name: 'type_id' })
    type!: VegetationType;

    @Column({ type: 'varchar', length: 50, unique: true })
    variant_code!: string;

    @Column({ type: 'decimal', precision: 10, scale: 2 })
    base_price!: number;

    @Column({ type: 'json', nullable: true })
    attributes?: {
        growth_days?: number;       // Days from seed to harvest
        water_needs?: number;       // Water requirement level (1-10)
        soil_type?: string;         // clay, loam, sandy, etc.
        planting_season?: string;   // spring, summer, fall, winter
        size_width?: number;        // Grid width
        size_height?: number;       // Grid height
        is_perennial?: boolean;     // Regrows after harvest
    };

    @Column({ type: 'varchar', nullable: true })
    image_url?: string;

    @Column({ type: 'boolean', default: true })
    is_available!: boolean;
}
