import { Entity, Column, OneToMany } from 'typeorm';
import { BaseEntity } from './BaseEntity.js';
import type { TreeVariant } from './TreeVariant.js';

@Entity('tree_types')
export class TreeType extends BaseEntity {
    @Column({ type: 'varchar', length: 100, unique: true })
    name!: string;

    @Column({ type: 'text', nullable: true })
    description?: string;

    @Column({ type: 'varchar', nullable: true })
    icon_url?: string;

    @Column({ type: 'boolean', default: true })
    is_active!: boolean;

    @OneToMany('TreeVariant', 'type')
    variants!: TreeVariant[];
}
