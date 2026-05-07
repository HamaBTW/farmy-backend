import { Entity, Column, ManyToOne, JoinColumn, Relation, Unique } from 'typeorm';
import { BaseEntity } from './BaseEntity.js';
import { Land } from './Land.js';
import { User } from './User.js';

export enum LandWorkerStatus {
    ACTIVE = 'active',
    INACTIVE = 'inactive',
    SUSPENDED = 'suspended'
}

export enum HiringSource {
    INVITATION = 'invitation',
    JOB_APPLICATION = 'job_application',
    MANUAL = 'manual'
}

@Entity('land_workers')
@Unique(['land_id', 'worker_id'])
export class LandWorker extends BaseEntity {
    @Column({ type: 'uuid' })
    land_id!: string;

    @ManyToOne(() => Land, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'land_id' })
    land!: Relation<Land>;

    @Column({ type: 'uuid' })
    worker_id!: string;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'worker_id' })
    worker!: Relation<User>;

    @Column({ type: 'uuid' })
    assigned_by!: string;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'assigned_by' })
    assigner!: Relation<User>;

    @Column({ type: 'varchar', default: 'general' })
    role!: string;

    @Column({ type: 'decimal', precision: 10, scale: 2, default: 0.00 })
    salary!: number;

    @Column({
        type: 'enum',
        enum: LandWorkerStatus,
        default: LandWorkerStatus.ACTIVE
    })
    status!: LandWorkerStatus;

    @Column({
        type: 'enum',
        enum: HiringSource,
        default: HiringSource.MANUAL
    })
    hiring_source!: HiringSource;

    @Column({ type: 'datetime', nullable: true })
    started_at!: Date | null;

    @Column({ type: 'datetime', nullable: true })
    ended_at!: Date | null;
}
