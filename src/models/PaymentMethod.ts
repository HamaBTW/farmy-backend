import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './BaseEntity.js';
import { User } from './User.js';

export enum PaymentMethodType {
    CARD = 'card',
    PAYPAL = 'paypal', // For future use
    OTHER = 'other'
}

@Entity('payment_methods')
export class PaymentMethod extends BaseEntity {
    @Column({
        type: 'enum',
        enum: PaymentMethodType,
        default: PaymentMethodType.CARD
    })
    type!: PaymentMethodType;

    @Column({ type: 'varchar', nullable: true })
    provider_id!: string; // ID from stripe/payment provider

    @Column({ type: 'varchar', nullable: true })
    last4!: string;

    @Column({ type: 'varchar', nullable: true })
    brand!: string; // visa, mastercard, etc.

    @Column({ type: 'varchar', nullable: true })
    expiry_month!: string;

    @Column({ type: 'varchar', nullable: true })
    expiry_year!: string;

    @Column({ type: 'boolean', default: false })
    is_default!: boolean;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user!: User;

    @Column({ type: 'varchar' })
    user_id!: string;
}
