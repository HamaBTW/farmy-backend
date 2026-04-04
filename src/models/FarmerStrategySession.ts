import { Entity, Column, ManyToOne, JoinColumn, Relation } from 'typeorm';
import { BaseEntity } from './BaseEntity.js';
import { User } from './User.js';
import { jsonTransformer } from '../utils/transformers.js';

@Entity('farmer_strategy_sessions')
export class FarmerStrategySession extends BaseEntity {
    @Column({ type: 'uuid' })
    user_id!: string;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user!: Relation<User>;

    @Column({ type: 'varchar' })
    title!: string;

    @Column({ type: 'text', nullable: true, transformer: jsonTransformer })
    context_data!: any; // Stores farm snapshots (active assets, earnings)

    @Column({ type: 'text', nullable: true, transformer: jsonTransformer })
    messages!: { role: 'user' | 'assistant' | 'system', content: string, timestamp: string }[];

    @Column({ type: 'boolean', default: true })
    is_active!: boolean;
}
