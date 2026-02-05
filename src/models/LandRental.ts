import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './BaseEntity.js';
import { Land } from './Land.js';
import { User } from './User.js';

export enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  OVERDUE = 'overdue',
  CANCELLED = 'cancelled'
}

@Entity('land_rentals')
export class LandRental extends BaseEntity {
  @Column({ type: 'uuid' })
  land_id!: string;

  @ManyToOne(() => Land, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'land_id' })
  land!: Land;

  @Column({ type: 'uuid' })
  investor_id!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'investor_id' })
  investor!: User;

  @Column({ type: 'datetime' })
  rental_start_date!: Date;

  @Column({ type: 'datetime', nullable: true })
  rental_end_date!: Date | null;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  monthly_rent!: number;

  @Column({
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.PENDING
  })
  payment_status!: PaymentStatus;

  @Column({ type: 'datetime' })
  payment_due_date!: Date;

  @Column({ type: 'datetime', nullable: true })
  payment_date!: Date | null;
}
