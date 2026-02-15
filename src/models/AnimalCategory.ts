import { Entity, Column, OneToMany, Relation } from 'typeorm';
import { BaseEntity } from './BaseEntity.js';
import type { AnimalType } from './AnimalType.js';
import type { ResourceConsumption } from './ResourceConsumption.js';

@Entity('animal_categories')
export class AnimalCategory extends BaseEntity {
  @Column({ type: 'varchar', length: 100, unique: true })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'varchar', nullable: true })
  icon_url!: string | null;

  @Column({ type: 'boolean', default: true })
  is_active!: boolean;

  @OneToMany('AnimalType', 'category')
  animal_types!: Relation<AnimalType>[];

  @OneToMany('ResourceConsumption', 'animal_category')
  resource_consumptions!: Relation<ResourceConsumption>[];
}
