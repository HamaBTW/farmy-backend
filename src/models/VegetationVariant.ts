import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './BaseEntity.js';
import { VegetationType } from './VegetationType.js';

@Entity('vegetation_variants')
export class VegetationVariant extends BaseEntity {
    @Column({ type: 'uuid' })
    type_id!: string;

    @ManyToOne(() => VegetationType, (type) => type.variants, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'type_id' })
    type!: VegetationType;

    @Column({ type: 'varchar', unique: true })
    variant_code!: string;

    @Column({ type: 'int', default: 1 })
    growth_days!: number;

    @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
    yield_amount!: number;

    @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
    water_needs!: number;

    @Column({ type: 'json', nullable: true })
    attributes!: Record<string, any> | null;

    @Column({ type: 'decimal', precision: 12, scale: 2 })
    base_price!: number;

    @Column({ type: 'varchar', nullable: true })
    image_url!: string | null;

    @Column({ type: 'boolean', default: true })
    is_available!: boolean;
}
