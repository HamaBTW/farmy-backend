import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from './BaseEntity.js';
import { User } from './User.js';

@Entity('devices')
export class Device extends BaseEntity {
    @Index()
    @Column({ type: 'varchar', unique: true })
    token!: string;

    @Column({ type: 'varchar', nullable: true })
    fingerprint!: string;

    @Column({ type: 'varchar', nullable: true })
    platform!: string; // 'ios', 'android', 'web'

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    lastUsedAt!: Date;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'userId' })
    user!: User;

    @Column()
    userId!: string;
}
