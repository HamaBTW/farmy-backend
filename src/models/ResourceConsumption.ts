import { Entity, Column, ManyToOne, JoinColumn, Relation } from 'typeorm';
import { BaseEntity } from './BaseEntity.js';
import { AnimalCategory } from './AnimalCategory.js';
import { ProductType } from './ProductType.js';

@Entity('resource_consumptions')
export class ResourceConsumption extends BaseEntity {
  @Column({ type: 'uuid' })
  animal_category_id!: string;

  @ManyToOne(() => AnimalCategory, (category) => category.resource_consumptions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'animal_category_id' })
  animal_category!: Relation<AnimalCategory>;

  @Column({ type: 'uuid' })
  resource_type_id!: string;

  @ManyToOne(() => ProductType, { eager: true })
  @JoinColumn({ name: 'resource_type_id' })
  resource_type!: Relation<ProductType>;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  consumption_rate!: number; // Units consumed per day per animal

  @Column({ type: 'boolean', default: true })
  is_required!: boolean; // Whether this resource is mandatory for the category
}
