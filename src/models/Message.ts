import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './BaseEntity.js';
import { User } from './User.js';

@Entity('messages')
export class Message extends BaseEntity {
    @Column({ type: 'varchar' })
    sender_id!: string;

    @Column({ type: 'varchar' })
    recipient_id!: string;

    @Column({ type: 'text' })
    content!: string;

    @Column({ type: 'boolean', default: false })
    is_read!: boolean;

    @Column({ type: 'timestamp', nullable: true })
    read_at!: Date | null;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    created_at!: Date;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
    updated_at!: Date;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'sender_id' })
    sender!: User;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'recipient_id' })
    recipient!: User;
}