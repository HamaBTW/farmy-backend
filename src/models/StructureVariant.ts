import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './BaseEntity.js';
import { StructureType } from './StructureType.js';

@Entity('structure_variants')
export class StructureVariant extends BaseEntity {
    @Column({ type: 'uuid' })
    type_id!: string;

    @ManyToOne(() => StructureType, (type) => type.variants, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'type_id' })
    type!: StructureType;

    @Column({ type: 'varchar', unique: true })
    variant_code!: string;

    @Column({ type: 'int', default: 0 })
    capacity!: number;

    @Column({ type: 'int', default: 100 })
    durability!: number;

    @Column({ type: 'int', default: 1 })
    upgrade_level!: number;

    @Column({ type: 'json', nullable: true })
    attributes!: Record<string, any> | null;

    @Column({ type: 'decimal', precision: 12, scale: 2 })
    base_price!: number;

    @Column({ type: 'varchar', nullable: true })
    image_url!: string | null;

    @Column({ type: 'boolean', default: true })
    is_available!: boolean;
}
