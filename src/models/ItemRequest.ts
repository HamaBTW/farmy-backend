import { Entity, Column, ManyToOne, JoinColumn, OneToOne, Relation } from 'typeorm';
import { BaseEntity } from './BaseEntity.js';
import { User } from './User.js';
import { Land } from './Land.js';
import { AssetCategory, ItemRequestStatus, ItemRequestType } from './AssetCategory.js';
import { PlacedItem } from './PlacedItem.js';

@Entity('item_requests')
export class ItemRequest extends BaseEntity {
    @Column({ type: 'uuid' })
    user_id!: string;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user!: Relation<User>;

    @Column({ type: 'uuid' })
    land_id!: string;

    @ManyToOne(() => Land, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'land_id' })
    land!: Relation<Land>;

    @Column({ type: 'enum', enum: AssetCategory })
    asset_category!: AssetCategory;

    @Column({ type: 'uuid' })
    variant_id!: string;

    @Column({ type: 'int' })
    position_x!: number;

    @Column({ type: 'int' })
    position_y!: number;

    @Column({ type: 'decimal', precision: 12, scale: 2 })
    price_paid!: number;

    @Column({ type: 'enum', enum: ItemRequestStatus, default: ItemRequestStatus.PENDING })
    status!: ItemRequestStatus;

    @Column({ type: 'enum', enum: ItemRequestType, default: ItemRequestType.BUY })
    type!: ItemRequestType;

    @Column({ type: 'text', nullable: true })
    rejection_reason!: string | null;

    @Column({ type: 'boolean', default: false })
    is_refunded!: boolean;

    @Column({ type: 'timestamp', nullable: true })
    processed_at!: Date | null;

    @Column({ type: 'uuid', nullable: true })
    processed_by!: string | null;

    @OneToOne(() => PlacedItem, (placed) => placed.request)
    placed_item!: Relation<PlacedItem> | null;
}
