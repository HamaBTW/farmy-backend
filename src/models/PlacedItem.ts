import { Entity, Column, ManyToOne, JoinColumn, OneToOne, Relation } from 'typeorm';
import { BaseEntity } from './BaseEntity.js';
import { Land } from './Land.js';
import { AssetCategory } from './AssetCategory.js';
import { ItemRequest } from './ItemRequest.js';

@Entity('placed_items')
export class PlacedItem extends BaseEntity {
    @Column({ type: 'uuid' })
    land_id!: string;

    @ManyToOne(() => Land, (land) => land.placed_items, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'land_id' })
    land!: Relation<Land>;

    @Column({ type: 'uuid' })
    request_id!: string;

    @OneToOne(() => ItemRequest, (request) => request.placed_item, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'request_id' })
    request!: Relation<ItemRequest>;

    @Column({ type: 'enum', enum: AssetCategory })
    asset_category!: AssetCategory;

    @Column({ type: 'uuid' })
    variant_id!: string;

    @Column({ type: 'int' })
    position_x!: number;

    @Column({ type: 'int' })
    position_y!: number;

    @Column({ type: 'int', default: 0 })
    rotation!: number;

    @Column({ type: 'simple-json', nullable: true })
    state!: Record<string, any> | null;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    placed_at!: Date;

    @Column({ type: 'boolean', default: true })
    is_active!: boolean;
}
