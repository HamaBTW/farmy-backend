import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './BaseEntity.js';
import { MachineType } from './MachineType.js';

@Entity('machine_variants')
export class MachineVariant extends BaseEntity {
    @Column({ type: 'uuid' })
    type_id!: string;

    @ManyToOne(() => MachineType, (type) => type.variants, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'type_id' })
    type!: MachineType;

    @Column({ type: 'varchar', unique: true })
    variant_code!: string;

    @Column({ type: 'decimal', precision: 10, scale: 2, default: 1 })
    speed!: number;

    @Column({ type: 'decimal', precision: 10, scale: 2, default: 1 })
    efficiency!: number;

    @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
    fuel_consumption!: number;

    @Column({ type: 'json', nullable: true })
    attributes!: Record<string, any> | null;

    @Column({ type: 'decimal', precision: 12, scale: 2 })
    base_price!: number;

    @Column({ type: 'varchar', nullable: true })
    image_url!: string | null;

    @Column({ type: 'boolean', default: true })
    is_available!: boolean;
}
