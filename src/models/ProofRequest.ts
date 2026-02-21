import { Entity, Column, ManyToOne, JoinColumn, Relation } from 'typeorm';
import { BaseEntity } from './BaseEntity.js';
import { User } from './User.js';

export enum ProofRequestStatus {
    PENDING = 'pending',
    VERIFIED = 'verified',
    REJECTED = 'rejected',
    EXPIRED = 'expired'
}

@Entity('proof_requests')
export class ProofRequest extends BaseEntity {
    @Column({ type: 'uuid' })
    investor_id!: string;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'investor_id' })
    investor!: Relation<User>;

    @Column({ type: 'uuid' })
    farmer_id!: string;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'farmer_id' })
    farmer!: Relation<User>;

    @Column({
        type: 'enum',
        enum: ProofRequestStatus,
        default: ProofRequestStatus.PENDING
    })
    status!: ProofRequestStatus;

    @Column({ type: 'text', nullable: true })
    ai_reasoning!: string | null;

    @Column({ type: 'timestamp' })
    expires_at!: Date;
}
