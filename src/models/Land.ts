import { Entity, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { BaseEntity } from './BaseEntity.js';
import { User } from './User.js';
import { PlacedItem } from './PlacedItem.js';
import { LandRental } from './LandRental.js';

@Entity('lands')
export class Land extends BaseEntity {
    @Column({ type: 'uuid' })
    owner_id!: string;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'owner_id' })
    owner!: User;

    @Column({ type: 'varchar' })
    name!: string;

    @Column({ type: 'text', nullable: true })
    description!: string | null;

    @Column({ type: 'int', default: 10 })
    grid_width!: number;

    @Column({ type: 'int', default: 10 })
    grid_height!: number;

    @Column({
        type: 'polygon',
        nullable: true,
        transformer: {
            from: (value: any) => {
                if (!value) return null;
                return value;
            },
            to: (value: any) => {
                if (!value) return null;
                return value;
            }
        }
    })
    boundaries!: any | null;

    @Column({ type: 'boolean', default: true })
    is_active!: boolean;

    @OneToMany(() => PlacedItem, (item) => item.land)
    placed_items!: PlacedItem[];

    @OneToMany(() => LandRental, (rental) => rental.land)
    rentals!: LandRental[];
}
