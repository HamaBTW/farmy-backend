import { Entity, Column, ManyToOne, JoinColumn, Relation, Index } from 'typeorm';
import { BaseEntity } from './BaseEntity.js';
import { ProductPurchase } from './ProductPurchase.js';
import { User } from './User.js';

export enum DeliveryStatus {
    ORDER_CREATED = 'ORDER_CREATED',
    CONFIRMED = 'CONFIRMED',
    PREPARING = 'PREPARING',
    OUT_FOR_DELIVERY = 'OUT_FOR_DELIVERY',
    NEARBY = 'NEARBY',
    DELIVERED = 'DELIVERED',
    CANCELLED = 'CANCELLED'
}

/** Strict state machine: maps each status to its allowed next statuses */
export const DELIVERY_TRANSITIONS: Record<DeliveryStatus, DeliveryStatus[]> = {
    [DeliveryStatus.ORDER_CREATED]: [DeliveryStatus.CONFIRMED, DeliveryStatus.CANCELLED],
    [DeliveryStatus.CONFIRMED]: [DeliveryStatus.PREPARING, DeliveryStatus.CANCELLED],
    [DeliveryStatus.PREPARING]: [DeliveryStatus.OUT_FOR_DELIVERY, DeliveryStatus.CANCELLED],
    [DeliveryStatus.OUT_FOR_DELIVERY]: [DeliveryStatus.NEARBY, DeliveryStatus.DELIVERED, DeliveryStatus.CANCELLED],
    [DeliveryStatus.NEARBY]: [DeliveryStatus.DELIVERED, DeliveryStatus.CANCELLED],
    [DeliveryStatus.DELIVERED]: [],
    [DeliveryStatus.CANCELLED]: []
};

/** Terminal statuses – polling should stop for these */
export const TERMINAL_STATUSES: DeliveryStatus[] = [
    DeliveryStatus.DELIVERED,
    DeliveryStatus.CANCELLED
];

export interface DeliveryTimelineEntry {
    status: DeliveryStatus;
    timestamp: string;
    note?: string;
}

@Entity('deliveries')
export class Delivery extends BaseEntity {
    @Index()
    @Column({ type: 'uuid' })
    order_id!: string;

    @ManyToOne(() => ProductPurchase, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'order_id' })
    order!: Relation<ProductPurchase>;

    @Column({ type: 'uuid' })
    buyer_id!: string;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'buyer_id' })
    buyer!: Relation<User>;

    @Column({ type: 'uuid' })
    seller_id!: string;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'seller_id' })
    seller!: Relation<User>;

    @Column({
        type: 'enum',
        enum: DeliveryStatus,
        default: DeliveryStatus.ORDER_CREATED
    })
    delivery_status!: DeliveryStatus;

    @Column({ type: 'timestamp', nullable: true })
    estimated_delivery_time!: Date | null;

    @Column({ type: 'uuid', nullable: true })
    driver_id!: string | null;

    @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
    @JoinColumn({ name: 'driver_id' })
    driver!: Relation<User> | null;

    @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
    current_latitude!: number | null;

    @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
    current_longitude!: number | null;

    @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
    destination_latitude!: number | null;

    @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
    destination_longitude!: number | null;

    @Column({ type: 'text', nullable: true })
    delivery_address!: string | null;

    @Column({ type: 'timestamp', nullable: true })
    started_at!: Date | null;

    @Column({ type: 'timestamp', nullable: true })
    delivered_at!: Date | null;

    /** JSON array of { status, timestamp, note? } entries */
    @Column({ type: 'json', nullable: true })
    timeline!: DeliveryTimelineEntry[] | null;

    @Column({ type: 'text', nullable: true })
    cancellation_reason!: string | null;
}
