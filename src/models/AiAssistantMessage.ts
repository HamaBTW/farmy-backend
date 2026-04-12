import { Entity, Column, ManyToOne, JoinColumn, Relation } from 'typeorm';
import { BaseEntity } from './BaseEntity.js';
import { User } from './User.js';
import { AiAssistantChat } from './AiAssistantChat.js';
import { jsonTransformer } from '../utils/transformers.js';

export enum AiAssistantMessageRole {
    USER = 'user',
    ASSISTANT = 'assistant',
    SYSTEM = 'system',
}

@Entity('ai_assistant_messages')
export class AiAssistantMessage extends BaseEntity {
    @Column({ type: 'uuid' })
    chat_id!: string;

    @ManyToOne(() => AiAssistantChat, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'chat_id' })
    chat!: Relation<AiAssistantChat>;

    @Column({ type: 'uuid' })
    user_id!: string;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user!: Relation<User>;

    @Column({
        type: 'enum',
        enum: AiAssistantMessageRole,
    })
    role!: AiAssistantMessageRole;

    @Column({ type: 'text' })
    content!: string;

    @Column({ type: 'uuid', nullable: true })
    edited_from_message_id!: string | null;

    @Column({ type: 'text', nullable: true, transformer: jsonTransformer })
    meta!: Record<string, unknown> | null;
}
