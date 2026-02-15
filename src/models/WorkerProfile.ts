import { Entity, Column, ManyToOne, JoinColumn, Relation } from 'typeorm';
import { BaseEntity } from './BaseEntity.js';
import { User } from './User.js';

export enum VerificationStatus {
    PENDING = 'pending',
    VERIFIED = 'verified',
    REJECTED = 'rejected'
}

export enum WorkerAvailability {
    AVAILABLE = 'available',
    BUSY = 'busy',
    UNAVAILABLE = 'unavailable'
}

@Entity('worker_profiles')
export class WorkerProfile extends BaseEntity {
    @Column({ type: 'uuid', unique: true })
    user_id!: string;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user!: Relation<User>;

    @Column({ type: 'simple-json', nullable: true })
    skills!: string[] | null;

    @Column({ type: 'text', nullable: true })
    bio!: string | null;

    @Column({ type: 'decimal', precision: 10, scale: 2, default: 0.00 })
    hourly_rate!: number;

    @Column({
        type: 'enum',
        enum: VerificationStatus,
        default: VerificationStatus.PENDING
    })
    verification_status!: VerificationStatus;

    @Column({ type: 'decimal', precision: 3, scale: 2, default: 0.00 })
    rating!: number;

    @Column({ type: 'int', default: 0 })
    completed_tasks!: number;

    @Column({ type: 'decimal', precision: 5, scale: 2, default: 0.00 })
    on_time_rate!: number;

    @Column({ type: 'int', default: 0 })
    dispute_count!: number;

    @Column({
        type: 'enum',
        enum: WorkerAvailability,
        default: WorkerAvailability.AVAILABLE
    })
    availability!: WorkerAvailability;
}
