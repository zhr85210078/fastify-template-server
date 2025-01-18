import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";

@Entity()
export class user {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column()
    username!: string;

    @Column()
    pwd!: string;

    @Column()
    salt!: string;

    @Column()
    email!: string;

    @Column()
    createdAt!: Date;

    @Column()
    updatedAt!: Date;

    @Column()
    deletedAt!: Date;
}