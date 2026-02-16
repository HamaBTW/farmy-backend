import { Entity, Column, ManyToOne, JoinColumn, Relation } from 'typeorm';
import { BaseEntity } from './BaseEntity.js';
import { Land } from './Land.js';
import { User } from './User.js';
import { LandWorkerInvitation } from './LandWorkerInvitation.js';

export enum ContractStatus {
    HIRING_PENDING = 'hiring_pending',
    NEGOTIATION_PENDING = 'negotiation_pending',
    NEGOTIATION_COUNTERED = 'negotiation_countered',
    HIRING_DECLINED = 'hiring_declined',
    PAYMENT_PENDING = 'payment_pending',
    ACTIVE = 'active',
    SUSPENDED = 'suspended',
    TERMINATED = 'terminated',
    EXPIRED = 'expired'
}

export enum SalaryType {
    MONTHLY = 'monthly',
    HOURLY = 'hourly',
    PER_TASK = 'per_task'
}

export enum ContractProposer {
    INVESTOR = 'investor',
    WORKER = 'worker'
}

@Entity('land_worker_contracts')
export class LandWorkerContract extends BaseEntity {
    @Column({ type: 'uuid' })
    land_id!: string;

    @ManyToOne(() => Land, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'land_id' })
    land!: Relation<Land>;

    @Column({ type: 'uuid' })
    invitation_id!: string;

    @ManyToOne(() => LandWorkerInvitation, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'invitation_id' })
    invitation!: Relation<LandWorkerInvitation>;

    @Column({ type: 'uuid' })
    investor_id!: string;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'investor_id' })
    investor!: Relation<User>;

    @Column({ type: 'uuid' })
    worker_id!: string;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'worker_id' })
    worker!: Relation<User>;

    @Column({
        type: 'enum',
        enum: SalaryType,
        default: SalaryType.MONTHLY
    })
    salary_type!: SalaryType;

    @Column({ type: 'decimal', precision: 10, scale: 2, default: 0.00 })
    salary_amount!: number;

    @Column({ type: 'datetime' })
    contract_start_date!: Date;

    @Column({ type: 'datetime' })
    contract_end_date!: Date;

    @Column({
        type: 'enum',
        enum: ContractStatus,
        default: ContractStatus.HIRING_PENDING
    })
    status!: ContractStatus;

    @Column({
        type: 'enum',
        enum: ContractProposer,
        default: ContractProposer.INVESTOR
    })
    current_proposer!: ContractProposer;

    @Column({ type: 'text', nullable: true })
    message!: string | null;

    @Column({ type: 'varchar', nullable: true })
    first_payment_transaction_id!: string | null;
}
