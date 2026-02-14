import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './BaseEntity.js';
import { jsonTransformer } from '../utils/transformers.js';
import { MachineType } from './MachineType.js';

@Entity('machine_variants')
export class MachineVariant extends BaseEntity {
    @Column({ type: 'uuid' })
    type_id!: string;

    @ManyToOne(() => MachineType, (type) => type.variants)
    @JoinColumn({ name: 'type_id' })
    type!: MachineType;

    @Column({ type: 'varchar', length: 50, unique: true })
    variant_code!: string;

    @Column({ type: 'decimal', precision: 10, scale: 2 })
    base_price!: number;

    @Column({ type: 'text', nullable: true, transformer: jsonTransformer })
    attributes?: {
        speed?: number;             // Operation speed multiplier
        efficiency?: number;        // Output efficiency percentage
        fuel_type?: string;         // diesel, electric, manual, etc.
        fuel_consumption?: number;  // Fuel units per hour
        size_width?: number;        // Grid width (e.g. 2 for a 2x2 structure)
        size_height?: number;       // Grid height (e.g. 2 for a 2x2 structure)
        durability?: number;        // Durability points
    };

    @Column({ type: 'varchar', nullable: true })
    image_url?: string;

    @Column({ type: 'text', nullable: true, transformer: jsonTransformer })
    sprites?: {
        idle?: string;
        processing?: string;
        finished?: string;
        broken?: string;
    };

    @Column({ type: 'boolean', default: true })
    is_available!: boolean;
}
