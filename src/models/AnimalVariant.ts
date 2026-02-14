import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './BaseEntity.js';
import { jsonTransformer } from '../utils/transformers.js';
import { AnimalType } from './AnimalType.js';

@Entity('animal_variants')
export class AnimalVariant extends BaseEntity {
    @Column({ type: 'uuid' })
    type_id!: string;

    @ManyToOne(() => AnimalType, (type) => type.variants)
    @JoinColumn({ name: 'type_id' })
    type!: AnimalType;

    @Column({ type: 'varchar', length: 50, unique: true })
    variant_code!: string;

    @Column({ type: 'decimal', precision: 10, scale: 2 })
    base_price!: number;

    @Column({ type: 'text', nullable: true, transformer: jsonTransformer })
    attributes?: {
        lifespan_days?: number;     // Animal lifespan in days
        feed_consumption?: number;  // Daily feed units required
        mature_age_days?: number;   // Days until mature/producing
        size_width?: number;        // Grid width (e.g. 2 for a 2x2 box)
        size_height?: number;       // Grid height (e.g. 2 for a 2x2 box)
        habitat?: string;           // barn, coop, pasture, etc.
    };

    @Column({ type: 'varchar', nullable: true })
    image_url?: string;

    @Column({ type: 'text', nullable: true, transformer: jsonTransformer })
    sprites?: {
        idle?: string;
        walking?: string;
        eating?: string;
        sleeping?: string;
        ready?: string; // e.g. ready to collect product
        sick?: string;
    };

    @Column({ type: 'boolean', default: true })
    is_available!: boolean;
}
