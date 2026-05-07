import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './BaseEntity.js';
import { JobRequest } from './JobRequest.js';
import { User } from './User.js';

export enum JobApplicationStatus {
    PENDING = 'pending',
    APPROVED = 'approved',
    REJECTED = 'rejected',
    CANCELLED = 'cancelled'
}

@Entity('job_applications')
export class JobApplication extends BaseEntity {
    @Column({ type: 'uuid' })
    job_id!: string;

    @Column({ type: 'uuid' })
    worker_id!: string;

    @Column({
        type: 'enum',
        enum: JobApplicationStatus,
        default: JobApplicationStatus.PENDING
    })
    status!: JobApplicationStatus;

    @Column({ type: 'text', nullable: true })
    notes!: string | null;

    @ManyToOne(() => JobRequest, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'job_id' })
    job!: JobRequest;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'worker_id' })
    worker!: User;
}
