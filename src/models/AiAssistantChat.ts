import { Entity, Column, ManyToOne, JoinColumn, OneToMany, Relation } from 'typeorm';
import { BaseEntity } from './BaseEntity.js';
import { User } from './User.js';
import { AiAssistantMessage } from './AiAssistantMessage.js';

@Entity('ai_assistant_chats')
export class AiAssistantChat extends BaseEntity {
    @Column({ type: 'uuid' })
    user_id!: string;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user!: Relation<User>;

    @Column({ type: 'varchar', length: 180 })
    title!: string;

    @Column({ type: 'datetime', nullable: true })
    last_message_at!: Date | null;

    @Column({ type: 'boolean', default: true })
    is_active!: boolean;

    @OneToMany(() => AiAssistantMessage, (message) => message.chat)
    messages!: Relation<AiAssistantMessage[]>;
}
