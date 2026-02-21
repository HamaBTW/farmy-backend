import { Entity, Column, ManyToOne, JoinColumn, Relation } from 'typeorm';
import { BaseEntity } from './BaseEntity.js';
import { User } from './User.js';
import { Product } from './Product.js';

@Entity('product_purchases')
export class ProductPurchase extends BaseEntity {
    @Column({ type: 'uuid', nullable: true })
    product_id!: string | null;

    @ManyToOne(() => Product, { onDelete: 'SET NULL', nullable: true })
    @JoinColumn({ name: 'product_id' })
    product!: Relation<Product> | null;

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

    @Column({ type: 'varchar', length: 255 })
    product_name!: string;

    @Column({ type: 'float' })
    quantity!: number;

    @Column({ type: 'decimal', precision: 10, scale: 2 })
    total_price!: number;

    @Column({ type: 'varchar', length: 255, nullable: true })
    hedera_transaction_id!: string | null;
}
