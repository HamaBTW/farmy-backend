import { Entity, Column, ManyToOne, JoinColumn, Relation } from 'typeorm';
import { BaseEntity } from './BaseEntity.js';
import { Land } from './Land.js';
import { User } from './User.js';

export enum InvitationStatus {
    INVITATION_PENDING = 'invitation_pending',
    INVITATION_APPROVED = 'invitation_approved',
    INVITATION_DECLINED = 'invitation_declined',
    EXPIRED = 'expired'
}

@Entity('land_worker_invitations')
export class LandWorkerInvitation extends BaseEntity {
    @Column({ type: 'uuid' })
    land_id!: string;

    @ManyToOne(() => Land, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'land_id' })
    land!: Relation<Land>;

    @Column({ type: 'uuid' })
    farmer_id!: string;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'farmer_id' })
    farmer!: Relation<User>;

    @Column({ type: 'uuid' })
    worker_id!: string;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'worker_id' })
    worker!: Relation<User>;

    @Column({
        type: 'enum',
        enum: InvitationStatus,
        default: InvitationStatus.INVITATION_PENDING
    })
    status!: InvitationStatus;

    @Column({ type: 'text', nullable: true })
    message!: string | null;

    @Column({ type: 'datetime', nullable: true })
    expires_at!: Date | null;
}
