import { Entity, Column, OneToMany } from 'typeorm';
import { BaseEntity } from './BaseEntity.js';
import type { MachineVariant } from './MachineVariant.js';

@Entity('machine_types')
export class MachineType extends BaseEntity {
    @Column({ type: 'varchar', unique: true })
    name!: string;

    @Column({ type: 'text', nullable: true })
    description!: string | null;

    @Column({ type: 'varchar', nullable: true })
    icon_url!: string | null;

    @Column({ type: 'boolean', default: true })
    is_active!: boolean;

    @OneToMany('MachineVariant', 'type')
    variants!: MachineVariant[];
}
