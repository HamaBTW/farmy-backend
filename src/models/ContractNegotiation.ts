import { Entity, Column, ManyToOne, JoinColumn, Relation } from 'typeorm';
import { BaseEntity } from './BaseEntity.js';
import { LandWorkerContract } from './LandWorkerContract.js';
import { User } from './User.js';

@Entity('contract_negotiations')
export class ContractNegotiation extends BaseEntity {
    @Column({ type: 'uuid' })
    contract_id!: string;

    @ManyToOne(() => LandWorkerContract, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'contract_id' })
    contract!: Relation<LandWorkerContract>;

    @Column({ type: 'uuid' })
    sender_id!: string;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'sender_id' })
    sender!: Relation<User>;

    @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
    proposed_salary_amount!: number | null;

    @Column({ type: 'text' })
    comment!: string;
}
