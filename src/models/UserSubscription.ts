import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './BaseEntity.js';
import { User } from './User.js';
import { SubscriptionPlan } from './SubscriptionPlan.js';

export enum SubscriptionStatus {
    NEW = 'new',
    TRIALING = 'trialing',
    ACTIVE = 'active',
    PAST_DUE = 'past_due',
    GRACE = 'grace',
    CANCELED = 'canceled',
    EXPIRED = 'expired'
}

@Entity('user_subscriptions')
export class UserSubscription extends BaseEntity {
    @ManyToOne(() => User)
    @JoinColumn({ name: 'user_id' })
    user!: User;

    @Column({ type: 'varchar', name: 'user_id' })
    user_id!: string;

    @ManyToOne(() => SubscriptionPlan)
    @JoinColumn({ name: 'plan_id' })
    plan!: SubscriptionPlan;

    @Column({ type: 'varchar', name: 'plan_id' })
    plan_id!: string;

    @Column({
        type: 'enum',
        enum: SubscriptionStatus,
        default: SubscriptionStatus.NEW
    })
    status!: SubscriptionStatus;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    start_date!: Date;

    @Column({ type: 'timestamp', nullable: true })
    current_period_end!: Date;

    @Column({ type: 'boolean', default: false })
    cancel_at_period_end!: boolean;

    @Column({ type: 'varchar', nullable: true })
    stripe_payment_intent_id!: string | null;

    @Column({ type: 'varchar', nullable: true })
    stripe_session_id!: string | null;

    @Column({ type: 'varchar', default: 'monthly' })
    billing_cycle!: 'monthly' | 'yearly';
}
