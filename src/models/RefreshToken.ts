import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from './BaseEntity.js';
import { User } from './User.js';

@Entity('refresh_tokens')
export class RefreshToken extends BaseEntity {
    @Column({ type: 'varchar' })
    @Index()
    token!: string;

    @Column({ type: 'timestamp' })
    expiresAt!: Date;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'userId' })
    user!: User;

    @Column({ type: 'varchar' })
    userId!: string;
}
