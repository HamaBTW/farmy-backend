import { Entity, Column } from 'typeorm';
import { BaseEntity } from './BaseEntity.js';
import { UserRole } from './User.js';
import { jsonTransformer } from '../utils/transformers.js';

@Entity('subscription_plans')
export class SubscriptionPlan extends BaseEntity {
    @Column({ type: 'varchar' })
    name!: string;

    @Column({ type: 'varchar', unique: true })
    plan_key!: string; // e.g., 'farmer_pro', 'investor_plus', 'farmbox_small', 'worker_plus'

    @Column({ type: 'text', nullable: true })
    description!: string;

    @Column({
        type: 'enum',
        enum: UserRole,
        default: UserRole.CUSTOMER
    })
    role!: UserRole;

    @Column({ type: 'decimal', precision: 10, scale: 2, default: 0.00 })
    price_monthly!: number;

    @Column({ type: 'decimal', precision: 10, scale: 2, default: 0.00 })
    price_yearly!: number;

    @Column({ type: 'text', nullable: true, transformer: jsonTransformer })
    entitlements!: Record<string, any>; // JSON object with boolean/numeric limits
}
