import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './BaseEntity.js';
import { StructureType } from './StructureType.js';
import { jsonTransformer } from '../utils/transformers.js';

@Entity('structure_variants')
export class StructureVariant extends BaseEntity {
    @Column({ type: 'uuid' })
    type_id!: string;

    @ManyToOne(() => StructureType, (type) => type.variants)
    @JoinColumn({ name: 'type_id' })
    type!: StructureType;

    @Column({ type: 'varchar', length: 50, unique: true })
    variant_code!: string;

    @Column({ type: 'decimal', precision: 10, scale: 2 })
    base_price!: number;

    @Column({ type: 'text', nullable: true, transformer: jsonTransformer })
    attributes?: {
        capacity?: number;          // Storage/housing capacity
        durability?: number;        // Health/durability points
        size_width?: number;        // Grid width (e.g. 3 for a horizontal 3x1 line)
        size_height?: number;       // Grid height (e.g. 1 for a horizontal 3x1 line)
        upgrade_level?: number;     // Current upgrade level
        max_upgrade?: number;       // Maximum upgrade possible
    };

    @Column({ type: 'varchar', nullable: true })
    image_url?: string;

    @Column({ type: 'text', nullable: true, transformer: jsonTransformer })
    sprites?: {
        idle?: string;
        construction?: string;
        completed?: string;
    };

    @Column({ type: 'boolean', default: true })
    is_available!: boolean;
}
