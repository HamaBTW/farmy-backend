import { Entity, Column, ManyToOne, JoinColumn, Relation } from 'typeorm';
import { BaseEntity } from './BaseEntity.js';
import { Land } from './Land.js';
import { User } from './User.js';
import { PlacedItem } from './PlacedItem.js';
import { AssetTask } from './AssetTask.js';

// Removed TaskType enum to allow dynamic varchar actions

export enum TaskStatus {
    OPEN = 'open',
    ASSIGNED = 'assigned',
    IN_PROGRESS = 'in_progress',
    COMPLETED = 'completed',
    VERIFIED = 'verified'
}

@Entity('tasks')
export class Task extends BaseEntity {
    @Column({ type: 'uuid' })
    land_id!: string;

    @ManyToOne(() => Land, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'land_id' })
    land!: Relation<Land>;

    @Column({ type: 'uuid', nullable: true })
    assigned_to!: string | null;

    @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
    @JoinColumn({ name: 'assigned_to' })
    assignee!: Relation<User> | null;

    @Column({ type: 'uuid' })
    created_by!: string;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'created_by' })
    creator!: Relation<User>;

    @Column({ type: 'varchar' })
    title!: string;

    @Column({ type: 'text', nullable: true })
    description!: string | null;

    @Column({
        type: 'varchar',
        default: 'maintenance'
    })
    type!: string;

    @Column({ type: 'uuid', nullable: true })
    placed_item_id!: string | null;

    @ManyToOne(() => PlacedItem, { onDelete: 'SET NULL', nullable: true })
    @JoinColumn({ name: 'placed_item_id' })
    placed_item!: Relation<PlacedItem> | null;

    @Column({ type: 'uuid', nullable: true })
    asset_task_id!: string | null;

    @ManyToOne(() => AssetTask, { onDelete: 'SET NULL', nullable: true })
    @JoinColumn({ name: 'asset_task_id' })
    asset_task!: Relation<AssetTask> | null;

    @Column({
        type: 'enum',
        enum: TaskStatus,
        default: TaskStatus.OPEN
    })
    status!: TaskStatus;

    @Column({ type: 'decimal', precision: 10, scale: 2, default: 0.00 })
    reward!: number;

    @Column({ type: 'int', default: 30 })
    time_required_minutes!: number;

    @Column({ type: 'varchar', nullable: true })
    proof_image_url!: string | null;

    @Column({ type: 'varchar', nullable: true })
    proof_video_url!: string | null;

    @Column({
        type: 'point',
        nullable: true,
        transformer: {
            from: (value: any) => {
                if (!value) return null;
                if (typeof value === 'object' && 'x' in value && 'y' in value) {
                    return { latitude: value.x, longitude: value.y };
                }
                return value;
            },
            to: (value: { latitude: number; longitude: number } | null) => {
                if (!value) return null;
                return `POINT(${value.latitude} ${value.longitude})`;
            }
        }
    })
    proof_gps!: { latitude: number; longitude: number } | null;

    @Column({ type: 'datetime', nullable: true })
    completed_at!: Date | null;
}
