import { Entity, Column, ManyToOne, JoinColumn, Relation } from 'typeorm';
import { BaseEntity } from './BaseEntity.js';
import { User } from './User.js';
import { Land } from './Land.js';

export enum JobRequestStatus {
    OPEN = 'open',
    CLOSED = 'closed'
}

@Entity('job_requests')
export class JobRequest extends BaseEntity {
    @Column({ type: 'uuid' })
    farmer_id!: string;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'farmer_id' })
    farmer!: Relation<User>;

    @Column({ type: 'uuid' })
    land_id!: string;

    @ManyToOne(() => Land, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'land_id' })
    land!: Relation<Land>;

    @Column({ type: 'varchar' })
    title!: string;

    @Column({ type: 'text' })
    description!: string;

    @Column({ type: 'simple-json', nullable: true })
    required_skills!: string[] | null;

    @Column({ type: 'varchar', nullable: true })
    duration!: string | null;

    @Column({ type: 'varchar', nullable: true })
    task_type!: string | null;

    @Column({
        type: 'enum',
        enum: JobRequestStatus,
        default: JobRequestStatus.OPEN
    })
    status!: JobRequestStatus;

    @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
    salary!: number | null;
}
