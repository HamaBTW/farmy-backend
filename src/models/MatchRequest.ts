import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './BaseEntity.js';
import { User } from './User.js';

export enum MatchRequestStatus {
    PENDING = 'pending',
    ACCEPTED = 'accepted',
    REJECTED = 'rejected',
    EXPIRED = 'expired'
}

@Entity('match_requests')
export class MatchRequest extends BaseEntity {
    @Column({ type: 'varchar' })
    from_user_id!: string;

    @Column({ type: 'varchar' })
    to_user_id!: string;

    @Column({
        type: 'enum',
        enum: MatchRequestStatus,
        default: MatchRequestStatus.PENDING
    })
    status!: MatchRequestStatus;

    @Column({ type: 'varchar' })
    match_type!: string; // 'buyer', 'investor', 'farmer'

    @Column({ type: 'text', nullable: true })
    message!: string | null;

    @Column({ type: 'timestamp', nullable: true })
    responded_at!: Date | null;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    created_at!: Date;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
    updated_at!: Date;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'from_user_id' })
    fromUser!: User;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'to_user_id' })
    toUser!: User;
}