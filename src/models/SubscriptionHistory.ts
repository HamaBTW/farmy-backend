import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from './BaseEntity.js';
import { User } from './User.js';
import { SubscriptionPlan } from './SubscriptionPlan.js';
import { jsonTransformer } from '../utils/transformers.js';

export enum SubscriptionEventType {
    SUBSCRIBE = 'subscribe',
    UPGRADE = 'upgrade',
    DOWNGRADE = 'downgrade',
    RENEWAL = 'renewal',
    CANCEL = 'cancel',
    EXPIRE = 'expire',
    PAYMENT_FAILED = 'payment_failed',
    TRIAL_START = 'trial_start'
}

@Entity('subscription_histories')
export class SubscriptionHistory extends BaseEntity {
    @ManyToOne(() => User)
    @JoinColumn({ name: 'user_id' })
    user!: User;

    @Index('IDX_subscription_histories_user_id')
    @Column({ type: 'varchar', name: 'user_id' })
    user_id!: string;

    @ManyToOne(() => SubscriptionPlan, { nullable: true })
    @JoinColumn({ name: 'from_plan_id' })
    from_plan!: SubscriptionPlan | null;

    @Index('IDX_subscription_histories_from_plan_id')
    @Column({ type: 'varchar', name: 'from_plan_id', nullable: true })
    from_plan_id!: string | null;

    @ManyToOne(() => SubscriptionPlan, { nullable: true })
    @JoinColumn({ name: 'to_plan_id' })
    to_plan!: SubscriptionPlan | null;

    @Index('IDX_subscription_histories_to_plan_id')
    @Column({ type: 'varchar', name: 'to_plan_id', nullable: true })
    to_plan_id!: string | null;

    @Column({
        type: 'enum',
        enum: SubscriptionEventType
    })
    event_type!: SubscriptionEventType;

    @Column({ type: 'text', nullable: true, transformer: jsonTransformer })
    metadata!: Record<string, any>;
}
