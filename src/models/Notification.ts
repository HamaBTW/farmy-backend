import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './BaseEntity.js';
import { User } from './User.js';
import { jsonTransformer } from '../utils/transformers.js';

export enum NotificationType {
    RENTAL = 'rental',
    PURCHASE = 'purchase',
    ITEM_REQUEST = 'item_request',
    PROOF = 'proof',
    INVITATION = 'invitation',
    CONTRACT = 'contract',
    WALLET = 'wallet',
    SYSTEM = 'system'
}

@Entity('notifications')
export class Notification extends BaseEntity {
    @Column({ type: 'uuid' })
    user_id!: string;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'user_id' })
    user!: User;

    @Column({ type: 'varchar' })
    title!: string;

    @Column({ type: 'text' })
    message!: string;

    @Column({
        type: 'enum',
        enum: NotificationType,
        default: NotificationType.SYSTEM
    })
    type!: NotificationType;

    @Column({ type: 'boolean', default: false })
    is_read!: boolean;

    @Column({
        type: 'text',
        nullable: true,
        transformer: jsonTransformer
    })
    data!: Record<string, any> | null;
}
