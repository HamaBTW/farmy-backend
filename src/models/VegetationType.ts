import { Entity, Column, OneToMany } from 'typeorm';
import { BaseEntity } from './BaseEntity.js';
import type { VegetationVariant } from './VegetationVariant.js';

@Entity('vegetation_types')
export class VegetationType extends BaseEntity {
    @Column({ type: 'varchar', unique: true })
    name!: string;

    @Column({ type: 'text', nullable: true })
    description!: string | null;

    @Column({ type: 'varchar', nullable: true })
    icon_url!: string | null;

    @Column({ type: 'boolean', default: true })
    is_active!: boolean;

    @OneToMany('VegetationVariant', 'type')
    variants!: VegetationVariant[];
}
