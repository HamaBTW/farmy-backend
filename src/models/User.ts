import { Entity, Column } from 'typeorm';
import { BaseEntity } from './BaseEntity.js';

export enum UserRole {
    FARMER = 'farmer',
    INVESTOR = 'investor',
    CUSTOMER = 'customer',
    ADMIN = 'admin'
}

@Entity('users')
export class User extends BaseEntity {
    @Column({ type: 'varchar', unique: true })
    email!: string;

    @Column({ type: 'varchar', select: false }) // Don't return password by default
    password_hash!: string;

    @Column({ type: 'varchar', nullable: true })
    phone!: string;

    @Column({
        type: 'enum',
        enum: UserRole,
        default: UserRole.CUSTOMER
    })
    role!: UserRole;

    @Column({ type: 'json', nullable: true })
    profile!: any;

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
    location!: { latitude: number; longitude: number } | null;

    @Column({ type: 'boolean', default: false })
    is_verified!: boolean;

    @Column({ type: 'boolean', default: false })
    is_banned!: boolean;
}
