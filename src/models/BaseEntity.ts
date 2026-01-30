import { PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, BaseEntity as TypeORMBaseEntity } from 'typeorm';

export abstract class BaseEntity extends TypeORMBaseEntity {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;
}
