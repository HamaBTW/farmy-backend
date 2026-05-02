import { Entity, Column, ManyToOne, JoinColumn, Relation } from 'typeorm';
import { BaseEntity } from './BaseEntity.js';
import { User } from './User.js';
import { LandWorkerContract } from './LandWorkerContract.js';

export enum TransactionStatus {
    PENDING = 'pending',
    SUCCEEDED = 'succeeded',
    FAILED = 'failed',
    REFUNDED = 'refunded'
}

export enum TransactionType {
    SALARY_UPFRONT = 'salary_upfront',
    SALARY_RECURRING = 'salary_recurring',
    REFUND = 'refund',
    WITHDRAWAL = 'withdrawal',
    TASK_EARNING = 'task_earning',
    ADJUSTMENT = 'adjustment'
}

@Entity('transactions')
export class Transaction extends BaseEntity {
    @Column({ type: 'varchar', length: 255, unique: true, nullable: true })
    stripe_payment_intent_id!: string | null;

    @Column({ type: 'varchar', length: 255, unique: true, nullable: true })
    stripe_transfer_id!: string | null;

    @Column({ type: 'uuid', nullable: true })
    contract_id!: string | null;

    @ManyToOne(() => LandWorkerContract, { onDelete: 'CASCADE', nullable: true })
    @JoinColumn({ name: 'contract_id' })
    contract!: Relation<LandWorkerContract> | null;

    @Column({ type: 'uuid', nullable: true })
    investor_id!: string | null;

    @ManyToOne(() => User, { onDelete: 'CASCADE', nullable: true })
    @JoinColumn({ name: 'investor_id' })
    investor!: Relation<User> | null;

    @Column({ type: 'uuid' })
    worker_id!: string;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'worker_id' })
    worker!: Relation<User>;

    @Column({ type: 'decimal', precision: 10, scale: 2 })
    amount!: number;

    @Column({ type: 'varchar', length: 10, default: 'usd' })
    currency!: string;

    @Column({
        type: 'enum',
        enum: TransactionStatus,
        default: TransactionStatus.PENDING
    })
    status!: TransactionStatus;

    @Column({
        type: 'enum',
        enum: TransactionType,
        default: TransactionType.SALARY_UPFRONT
    })
    type!: TransactionType;

    @Column({ type: 'json', nullable: true })
    metadata!: Record<string, any> | null;
}
