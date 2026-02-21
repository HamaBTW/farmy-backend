import { Entity, Column, ManyToOne, JoinColumn, Relation } from 'typeorm';
import { BaseEntity } from './BaseEntity.js';
import { User } from './User.js';
import { Land } from './Land.js';

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

    @Column({ type: 'uuid', nullable: true })
    land_id!: string | null;

    @ManyToOne(() => Land, { onDelete: 'SET NULL' })
    @JoinColumn({ name: 'land_id' })
    land!: Relation<Land>;

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

    @Column({ type: 'varchar', length: 50, default: 'land' })
    target_type!: 'land' | 'item';

    @Column({ type: 'uuid', nullable: true })
    target_id!: string | null;

    @Column({ type: 'varchar', length: 255, nullable: true })
    target_name!: string | null;
}
