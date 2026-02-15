import { Entity, Column, ManyToOne, JoinColumn, Relation } from 'typeorm';
import { BaseEntity } from './BaseEntity.js';
import { Land } from './Land.js';
import { ProductType } from './ProductType.js';

@Entity('land_resources')
export class LandResource extends BaseEntity {
  @Column({ type: 'uuid' })
  land_id!: string;

  @ManyToOne(() => Land, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'land_id' })
  land!: Relation<Land>;

  @Column({ type: 'uuid' })
  resource_type_id!: string;

  @ManyToOne(() => ProductType, { eager: true })
  @JoinColumn({ name: 'resource_type_id' })
  resource_type!: Relation<ProductType>;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  quantity!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 1000 })
  max_capacity!: number;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  last_updated!: Date;
}
