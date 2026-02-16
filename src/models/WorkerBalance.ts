import { Entity, Column, ManyToOne, JoinColumn, Relation } from 'typeorm';
import { BaseEntity } from './BaseEntity.js';
import { User } from './User.js';

@Entity('worker_balances')
export class WorkerBalance extends BaseEntity {
    @Column({ type: 'uuid', unique: true })
    worker_id!: string;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'worker_id' })
    worker!: Relation<User>;

    @Column({ type: 'decimal', precision: 10, scale: 2, default: 0.00 })
    available_balance!: number;

    @Column({ type: 'decimal', precision: 10, scale: 2, default: 0.00 })
    pending_balance!: number;
}
