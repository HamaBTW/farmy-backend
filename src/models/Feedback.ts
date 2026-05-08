import { Entity, Column, ManyToOne, JoinColumn, Relation } from 'typeorm';
import { BaseEntity } from './BaseEntity.js';
import { User } from './User.js';

export enum FeedbackCategory {
    BUG = 'bug',
    FEATURE_REQUEST = 'feature_request',
    PRODUCT_REPORT = 'product_report',
    LAND_REPORT = 'land_report',
    WORKER_REPORT = 'worker_report',
    PAYMENT_ISSUE = 'payment_issue',
    WALLET_ISSUE = 'wallet_issue',
    MARKETPLACE_ISSUE = 'marketplace_issue',
    ABUSE = 'abuse',
    GENERAL = 'general'
}

export enum FeedbackStatus {
    PENDING = 'pending',
    IN_REVIEW = 'in_review',
    RESOLVED = 'resolved',
    REJECTED = 'rejected'
}

export enum FeedbackPriority {
    LOW = 'low',
    MEDIUM = 'medium',
    HIGH = 'high',
    CRITICAL = 'critical'
}

@Entity('feedbacks')
export class Feedback extends BaseEntity {
    @Column({ type: 'varchar', length: 255 })
    title!: string;

    @Column({ type: 'text' })
    description!: string;

    @Column({
        type: 'enum',
        enum: FeedbackCategory,
        default: FeedbackCategory.GENERAL
    })
    category!: FeedbackCategory;

    @Column({
        type: 'enum',
        enum: FeedbackStatus,
        default: FeedbackStatus.PENDING
    })
    status!: FeedbackStatus;

    @Column({
        type: 'enum',
        enum: FeedbackPriority,
        default: FeedbackPriority.MEDIUM
    })
    priority!: FeedbackPriority;

    @Column({ type: 'varchar', length: 36 })
    user_id!: string;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user!: Relation<User>;

    // Entity Linking (Optional)
    @Column({ type: 'varchar', length: 36, nullable: true })
    related_entity_id?: string;

    @Column({ type: 'varchar', length: 50, nullable: true })
    related_entity_type?: string;

    @Column({ type: 'text', nullable: true })
    admin_notes?: string;

    @Column({ type: 'simple-array', nullable: true })
    attachments?: string[];
}
