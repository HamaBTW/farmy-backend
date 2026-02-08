import { Entity, Column, ManyToOne, JoinColumn, Relation } from 'typeorm';
import { BaseEntity } from './BaseEntity.js';
import { User } from './User.js';
import { ProductType } from './ProductType.js';
import { Land } from './Land.js';
import { LandRental } from './LandRental.js';

export enum ProductStatus {
    AVAILABLE = 'available',
    SOLD = 'sold',
    HIDDEN = 'hidden'
}

@Entity('products')
export class Product extends BaseEntity {
    @Column({ type: 'varchar' })
    title!: string;

    @Column({ type: 'text', nullable: true })
    description!: string | null;

    @Column({ type: 'decimal', precision: 10, scale: 2 })
    price!: number;

    @Column({ type: 'float' })
    quantity!: number;

    @Column({ type: 'varchar', length: 50 })
    unit!: string;

    @Column({
        type: 'enum',
        enum: ProductStatus,
        default: ProductStatus.AVAILABLE
    })
    status!: ProductStatus;

    @Column({ type: 'json', nullable: true })
    images!: string[] | null;

    @Column({ type: 'uuid' })
    owner_id!: string;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'owner_id' })
    owner!: Relation<User>;

    @Column({ type: 'uuid' })
    product_type_id!: string;

    @ManyToOne(() => ProductType, { onDelete: 'RESTRICT' })
    @JoinColumn({ name: 'product_type_id' })
    product_type!: Relation<ProductType>;

    @Column({ type: 'uuid', nullable: true })
    land_id!: string | null;

    @ManyToOne(() => Land, { onDelete: 'SET NULL', nullable: true })
    @JoinColumn({ name: 'land_id' })
    land!: Relation<Land> | null;

    @Column({ type: 'uuid', nullable: true })
    land_rental_id!: string | null;

    @ManyToOne(() => LandRental, { onDelete: 'SET NULL', nullable: true })
    @JoinColumn({ name: 'land_rental_id' })
    land_rental!: Relation<LandRental> | null;
}
