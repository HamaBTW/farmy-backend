import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from './BaseEntity.js';
import { Land } from './Land.js';

export enum CropPlanStatus {
    PLANNED = 'planned',
    ACTIVE = 'active',
    COMPLETED = 'completed',
    CANCELLED = 'cancelled',
}

@Entity('crop_plans')
@Index(['land_id', 'status'])
@Index(['planned_planting_date'])
export class CropPlan extends BaseEntity {
    @Column({ type: 'uuid' })
    land_id!: string;

    @ManyToOne(() => Land, (land) => land.cropPlans, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'land_id' })
    land!: Land;

    @Column({ type: 'uuid' })
    variant_id!: string;

    @Column({ type: 'varchar', length: 100 })
    variant_name!: string;

    @Column({ type: 'varchar', length: 50 })
    asset_category!: 'vegetation' | 'tree';

    @Column({ type: 'varchar', nullable: true })
    icon_url?: string;

    @Column({ type: 'date' })
    planned_planting_date!: Date;

    @Column({ type: 'date', nullable: true })
    expected_harvest_date?: Date;

    @Column({ type: 'int', nullable: true })
    cycle_days?: number;

    @Column({ type: 'int', nullable: true })
    growth_days?: number;

    @Column({ type: 'boolean', default: false })
    is_perennial!: boolean;

    @Column({
        type: 'enum',
        enum: CropPlanStatus,
        default: CropPlanStatus.PLANNED,
    })
    status!: CropPlanStatus;

    @Column({ type: 'text', nullable: true })
    notes?: string;

    @Column({ type: 'timestamp', nullable: true })
    completed_at?: Date;

    @Column({ type: 'uuid', nullable: true })
    created_by?: string;

    // Helper method to check if plan is overdue
    get isOverdue(): boolean {
        if (this.status !== CropPlanStatus.PLANNED) return false;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return this.planned_planting_date < today;
    }

    // Helper method to calculate expected harvest
    calculateExpectedHarvest(): Date | undefined {
        if (!this.planned_planting_date) return undefined;
        
        const days = this.growth_days || this.cycle_days || 30;
        const harvestDate = new Date(this.planned_planting_date);
        harvestDate.setDate(harvestDate.getDate() + days);
        return harvestDate;
    }
}
