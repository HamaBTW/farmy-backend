import { Entity, Column } from 'typeorm';
import { BaseEntity } from './BaseEntity.js';
import { AssetCategory } from './AssetCategory.js';

@Entity('asset_tasks')
export class AssetTask extends BaseEntity {
    @Column({ type: 'enum', enum: AssetCategory })
    category!: AssetCategory;

    @Column({ type: 'uuid' })
    variant_id!: string;

    @Column({ type: 'varchar' })
    action!: string;

    @Column({ type: 'text', nullable: true })
    description!: string | null;

    @Column({ type: 'decimal', precision: 10, scale: 2, default: 0.00 })
    reward!: number;

    @Column({ type: 'int', default: 30 })
    time_required_minutes!: number;
}
