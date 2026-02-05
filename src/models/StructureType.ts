import { Entity, Column, OneToMany } from 'typeorm';
import { BaseEntity } from './BaseEntity.js';
import type { StructureVariant } from './StructureVariant.js';

@Entity('structure_types')
export class StructureType extends BaseEntity {
    @Column({ type: 'varchar', unique: true })
    name!: string;

    @Column({ type: 'text', nullable: true })
    description!: string | null;

    @Column({ type: 'varchar', nullable: true })
    icon_url!: string | null;

    @Column({ type: 'boolean', default: true })
    is_active!: boolean;

    @OneToMany('StructureVariant', 'type')
    variants!: StructureVariant[];
}
