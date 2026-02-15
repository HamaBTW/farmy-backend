import { Entity, Column, OneToMany, ManyToOne, JoinColumn, Relation } from 'typeorm';
import { BaseEntity } from './BaseEntity.js';
import type { AnimalVariant } from './AnimalVariant.js';
import type { AnimalCategory } from './AnimalCategory.js';

@Entity('animal_types')
export class AnimalType extends BaseEntity {
    @Column({ type: 'varchar', unique: true })
    name!: string;

    @Column({ type: 'text', nullable: true })
    description!: string | null;

    @Column({ type: 'varchar', nullable: true })
    icon_url!: string | null;

    @Column({ type: 'uuid', nullable: true })
    category_id!: string | null;

    @ManyToOne('AnimalCategory', 'animal_types', { nullable: true })
    @JoinColumn({ name: 'category_id' })
    category!: Relation<AnimalCategory> | null;

    @Column({ type: 'boolean', default: true })
    is_active!: boolean;

    @OneToMany('AnimalVariant', 'type')
    variants!: AnimalVariant[];
}
