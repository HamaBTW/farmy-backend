import { Entity, Column } from 'typeorm';
import { BaseEntity } from './BaseEntity.js';

export enum KYCStatus {
    NONE = 'none',
    PENDING = 'pending',
    APPROVED = 'approved',
    REJECTED = 'rejected'
}

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

    @Column({ type: 'varchar', length: 6, nullable: true })
    verification_code!: string | null;

    @Column({ type: 'timestamp', nullable: true })
    verification_code_expires!: Date | null;

    @Column({ type: 'varchar', length: 6, nullable: true })
    reset_password_code!: string | null;

    @Column({ type: 'timestamp', nullable: true })
    reset_password_code_expires!: Date | null;

    @Column({ type: 'varchar', unique: true, nullable: true })
    google_id!: string | null;

    @Column({ type: 'varchar', unique: true, nullable: true })
    github_id!: string | null;

    @Column({ type: 'varchar', default: 'email' })
    auth_provider!: string; // 'email', 'google', 'github'

    @Column({ type: 'varchar', nullable: true, select: false })
    two_factor_secret!: string | null;

    @Column({ type: 'boolean', default: false })
    is_two_factor_enabled!: boolean;

    @Column({
        type: 'enum',
        enum: KYCStatus,
        default: KYCStatus.NONE
    })
    kyc_status!: KYCStatus;

    @Column({ type: 'varchar', nullable: true })
    kyc_session_id!: string | null;

    @Column({ type: 'varchar', nullable: true })
    kyc_role_requested!: string | null;

    @Column({ type: 'varchar', nullable: true })
    kyc_front_image!: string | null;

    @Column({ type: 'varchar', nullable: true })
    kyc_back_image!: string | null;

    @Column({ type: 'varchar', nullable: true })
    kyc_selfie_image!: string | null;
}
