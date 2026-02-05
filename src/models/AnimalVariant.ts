import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './BaseEntity.js';
import { AnimalType } from './AnimalType.js';

@Entity('animal_variants')
export class AnimalVariant extends BaseEntity {
    @Column({ type: 'uuid' })
    type_id!: string;

    @ManyToOne(() => AnimalType, (type) => type.variants, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'type_id' })
    type!: AnimalType;

    @Column({ type: 'varchar', unique: true })
    variant_code!: string; // e.g., cow1, cow2

    @Column({ type: 'int', default: 0 })
    age!: number;

    @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
    milk_production!: number;

    @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
    meat_yield!: number;

    @Column({ type: 'json', nullable: true })
    attributes!: Record<string, any> | null;

    @Column({ type: 'decimal', precision: 12, scale: 2 })
    base_price!: number;

    @Column({ type: 'varchar', nullable: true })
    image_url!: string | null;

    @Column({ type: 'boolean', default: true })
    is_available!: boolean;
}
