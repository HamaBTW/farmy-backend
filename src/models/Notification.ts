import { Entity, Column } from 'typeorm';
import { BaseEntity } from './BaseEntity.js';

export enum NotificationType {
    MATCH_REQUEST = 'match_request',
    MESSAGE = 'message',
    ORDER = 'order',
    SYSTEM = 'system'
}

@Entity('notifications')
export class Notification extends BaseEntity {
    @Column({ type: 'varchar' })
    user_id!: string;

    @Column({ type: 'varchar', default: 'system' })
    type!: string;

    @Column({ type: 'text' })
    title!: string;

    @Column({ type: 'text' })
    message!: string;

    @Column({ type: 'boolean', default: false })
    is_read!: boolean;

    @Column({ type: 'varchar', nullable: true })
    related_id!: string | null; // ID of related entity (match request, message, etc.)

    @Column({ type: 'timestamp', nullable: true })
    read_at!: Date | null;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    created_at!: Date;
}