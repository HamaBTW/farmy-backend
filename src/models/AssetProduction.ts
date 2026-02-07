import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './BaseEntity.js';
import { jsonTransformer } from '../utils/transformers.js';
import { ProductType } from './ProductType.js';
import { AssetCategory } from './AssetCategory.js';

@Entity('asset_productions')
export class AssetProduction extends BaseEntity {
    @Column({ type: 'uuid' })
    variant_id!: string;

    @Column({ type: 'enum', enum: AssetCategory })
    asset_category!: AssetCategory;

    @Column({ type: 'uuid' })
    product_id!: string;

    @ManyToOne(() => ProductType, { eager: true })
    @JoinColumn({ name: 'product_id' })
    product!: ProductType;

    @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
    rate_per_cycle!: number;  // Production amount per cycle

    @Column({ type: 'int', default: 1 })
    cycle_days!: number;  // Days per production cycle

    @Column({ type: 'boolean', default: false })
    on_harvest_only!: boolean;  // Only produced when harvested/slaughtered

    @Column({ type: 'int', default: 0 })
    min_level!: number;  // Minimum asset level required

    @Column({ type: 'text', nullable: true, transformer: jsonTransformer })
    conditions?: Record<string, any>;  // Additional conditions (season, weather, etc.)
}
