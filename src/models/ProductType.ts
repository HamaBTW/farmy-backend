import { Entity, Column } from 'typeorm';
import { BaseEntity } from './BaseEntity.js';

@Entity('product_types')
export class ProductType extends BaseEntity {
    @Column({ type: 'varchar', length: 100, unique: true })
    name!: string;

    @Column({ type: 'varchar', length: 50 })
    unit!: string;  // liters, kg, units, logs, etc.

    @Column({ type: 'text', nullable: true })
    description?: string;

    @Column({ type: 'varchar', nullable: true })
    icon_url?: string;

    @Column({ type: 'boolean', default: true })
    is_active!: boolean;
}
