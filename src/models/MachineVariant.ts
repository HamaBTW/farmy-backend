import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './BaseEntity.js';
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

    @Column({ type: 'json', nullable: true })
    attributes?: {
        speed?: number;             // Operation speed multiplier
        efficiency?: number;        // Output efficiency percentage
        fuel_type?: string;         // diesel, electric, manual, etc.
        fuel_consumption?: number;  // Fuel units per hour
        size_width?: number;        // Grid width
        size_height?: number;       // Grid height
        durability?: number;        // Durability points
    };

    @Column({ type: 'varchar', nullable: true })
    image_url?: string;

    @Column({ type: 'boolean', default: true })
    is_available!: boolean;
}
